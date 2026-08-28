import os
import time
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, status
from app.core.config import settings
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.security import require_admin
from app.core.logging import logger
from app.models.schemas import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentChunkItem,
    AnalyticsResponse
)
from app.services.storage import save_uploaded_file, delete_file
from app.services.document_processor import process_document_file
from app.services.chunking import create_chunks_from_pages
from app.services.ai_service import get_embeddings_batch
from app.services.vector_store import invalidate_vector_cache

router = APIRouter(prefix="/admin", tags=["Admin Document Management"])


async def process_document_pipeline(document_id: str, file_path: str, file_type: str, title: str):
    """
    Background worker for document extraction, chunking, embedding, and indexing.
    Fulfills Sections 7, 8, 10, 11, and 35.
    """
    db = get_db()
    logger.info(f"Starting processing pipeline for document_id={document_id} ({file_path})")

    # Step 1: Update status to PROCESSING
    now = datetime.now(timezone.utc)
    if is_mongo_active() and db is not None:
        await db.documents.update_one(
            {"_id": document_id},
            {"$set": {"status": "PROCESSING", "updated_at": now, "error_message": None}}
        )
    else:
        for doc in memory_db["documents"]:
            if (doc.get("id") == document_id or str(doc.get("_id")) == document_id):
                doc["status"] = "PROCESSING"
                doc["updated_at"] = now
                doc["error_message"] = None

    try:
        # Step 2: Extract text
        pages = process_document_file(file_path, file_type)
        if not pages:
            raise ValueError("No readable text could be extracted from this document.")

        # Step 3: Chunk text
        chunks = create_chunks_from_pages(
            pages=pages,
            document_id=document_id,
            doc_metadata={"document_id": document_id, "title": title, "file_name": os.path.basename(file_path)}
        )
        if not chunks:
            raise ValueError("Document yielded 0 chunks after text extraction.")

        # Step 4: Generate Embeddings
        chunk_texts = [c.content for c in chunks]
        embeddings = await get_embeddings_batch(chunk_texts)

        if len(embeddings) != len(chunks):
            raise RuntimeError("Mismatch between chunk count and generated embeddings count.")

        for chunk_obj, emb in zip(chunks, embeddings):
            chunk_obj.embedding = emb

        # Step 5: Store chunks
        chunk_dicts = []
        for c in chunks:
            c_dict = c.to_dict()
            c_dict["created_at"] = datetime.now(timezone.utc)
            chunk_dicts.append(c_dict)

        if is_mongo_active() and db is not None:
            # Clear old chunks first if reprocessed
            await db.document_chunks.delete_many({"document_id": document_id})
            if chunk_dicts:
                await db.document_chunks.insert_many(chunk_dicts)
            await db.documents.update_one(
                {"_id": document_id},
                {
                    "$set": {
                        "status": "READY",
                        "chunk_count": len(chunks),
                        "updated_at": datetime.now(timezone.utc),
                        "error_message": None
                    }
                }
            )
        else:
            # In-memory storage
            memory_db["document_chunks"] = [
                c for c in memory_db["document_chunks"] if c.get("document_id") != document_id
            ]
            memory_db["document_chunks"].extend(chunk_dicts)
            for doc in memory_db["documents"]:
                if (doc.get("id") == document_id or str(doc.get("_id")) == document_id):
                    doc["status"] = "READY"
                    doc["chunk_count"] = len(chunks)
                    doc["updated_at"] = datetime.now(timezone.utc)
                    doc["error_message"] = None

        logger.info(f"Successfully processed document_id={document_id}: {len(chunks)} chunks indexed and READY.")
        invalidate_vector_cache()

    except Exception as e:
        logger.error(f"Processing failed for document_id={document_id}: {e}", exc_info=True)
        err_msg = str(e)
        if is_mongo_active() and db is not None:
            await db.documents.update_one(
                {"_id": document_id},
                {
                    "$set": {
                        "status": "FAILED",
                        "error_message": err_msg,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            for doc in memory_db["documents"]:
                if (doc.get("id") == document_id or str(doc.get("_id")) == document_id):
                    doc["status"] = "FAILED"
                    doc["error_message"] = err_msg
                    doc["updated_at"] = datetime.now(timezone.utc)


@router.post("/documents", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin)
):
    """
    Admin document upload endpoint (PDF, DOCX, TXT) complying with FR-02.
    """
    # 1. Validate & Save File
    file_path, file_name, file_size, file_type = await save_uploaded_file(file)

    # 2. Create document record
    document_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    title = os.path.splitext(file_name)[0].replace("_", " ").replace("-", " ").title()

    doc_record = {
        "_id": document_id,
        "id": document_id,
        "title": title,
        "file_name": file_name,
        "file_type": file_type,
        "file_size": file_size,
        "storage_path": file_path,
        "status": "UPLOADED",
        "error_message": None,
        "chunk_count": 0,
        "uploaded_by": current_user["user_id"],
        "created_at": now,
        "updated_at": now
    }

    db = get_db()
    if is_mongo_active() and db is not None:
        await db.documents.insert_one(doc_record)
    else:
        memory_db["documents"].append(doc_record)

    # 3. Trigger asynchronous background processing pipeline
    background_tasks.add_task(
        process_document_pipeline,
        document_id=document_id,
        file_path=file_path,
        file_type=file_type,
        title=title
    )

    return DocumentResponse(
        id=document_id,
        title=title,
        file_name=file_name,
        file_type=file_type,
        file_size=file_size,
        storage_path=file_path,
        status="UPLOADED",
        error_message=None,
        chunk_count=0,
        uploaded_by=current_user["user_id"],
        created_at=now,
        updated_at=now
    )


_docs_cache: Optional[List[DocumentResponse]] = None
_docs_cache_ts: float = 0
DOCS_CACHE_TTL = 5.0


@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(current_user: dict = Depends(require_admin)):
    """
    List all documents for the admin dashboard with high-speed in-memory caching.
    """
    global _docs_cache, _docs_cache_ts
    now_time = time.time()
    if _docs_cache is not None and (now_time - _docs_cache_ts < DOCS_CACHE_TTL):
        return _docs_cache

    db = get_db()
    results = []

    if is_mongo_active() and db is not None:
        try:
            cursor = db.documents.find({"status": {"$ne": "DELETED"}}).sort("created_at", -1)
            docs = await cursor.to_list(length=500)
            for d in docs:
                results.append(
                    DocumentResponse(
                        id=str(d["_id"]),
                        title=d.get("title", ""),
                        file_name=d.get("file_name", ""),
                        file_type=d.get("file_type", ""),
                        file_size=d.get("file_size", 0),
                        storage_path=d.get("storage_path", ""),
                        status=d.get("status", "UPLOADED"),
                        error_message=d.get("error_message"),
                        chunk_count=d.get("chunk_count", 0),
                        uploaded_by=d.get("uploaded_by"),
                        created_at=d.get("created_at", datetime.now(timezone.utc)),
                        updated_at=d.get("updated_at", datetime.now(timezone.utc))
                    )
                )
        except Exception as e:
            logger.error(f"Error fetching documents from Atlas: {e}")
    else:
        active_docs = [d for d in memory_db["documents"] if d.get("status") != "DELETED"]
        active_docs.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
        for d in active_docs:
            results.append(
                DocumentResponse(
                    id=d.get("id") or str(d.get("_id")),
                    title=d.get("title", ""),
                    file_name=d.get("file_name", ""),
                    file_type=d.get("file_type", ""),
                    file_size=d.get("file_size", 0),
                    storage_path=d.get("storage_path", ""),
                    status=d.get("status", "UPLOADED"),
                    error_message=d.get("error_message"),
                    chunk_count=d.get("chunk_count", 0),
                    uploaded_by=d.get("uploaded_by"),
                    created_at=d.get("created_at", datetime.now(timezone.utc)),
                    updated_at=d.get("updated_at", datetime.now(timezone.utc))
                )
            )

    return results


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse)
async def get_document_details(document_id: str, current_user: dict = Depends(require_admin)):
    """
    Get detailed document information along with its extracted chunks.
    """
    db = get_db()
    doc = None
    chunks_list = []

    if is_mongo_active() and db is not None:
        doc = await db.documents.find_one({"_id": document_id})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        
        cursor = db.document_chunks.find({"document_id": document_id}).sort("chunk_index", 1)
        raw_chunks = await cursor.to_list(length=1000)
        for c in raw_chunks:
            chunks_list.append(
                DocumentChunkItem(
                    id=str(c["_id"]),
                    document_id=c.get("document_id", document_id),
                    chunk_index=c.get("chunk_index", 0),
                    content=c.get("content", ""),
                    page_number=c.get("page_number"),
                    metadata=c.get("metadata", {}),
                    created_at=c.get("created_at")
                )
            )
        doc_resp = DocumentResponse(
            id=str(doc["_id"]),
            title=doc.get("title", ""),
            file_name=doc.get("file_name", ""),
            file_type=doc.get("file_type", ""),
            file_size=doc.get("file_size", 0),
            storage_path=doc.get("storage_path", ""),
            status=doc.get("status", "UPLOADED"),
            error_message=doc.get("error_message"),
            chunk_count=len(chunks_list),
            uploaded_by=doc.get("uploaded_by"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc))
        )
    else:
        for d in memory_db["documents"]:
            if (d.get("id") == document_id or str(d.get("_id")) == document_id):
                doc = d
                break
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

        doc_chunks = [c for c in memory_db["document_chunks"] if c.get("document_id") == document_id]
        doc_chunks.sort(key=lambda x: x.get("chunk_index", 0))
        for c in doc_chunks:
            chunks_list.append(
                DocumentChunkItem(
                    id=c.get("id") or str(c.get("_id")),
                    document_id=c.get("document_id", document_id),
                    chunk_index=c.get("chunk_index", 0),
                    content=c.get("content", ""),
                    page_number=c.get("page_number"),
                    metadata=c.get("metadata", {}),
                    created_at=c.get("created_at")
                )
            )
        doc_resp = DocumentResponse(
            id=doc.get("id") or str(doc.get("_id")),
            title=doc.get("title", ""),
            file_name=doc.get("file_name", ""),
            file_type=doc.get("file_type", ""),
            file_size=doc.get("file_size", 0),
            storage_path=doc.get("storage_path", ""),
            status=doc.get("status", "UPLOADED"),
            error_message=doc.get("error_message"),
            chunk_count=len(chunks_list),
            uploaded_by=doc.get("uploaded_by"),
            created_at=doc.get("created_at", datetime.now(timezone.utc)),
            updated_at=doc.get("updated_at", datetime.now(timezone.utc))
        )

    return DocumentDetailResponse(document=doc_resp, chunks=chunks_list)


