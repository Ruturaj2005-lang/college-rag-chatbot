import asyncio
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from app.core.logging import logger

client: Optional[AsyncIOMotorClient] = None
db: Optional[AsyncIOMotorDatabase] = None
is_connected_to_mongo: bool = False

# In-memory storage fallback for zero-dependency local development / mock mode
memory_db: Dict[str, List[Dict[str, Any]]] = {
    "users": [],
    "documents": [],
    "document_chunks": [],
    "conversations": [],
    "messages": [],
    "feedback": []
}


async def connect_to_mongo():
    global client, db, is_connected_to_mongo
    try:
        logger.info(f"Connecting to MongoDB at: {settings.MONGODB_URI} (DB: {settings.DATABASE_NAME})")
        # Set robust connection pool parameters to minimize latency
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=10000,
            maxPoolSize=100,
            minPoolSize=10,
            maxIdleTimeMS=60000,
            retryWrites=True
        )
        # Test connection
        await client.admin.command("ping")
        db = client[settings.DATABASE_NAME]
        is_connected_to_mongo = True
        logger.info("Successfully connected to MongoDB / MongoDB Atlas.")

        # Ensure indexes
        await _ensure_indexes()
    except Exception as e:
        logger.warning(
            f"Could not connect to MongoDB Atlas ({e}). Operating in resilient local storage mode."
        )
        is_connected_to_mongo = False


async def close_mongo_connection():
    global client
    if client:
        client.close()
        logger.info("MongoDB connection closed.")


async def _ensure_indexes():
    """Create essential indexes for performance."""
    if not is_connected_to_mongo or db is None:
        return
    try:
        # Users email unique index
        await db.users.create_index("email", unique=True)
        # Chunks document_id index
        await db.document_chunks.create_index("document_id")
        # Conversations user_id index
        await db.conversations.create_index("user_id")
        # Messages conversation_id index
        await db.messages.create_index("conversation_id")
        # Feedback message_id index
        await db.feedback.create_index("message_id")
        logger.info("Database indexes ensured.")
    except Exception as e:
        logger.warning(f"Error ensuring indexes: {e}")


def get_db():
    return db


def is_mongo_active() -> bool:
    return is_connected_to_mongo and db is not None


async def sync_local_storage_documents():
    """
    Scans the uploads directory to index all existing uploaded files (PDF, DOCX, TXT)
    into memory and database, ensuring 100% resilient RAG answering regardless of Atlas network status.
    """
    import os
    import uuid
    from datetime import datetime, timezone
    from app.services.document_processor import process_document_file
    from app.services.chunking import create_chunks_from_pages
    from app.services.ai_service import get_embeddings_batch

    candidates = [
        os.path.abspath("uploads"),
        os.path.abspath("../uploads"),
        os.path.abspath(settings.UPLOAD_DIR),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
    ]

    target_dir = None
    for c in candidates:
        if os.path.exists(c) and os.listdir(c):
            target_dir = c
            break

    if not target_dir:
        return

    logger.info(f"Synchronizing uploaded knowledge documents from: {target_dir}")
    files = os.listdir(target_dir)

    for f in files:
        f_path = os.path.join(target_dir, f)
        if not os.path.isfile(f_path):
            continue
        ext = os.path.splitext(f)[1].lower().strip(".")
        if ext not in ["pdf", "docx", "txt", "md"]:
            continue

        # Check if already present in memory_db
        existing_doc = next((d for d in memory_db["documents"] if d.get("file_name") == f), None)
        if existing_doc:
            continue

        try:
            pages = process_document_file(f_path, ext)
            if not pages:
                continue

            doc_id = str(uuid.uuid4())
            clean_title = f.replace("_", " ").replace("-", " ").title()
            chunks = create_chunks_from_pages(
                pages=pages,
                document_id=doc_id,
                doc_metadata={"title": clean_title, "file_name": f, "document_id": doc_id}
            )
            if not chunks:
                continue

            embeddings = await get_embeddings_batch([c.content for c in chunks])
            chunk_dicts = []
            for c_obj, emb in zip(chunks, embeddings):
                c_obj.embedding = emb
                c_dict = c_obj.to_dict()
                c_dict["document_id"] = doc_id
                c_dict["created_at"] = datetime.now(timezone.utc)
                chunk_dicts.append(c_dict)

            memory_db["document_chunks"].extend(chunk_dicts)
            memory_db["documents"].append({
                "_id": doc_id,
                "id": doc_id,
                "title": clean_title,
                "file_name": f,
                "file_type": ext,
                "file_size": os.path.getsize(f_path),
                "storage_path": f_path,
                "status": "READY",
                "chunk_count": len(chunks),
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })

            # If MongoDB is active, also sync
            if is_mongo_active() and db is not None:
                existing_atlas = await db.documents.find_one({"file_name": f})
                if not existing_atlas:
                    await db.documents.insert_one({
                        "_id": doc_id,
                        "title": clean_title,
                        "file_name": f,
                        "file_type": ext,
                        "file_size": os.path.getsize(f_path),
                        "storage_path": f_path,
                        "status": "READY",
                        "chunk_count": len(chunks),
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    })
                    if chunk_dicts:
                        await db.document_chunks.insert_many(chunk_dicts)

            logger.info(f"Auto-synced uploaded document '{f}' ({len(chunks)} chunks).")
        except Exception as e:
            logger.warning(f"Could not auto-sync file {f}: {e}")
