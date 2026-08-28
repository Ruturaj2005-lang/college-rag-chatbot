from fastapi import APIRouter, Query
from typing import Optional
from app.services.search_service import search_knowledge_base

router = APIRouter(tags=["Knowledge Search"])


@router.get("/search")
async def search_endpoint(
    q: str = Query(..., description="Keyword query to search across the college knowledge base"),
    limit: Optional[int] = Query(10, ge=1, le=50, description="Max number of search results to return")
):
    """
    Search college knowledge base by keywords, titles, and chunk contents.
    Supports multi-keyword search, partial matching, case-insensitivity, and excerpt highlighting.
    """
    return await search_knowledge_base(query=q, limit=limit)