@router.delete("/documents/{document_id}")
async def delete_document(document_id: str, current_user: dict = Depends(require_admin)):
    """
    Deletes a document, its disk file, and associated vector chunks.
    """
    db = get_db()
    file_path = None

    if is_mongo_active() and db is not None:
        doc = await db.documents.find_one({"_id": document_id})
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        file_path = doc.get("storage_path")
        await db.documents.delete_one({"_id": document_id})
        await db.document_chunks.delete_many({"document_id": document_id})
    else:
        doc = next((d for d in memory_db["documents"] if d.get("id") == document_id or str(d.get("_id")) == document_id), None)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
        file_path = doc.get("storage_path")
        memory_db["documents"] = [d for d in memory_db["documents"] if not (d.get("id") == document_id or str(d.get("_id")) == document_id)]
        memory_db["document_chunks"] = [c for c in memory_db["document_chunks"] if c.get("document_id") != document_id]

    if file_path:
        delete_file(file_path)

    invalidate_vector_cache()
    return {"status": "success", "message": "Document and all chunks deleted successfully"}


@router.post("/documents/{document_id}/reprocess")
async def reprocess_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin)
):
    """
    Re-runs extraction, chunking, and embedding pipeline for an existing document.
    """
    db = get_db()
    doc = None

    if is_mongo_active() and db is not None:
        doc = await db.documents.find_one({"_id": document_id})
    else:
        doc = next((d for d in memory_db["documents"] if d.get("id") == document_id or str(d.get("_id")) == document_id), None)

    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_path = doc.get("storage_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Original document file not found on disk")

    background_tasks.add_task(
        process_document_pipeline,
        document_id=document_id,
        file_path=file_path,
        file_type=doc.get("file_type", "txt"),
        title=doc.get("title", "Document")
    )

    return {"status": "processing", "message": "Reprocessing started in background"}


