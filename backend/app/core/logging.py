import logging
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Configure standard structured logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger("college_rag")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        start_time = time.perf_counter()

        logger.info(
            f"--> [REQ] ID={request_id} Method={request.method} Path={request.url.path} "
            f"Client={request.client.host if request.client else 'unknown'}"
        )

        try:
            response = await call_next(request)
            process_time = (time.perf_counter() - start_time) * 1000
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
            
            logger.info(
                f"<-- [RES] ID={request_id} Status={response.status_code} "
                f"Latency={process_time:.2f}ms"
            )
            return response
        except Exception as exc:
            process_time = (time.perf_counter() - start_time) * 1000
            logger.error(
                f"<-- [ERR] ID={request_id} Latency={process_time:.2f}ms Error={str(exc)}",
                exc_info=True,
            )
            raise


def log_rag_query(
    request_id: str,
    user_id: str,
    question: str,
    retrieval_count: int,
    retrieval_scores: list,
    llm_latency_ms: float,
    total_latency_ms: float,
    error: str = None,
):
    """Structured logging for RAG queries complying with Section 34 Observability."""
    score_strs = [f"{s:.3f}" for s in retrieval_scores]
    logger.info(
        f"[RAG_EVENT] request_id={request_id} user_id={user_id} "
        f"question=\"{question[:80]}\" retrieval_count={retrieval_count} "
        f"retrieval_scores={score_strs} llm_latency_ms={llm_latency_ms:.1f} "
        f"total_latency_ms={total_latency_ms:.1f} error={error or 'none'}"
    )
