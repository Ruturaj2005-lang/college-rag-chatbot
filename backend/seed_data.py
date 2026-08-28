import os
import sys
import uuid
import asyncio
import shutil
from datetime import datetime, timezone

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, get_db, is_mongo_active, memory_db
from app.core.security import get_password_hash
from app.services.document_processor import process_document_file
from app.services.chunking import create_chunks_from_pages
from app.services.ai_service import get_embeddings_batch
from app.core.logging import logger


async def seed_database():
    print("=" * 60)
    print("Seeding RAG-Based College Chatbot Knowledge Base & Users")
    print("=" * 60)
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await connect_to_mongo()
    db = get_db()

    # 1. Seed Users
    default_users = [
        {
            "_id": str(uuid.uuid4()),
            "email": "admin@college.edu",
            "password_hash": get_password_hash("Admin@123456"),
            "full_name": "Admin Coordinator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        },
        {
            "_id": str(uuid.uuid4()),
            "email": "student@college.edu",
            "password_hash": get_password_hash("Student@123456"),
            "full_name": "Alex Rivera",
            "role": "student",
            "created_at": datetime.now(timezone.utc)
        }
    ]

    for u in default_users:
        u["id"] = u["_id"]
        if is_mongo_active() and db is not None:
            existing = await db.users.find_one({"email": u["email"]})
            if not existing:
                await db.users.insert_one(u)
                print(f"[+] Created user: {u['email']} ({u['role']})")
            else:
                u["_id"] = existing["_id"]
                u["id"] = str(existing["_id"])
                print(f"[*] User already exists: {u['email']}")
        else:
            if not any(x["email"] == u["email"] for x in memory_db["users"]):
                memory_db["users"].append(u)
                print(f"[+] (Local Memory) Created user: {u['email']} ({u['role']})")

    admin_user = default_users[0]
    admin_id = admin_user["id"]

    # 2. Seed Sample Documents
    sample_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_data")
    if not os.path.exists(sample_dir):
        print(f"[!] Sample data folder not found at {sample_dir}")
        await close_mongo_connection()
        return

    sample_files = [f for f in os.listdir(sample_dir) if f.endswith((".txt", ".pdf", ".docx"))]
    print(f"\nFound {len(sample_files)} sample documents to ingest and index into vector store:")

    total_chunks_indexed = 0
    for file_name in sample_files:
        src_path = os.path.join(sample_dir, file_name)
        file_size = os.path.getsize(src_path)
        dest_filename = f"seed_{file_name}"
        dest_path = os.path.join(settings.UPLOAD_DIR, dest_filename)
        shutil.copyfile(src_path, dest_path)

        doc_id = str(uuid.uuid4())
        file_type = os.path.splitext(file_name)[1].lower().strip(".")
        title = os.path.splitext(file_name)[0].replace("_", " ").title()
        now = datetime.now(timezone.utc)

        # Extract and chunk
        pages = process_document_file(dest_path, file_type)
        chunks = create_chunks_from_pages(
            pages=pages,
            document_id=doc_id,
            doc_metadata={"document_id": doc_id, "title": title, "file_name": file_name}
        )

        # Generate embeddings
        chunk_texts = [c.content for c in chunks]
        embeddings = await get_embeddings_batch(chunk_texts)
        for c_obj, emb in zip(chunks, embeddings):
            c_obj.embedding = emb

        chunk_dicts = []
        for c in chunks:
            c_dict = c.to_dict()
            c_dict["created_at"] = now
            chunk_dicts.append(c_dict)

        doc_record = {
            "_id": doc_id,
            "id": doc_id,
            "title": title,
            "file_name": file_name,
            "file_type": file_type,
            "file_size": file_size,
            "storage_path": dest_path,
            "status": "READY",
            "error_message": None,
            "chunk_count": len(chunks),
            "uploaded_by": admin_id,
            "created_at": now,
            "updated_at": now
        }

        if is_mongo_active() and db is not None:
            # Check if document already exists by file_name
            existing_doc = await db.documents.find_one({"file_name": file_name, "status": "READY"})
            if existing_doc:
                print(f"[*] Document '{file_name}' already indexed. Skipping.")
                continue

            await db.documents.insert_one(doc_record)
            if chunk_dicts:
                await db.document_chunks.insert_many(chunk_dicts)
        else:
            memory_db["documents"].append(doc_record)
            memory_db["document_chunks"].extend(chunk_dicts)

        total_chunks_indexed += len(chunks)
        print(f"  -> Indexed: {file_name} ({len(chunks)} chunks, READY)")

    print("\n" + "=" * 60)
    print("Database seeding completed successfully!")
    print(f"Total documents: {len(sample_files)} | Total vector chunks: {total_chunks_indexed}")
    print("\nDemo Credentials:")
    print("  Student Login : student@college.edu / Student@123456")
    print("  Admin Login   : admin@college.edu   / Admin@123456")
    print("=" * 60 + "\n")

    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(seed_database())
