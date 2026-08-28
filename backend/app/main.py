import os
import sys
from pathlib import Path

# Automatically inject backend directory into sys.path
_backend_dir = str(Path(__file__).resolve().parent.parent)
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import connect_to_mongo, close_mongo_connection, is_mongo_active
from app.core.logging import logger, RequestLoggingMiddleware
from app.api import auth, chat, conversations, admin, feedback, search, documents, notices


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing RAG-Based College Chatbot Backend...")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await connect_to_mongo()
    # Synchronize all uploaded files into resilient storage
    try:
        from app.core.database import sync_local_storage_documents
        await sync_local_storage_documents()
    except Exception as e:
        logger.warning(f"Storage sync notice: {e}")
    # Pre-warm vector cache and document inventory in background
    try:
        from app.services.vector_store import _get_cached_chunks_and_titles
        import asyncio
        asyncio.create_task(_get_cached_chunks_and_titles())
    except Exception as e:
        logger.warning(f"Background cache pre-warming notice: {e}")
    yield
    # Shutdown
    logger.info("Shutting down RAG-Based College Chatbot Backend...")
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the RAG-Based College Chatbot with MongoDB Atlas Vector Search.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Custom Request Logging & Observability Middleware (Section 34)
app.add_middleware(RequestLoggingMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
api_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=api_prefix)
app.include_router(chat.router, prefix=api_prefix)
app.include_router(conversations.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(feedback.router, prefix=api_prefix)
app.include_router(feedback.feedback_direct_router, prefix=api_prefix)
app.include_router(search.router, prefix=api_prefix)
app.include_router(documents.router, prefix=api_prefix)
app.include_router(notices.router, prefix=api_prefix)


@app.get("/api/health", tags=["Health"])
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "database": "MongoDB Atlas" if is_mongo_active() else "In-Memory / Local Mode",
        "mongodb_connected": is_mongo_active(),
        "ai_provider": settings.AI_PROVIDER,
        "embedding_model": settings.EMBEDDING_MODEL,
        "similarity_threshold": settings.SIMILARITY_THRESHOLD,
        "top_k": settings.TOP_K
    }


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Welcome to the RAG-Based College Chatbot API.",
        "docs": "/docs",
        "health": "/api/health"
    }
