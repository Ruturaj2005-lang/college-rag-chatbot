import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException, status
from pydantic import BaseModel

from app.core.database import get_db, is_mongo_active, memory_db
from app.core.logging import logger
from app.core.security import get_current_user, require_admin
from app.services.storage import save_uploaded_file
from app.api.admin import process_document_pipeline

router = APIRouter(prefix="/documents", tags=["Documents"])


class DocumentUploadResponse(BaseModel):
    id: str
    title: str
    file_name: str
    file_type: str
    file_size: Optional[int] = 0
    status: str
    chunk_count: int
    created_at: datetime
    message: str = "Document uploaded and scheduled for knowledge base indexing."


@router.post("/upload", response_model=DocumentUploadResponse)
async def admin_upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin)
):
    """
    Admin-only document upload endpoint (PDF, DOCX, TXT).
    Students cannot upload documents; only admins can add documents to the college knowledge base.
    """
    # 1. Validate & Save File
    file_path, file_name, file_size, file_type = await save_uploaded_file(file)

    # 2. Create document record
    document_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    title = os.path.splitext(file_name)[0].replace("_", " ").replace("-", " ").title()

    admin_id = current_user.get("user_id", "admin_user")

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
        "uploaded_by": admin_id,
        "created_at": now,
        "updated_at": now
    }

    db = get_db()
    if is_mongo_active() and db is not None:
        await db.documents.insert_one(doc_record)
    else:
        memory_db["documents"].append(doc_record)

    # 3. Trigger asynchronous background processing and chunk indexing
    background_tasks.add_task(
        process_document_pipeline,
        document_id=document_id,
        file_path=file_path,
        file_type=file_type,
        title=title
    )

    return DocumentUploadResponse(
        id=document_id,
        title=title,
        file_name=file_name,
        file_type=file_type,
        file_size=file_size,
        status="UPLOADED",
        chunk_count=0,
        created_at=now,
        message=f"'{file_name}' uploaded successfully by Admin. Indexing into knowledge base."
    )


@router.get("", response_model=List[dict])
async def list_knowledge_documents(current_user: dict = Depends(get_current_user)):
    """
    List active knowledge base documents (accessible to both students and admins for inquiry).
    """
    db = get_db()
    if is_mongo_active() and db is not None:
        cursor = db.documents.find({"status": {"$ne": "DELETED"}}).sort("created_at", -1)
        docs = await cursor.to_list(length=100)
        return [
            {
                "id": str(d.get("_id") or d.get("id")),
                "title": d.get("title", ""),
                "file_name": d.get("file_name", ""),
                "file_type": d.get("file_type", ""),
                "status": d.get("status", "READY"),
                "chunk_count": d.get("chunk_count", 0),
                "created_at": d.get("created_at")
            }
            for d in docs
        ]
    else:
        return [
            {
                "id": str(d.get("_id") or d.get("id")),
                "title": d.get("title", ""),
                "file_name": d.get("file_name", ""),
                "file_type": d.get("file_type", ""),
                "status": d.get("status", "READY"),
                "chunk_count": d.get("chunk_count", 0),
                "created_at": d.get("created_at")
            }
            for d in memory_db.get("documents", [])
            if d.get("status") != "DELETED"
        ]


@router.get("/download/{document_id}")
async def download_original_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Downloads the original uploaded source document (PDF, DOCX, TXT).
    """
    from fastapi.responses import FileResponse
    db = get_db()
    doc = None
    if is_mongo_active() and db is not None:
        doc = await db.documents.find_one({"_id": document_id})
        if not doc:
            doc = await db.documents.find_one({"id": document_id})
    else:
        for d in memory_db.get("documents", []):
            if d.get("id") == document_id or str(d.get("_id")) == document_id:
                doc = d
                break

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = doc.get("storage_path")
    file_name = doc.get("file_name", "document.txt")

    if not storage_path or not os.path.exists(storage_path):
        # If file on disk was a seeded file in uploads/
        alt_path = os.path.join("uploads", file_name)
        if os.path.exists(alt_path):
            storage_path = alt_path
        else:
            raise HTTPException(status_code=404, detail="Source file is not available on server storage")

    return FileResponse(
        path=storage_path,
        filename=file_name,
        media_type="application/octet-stream"
    )