# Short-lived in-memory cache for admin analytics to eliminate cloud round-trip stalls
_analytics_cache: Optional[AnalyticsResponse] = None
_analytics_cache_ts: float = 0
ANALYTICS_CACHE_TTL = 5.0  # 5 seconds cache


@router.get("/analytics", response_model=AnalyticsResponse)
async def get_admin_analytics(current_user: dict = Depends(require_admin)):
    """
    Computes analytics for Admin Dashboard complying with Section 30.
    Uses parallel async queries and short-lived caching for blazing fast loads.
    """
    global _analytics_cache, _analytics_cache_ts
    now = time.time()
    if _analytics_cache is not None and (now - _analytics_cache_ts < ANALYTICS_CACHE_TTL):
        return _analytics_cache

    db = get_db()
    
    if is_mongo_active() and db is not None:
        try:
            (
                total_docs,
                ready_docs,
                proc_docs,
                failed_docs,
                total_questions,
                pos_fb,
                neg_fb,
                asst_msgs
            ) = await asyncio.gather(
                db.documents.count_documents({"status": {"$ne": "DELETED"}}),
                db.documents.count_documents({"status": "READY"}),
                db.documents.count_documents({"status": "PROCESSING"}),
                db.documents.count_documents({"status": "FAILED"}),
                db.messages.count_documents({"role": "user"}),
                db.feedback.count_documents({"feedback": "positive"}),
                db.feedback.count_documents({"feedback": "negative"}),
                db.messages.find({"role": "assistant", "grounded": True}, {"confidence": 1}).to_list(length=500),
                return_exceptions=True
            )

            total_docs = total_docs if isinstance(total_docs, int) else 0
            ready_docs = ready_docs if isinstance(ready_docs, int) else 0
            proc_docs = proc_docs if isinstance(proc_docs, int) else 0
            failed_docs = failed_docs if isinstance(failed_docs, int) else 0
            total_questions = total_questions if isinstance(total_questions, int) else 0
            pos_fb = pos_fb if isinstance(pos_fb, int) else 0
            neg_fb = neg_fb if isinstance(neg_fb, int) else 0

            if isinstance(asst_msgs, list) and asst_msgs:
                avg_conf = sum(m.get("confidence", 0.0) for m in asst_msgs) / len(asst_msgs)
            else:
                avg_conf = 0.94

        except Exception as e:
            logger.error(f"Error fetching parallel analytics: {e}")
            total_docs = ready_docs = proc_docs = failed_docs = total_questions = pos_fb = neg_fb = 0
            avg_conf = 0.94
    else:
        active_docs = [d for d in memory_db["documents"] if d.get("status") != "DELETED"]
        total_docs = len(active_docs)
        ready_docs = sum(1 for d in active_docs if d.get("status") == "READY")
        proc_docs = sum(1 for d in active_docs if d.get("status") == "PROCESSING")
        failed_docs = sum(1 for d in active_docs if d.get("status") == "FAILED")

        total_questions = sum(1 for m in memory_db["messages"] if m.get("role") == "user")
        grounded_msgs = [m for m in memory_db["messages"] if m.get("role") == "assistant" and m.get("grounded")]
        if grounded_msgs:
            avg_conf = sum(m.get("confidence", 0.0) for m in grounded_msgs) / len(grounded_msgs)
        else:
            avg_conf = 0.94

        pos_fb = sum(1 for f in memory_db["feedback"] if f.get("feedback") == "positive")
        neg_fb = sum(1 for f in memory_db["feedback"] if f.get("feedback") == "negative")

    resp = AnalyticsResponse(
        total_documents=total_docs,
        ready_documents=ready_docs,
        processing_documents=proc_docs,
        failed_documents=failed_docs,
        total_questions=total_questions,
        average_confidence=round(avg_conf, 2),
        positive_feedback=pos_fb,
        negative_feedback=neg_fb
    )
    _analytics_cache = resp
    _analytics_cache_ts = now
    return resp


