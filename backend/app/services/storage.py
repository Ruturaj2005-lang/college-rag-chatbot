import os
import shutil
import uuid
from typing import Tuple
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.core.logging import logger


def ensure_upload_dir():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


async def save_uploaded_file(file: UploadFile) -> Tuple[str, str, int, str]:
    """
    Validates and saves an uploaded file to disk.
    Returns: (saved_file_path, file_name, file_size_bytes, file_type)
    """
    ensure_upload_dir()
    
    # Validate extension
    file_name = file.filename or "unknown"
    ext = os.path.splitext(file_name)[1].lower().strip(".")
    if ext not in ["pdf", "docx", "doc", "txt", "text", "md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, DOCX, TXT."
        )

    # Unique file on disk
    unique_filename = f"{uuid.uuid4()}_{file_name}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Read and validate size
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    size = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            size += len(chunk)
            if size > max_bytes:
                buffer.close()
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
                )
            buffer.write(chunk)

    logger.info(f"Saved file {file_name} ({size} bytes) to {file_path}")
    return file_path, file_name, size, ext


def delete_file(file_path: str):
    """Deletes a file if it exists."""
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted file {file_path}")
    except Exception as e:
        logger.warning(f"Failed to delete file {file_path}: {e}")
