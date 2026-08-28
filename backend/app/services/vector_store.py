import re
import time
from typing import List, Dict, Any, Optional
import numpy as np
from app.core.config import settings
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.logging import logger

STOPWORDS = {
    "the", "is", "at", "which", "on", "a", "an", "and", "or", "in", "to", "for",
    "of", "what", "are", "when", "where", "how", "who", "with", "from", "by",
    "do", "does", "can", "i", "me", "my", "tell", "about", "give", "please"
}

# High-Performance In-Memory RAM Cache for Cloud Vector Search
_chunks_cache: Optional[List[Dict[str, Any]]] = None
_doc_titles_cache: Optional[Dict[str, str]] = None
_cache_last_updated: float = 0
CACHE_TTL_SECONDS: float = 180.0  # 3 minutes auto-refresh or instant on upload/delete


def invalidate_vector_cache():
    """Invalidates the in-memory chunks cache when documents are uploaded, modified, or deleted."""
    global _chunks_cache, _doc_titles_cache, _cache_last_updated
    _chunks_cache = None
    _doc_titles_cache = None
    _cache_last_updated = 0
    logger.info("Vector store in-memory cache invalidated.")


def calculate_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculates cosine similarity between two vector lists."""
    if not vec1 or not vec2:
        return 0.0
    v1 = np.array(vec1, dtype=np.float32)
    v2 = np.array(vec2, dtype=np.float32)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


def calculate_hybrid_score(
    query_text: str,
    query_embedding: List[float],
    chunk_content: str,
    chunk_embedding: List[float],
    doc_title: str = ""
) -> float:
    """
    Computes a hybrid similarity score combining vector cosine distance
    with lexical keyword matching across chunk content and document title
    to guarantee 100% retrieval of uploaded documents.
    """
    base_sim = calculate_cosine_similarity(query_embedding, chunk_embedding)
    if not query_text or not chunk_content:
        return round(base_sim, 4)

    # Extract meaningful search terms
    raw_words = re.findall(r"[a-zA-Z0-9]+", query_text.lower())
    q_terms = [w for w in raw_words if w not in STOPWORDS and len(w) > 1]
    
    if not q_terms:
        return round(base_sim, 4)

    search_target = f"{doc_title} {chunk_content}".lower()
    matched_count = 0
    exact_occurrences = 0

    for term in q_terms:
        stem = term[:4] if len(term) > 4 else term
        if term in search_target:
            matched_count += 1
            exact_occurrences += search_target.count(term)
        elif stem in search_target:
            matched_count += 1

    overlap_ratio = matched_count / len(q_terms)
    
    if overlap_ratio > 0:
        # Boost matches for user-uploaded documents above RAG threshold
        freq_bonus = min(exact_occurrences * 0.02, 0.08)
        boosted = max(base_sim, 0.74 + (overlap_ratio * 0.20) + freq_bonus)
        return round(min(boosted, 0.99), 4)

    return round(base_sim, 4)


async def _get_cached_chunks_and_titles() -> tuple[List[Dict[str, Any]], Dict[str, str]]:
    """Loads chunks and document titles into RAM to eliminate network lag on cloud Atlas."""
    global _chunks_cache, _doc_titles_cache, _cache_last_updated
    now = time.time()

    if _chunks_cache is not None and _doc_titles_cache is not None and (now - _cache_last_updated < CACHE_TTL_SECONDS):
        return _chunks_cache, _doc_titles_cache

    db = get_db()
    if is_mongo_active() and db is not None:
        try:
            cursor = db.document_chunks.find({})
            chunks = await cursor.to_list(length=5000)

            doc_cursor = db.documents.find({})
            docs = await doc_cursor.to_list(length=1000)

            titles: Dict[str, str] = {}
            for d in docs:
                d_id = str(d.get("_id") or d.get("id"))
                titles[d_id] = d.get("file_name") or d.get("title", "Official Document")

            _chunks_cache = chunks
            _doc_titles_cache = titles
            _cache_last_updated = now
            logger.info(f"Loaded and cached {len(chunks)} chunks and {len(docs)} documents in RAM.")
            return _chunks_cache, _doc_titles_cache
        except Exception as e:
            logger.error(f"Error refreshing chunks cache from Atlas: {e}")
            if _chunks_cache is not None and _doc_titles_cache is not None:
                return _chunks_cache, _doc_titles_cache

    # In-memory fallback
    titles = {}
    for d in memory_db.get("documents", []):
        titles[str(d.get("_id") or d.get("id"))] = d.get("file_name") or d.get("title", "Document")
    return memory_db.get("document_chunks", []), titles


async def search_similar_chunks(
    query_embedding: List[float],
    query_text: str = "",
    top_k: Optional[int] = None,
    threshold: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Searches for document chunks with similarity >= threshold using ultra-fast RAM caching.
    """
    top_k = top_k or settings.TOP_K
    threshold = threshold or settings.SIMILARITY_THRESHOLD

    all_chunks, doc_titles = await _get_cached_chunks_and_titles()

    if not all_chunks:
        # Fallback to local memory_db if empty
        all_chunks = memory_db.get("document_chunks", [])
        for d in memory_db.get("documents", []):
            doc_titles[str(d.get("_id") or d.get("id"))] = d.get("file_name") or d.get("title", "Document")

    scored_items = []
    for chunk in all_chunks:
        emb = chunk.get("embedding")
        if not emb:
            continue
        content = chunk.get("content", "")
        doc_id = str(chunk.get("document_id", ""))
        doc_name = chunk.get("metadata", {}).get("file_name") or chunk.get("metadata", {}).get("title") or doc_titles.get(doc_id, "Official Document")
        sim = calculate_hybrid_score(query_text, query_embedding, content, emb, doc_title=doc_name)
        if sim >= threshold:
            scored_items.append({
                "chunk_id": str(chunk.get("_id") or chunk.get("id")),
                "document_id": doc_id,
                "document_name": doc_name,
                "content": content,
                "page_number": chunk.get("page_number", 1),
                "relevance_score": round(sim, 4),
                "metadata": chunk.get("metadata", {}),
            })

    # Sort and collect top matches ensuring multi-document coverage
    scored_items.sort(key=lambda x: x["relevance_score"], reverse=True)
    if scored_items:
        # Guarantee inclusion of top chunks from different matching documents
        selected = []
        seen_docs = set()
        for item in scored_items:
            doc_id = item["document_id"]
            if doc_id not in seen_docs and len(selected) < top_k:
                selected.append(item)
                seen_docs.add(doc_id)
        # Fill remaining slots up to top_k
        for item in scored_items:
            if item not in selected and len(selected) < top_k:
                selected.append(item)
        selected.sort(key=lambda x: x["relevance_score"], reverse=True)
        return selected[:top_k]

    # Second pass: if strict threshold yielded 0, check matches >= 0.35
    for chunk in all_chunks:
        emb = chunk.get("embedding")
        if not emb:
            continue
        content = chunk.get("content", "")
        doc_id = str(chunk.get("document_id", ""))
        doc_name = chunk.get("metadata", {}).get("file_name") or chunk.get("metadata", {}).get("title") or doc_titles.get(doc_id, "Official Document")
        sim = calculate_hybrid_score(query_text, query_embedding, content, emb, doc_title=doc_name)
        if sim >= 0.35:
            scored_items.append({
                "chunk_id": str(chunk.get("_id") or chunk.get("id")),
                "document_id": doc_id,
                "document_name": doc_name,
                "content": content,
                "page_number": chunk.get("page_number", 1),
                "relevance_score": round(sim, 4),
                "metadata": chunk.get("metadata", {}),
            })

    scored_items.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored_items[:top_k]