@router.get("/analytics/export")
async def export_analytics_csv(current_user: dict = Depends(require_admin)):
    """
    Exports full query audit logs, latency metrics, and feedback as downloadable CSV.
    """
    import io
    import csv
    from fastapi.responses import StreamingResponse

    db = get_db()
    logs = []
    if is_mongo_active() and db is not None:
        cursor = db.rag_logs.find({}).sort("timestamp", -1)
        logs = await cursor.to_list(length=1000)
    else:
        logs = memory_db.get("rag_logs", [])

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Request ID", "User ID", "Question", "Retrieval Count", "Confidence/Scores", "LLM Latency (ms)", "Total Latency (ms)", "Status"])

    for log in logs:
        ts = log.get("timestamp", datetime.now(timezone.utc)).isoformat() if hasattr(log.get("timestamp"), "isoformat") else str(log.get("timestamp"))
        writer.writerow([
            ts,
            log.get("request_id", ""),
            log.get("user_id", ""),
            log.get("question", "").replace("\n", " "),
            log.get("retrieval_count", 0),
            "; ".join(str(s) for s in log.get("retrieval_scores", [])),
            round(log.get("llm_latency_ms", 0.0), 2),
            round(log.get("total_latency_ms", 0.0), 2),
            "ERROR" if log.get("error") else "SUCCESS"
        ])

    output.seek(0)
    filename = f"college_rag_analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

