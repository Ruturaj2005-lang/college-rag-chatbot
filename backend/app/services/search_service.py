import re
from typing import List, Dict, Any, Optional
from app.core.database import get_db, is_mongo_active, memory_db
from app.core.logging import logger

STOPWORDS = {
    "the", "is", "at", "which", "on", "a", "an", "and", "or", "in", "to", "for",
    "of", "what", "are", "when", "where", "how", "who", "with", "from", "by",
    "do", "does", "can", "i", "me", "my", "tell", "about", "give", "please", "all"
}


def extract_matched_excerpt(content: str, keywords: List[str], max_len: int = 240) -> Dict[str, str]:
    """
    Extracts a relevant surrounding excerpt from the text content around the matched keyword(s),
    and highlights the keyword occurrences using markdown bolding (**term**).
    """
    if not content:
        return {"raw_excerpt": "", "highlighted_excerpt": ""}

    content_lower = content.lower()
    best_pos = -1

    # Find the earliest occurrence of any keyword
    for kw in keywords:
        pos = content_lower.find(kw.lower())
        if pos != -1:
            if best_pos == -1 or pos < best_pos:
                best_pos = pos

    if best_pos == -1:
        # Fallback to start of text
        snippet = content[:max_len].strip()
        if len(content) > max_len:
            snippet += "..."
        return {"raw_excerpt": snippet, "highlighted_excerpt": snippet}

    # Calculate excerpt window around the best match
    half_window = max_len // 2
    start = max(0, best_pos - half_window)
    end = min(len(content), best_pos + half_window)

    # Adjust to word boundaries if possible
    if start > 0:
        prev_space = content.rfind(" ", 0, start)
        if prev_space != -1 and (start - prev_space) < 20:
            start = prev_space + 1

    if end < len(content):
        next_space = content.find(" ", end)
        if next_space != -1 and (next_space - end) < 20:
            end = next_space

    raw_snippet = content[start:end].strip()
    if start > 0:
        raw_snippet = "..." + raw_snippet
    if end < len(content):
        raw_snippet = raw_snippet + "..."

    # Highlight keywords with Markdown bold (e.g. **keyword**)
    highlighted = raw_snippet
    for kw in sorted(keywords, key=len, reverse=True):
        if len(kw) < 2:
            continue
        pattern = re.compile(re.escape(kw), re.IGNORECASE)
        highlighted = pattern.sub(r"**\g<0>**", highlighted)

    return {
        "raw_excerpt": raw_snippet,
        "highlighted_excerpt": highlighted
    }


def compute_keyword_relevance(
    query_terms: List[str],
    doc_title: str,
    content: str
) -> float:
    """
    Computes a normalized relevance score [0.0 - 1.0] based on:
    - Title matches (high weight)
    - Term coverage (how many query words appear)
    - Exact phrase occurrences
    - Term frequency
    """
    if not query_terms or not content:
        return 0.0

    content_lower = content.lower()
    title_lower = doc_title.lower() if doc_title else ""
    full_query = " ".join(query_terms).lower()

    score = 0.0

    # 1. Exact phrase bonus
    if full_query in content_lower:
        score += 0.35
    if title_lower and full_query in title_lower:
        score += 0.25

    # 2. Individual term matching & coverage
    terms_matched = 0
    total_term_freq = 0
    for term in query_terms:
        term_lower = term.lower()
        freq = content_lower.count(term_lower)
        if freq > 0 or (len(term_lower) > 3 and term_lower[:4] in content_lower):
            terms_matched += 1
            total_term_freq += min(freq, 5)

        # Title bonus per term
        if term_lower in title_lower:
            score += 0.15

    coverage_ratio = terms_matched / len(query_terms)
    score += coverage_ratio * 0.40
    score += min(total_term_freq * 0.03, 0.20)

    return round(min(score, 1.0), 3)


async def search_knowledge_base(
    query: str,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Executes case-insensitive, multi-keyword, partial-matching search
    across all document titles and chunk contents in the knowledge base.
    """
    cleaned_query = query.strip()
    if not cleaned_query:
        return {
            "query": "",
            "total_matches": 0,
            "results": []
        }

    # Extract search terms (case-insensitive)
    raw_tokens = re.findall(r"[a-zA-Z0-9]+", cleaned_query.lower())
    query_terms = [t for t in raw_tokens if t not in STOPWORDS and len(t) > 1]
    if not query_terms:
        query_terms = raw_tokens

    results: List[Dict[str, Any]] = []
    db = get_db()

    from app.services.vector_store import _get_cached_chunks_and_titles
    chunks, doc_titles = await _get_cached_chunks_and_titles()

    if not chunks:
        chunks = memory_db.get("document_chunks", [])
        doc_titles = {str(d.get("_id") or d.get("id")): (d.get("file_name") or d.get("title", "Document")) for d in memory_db.get("documents", [])}

    # Search through all chunks
    for chunk in chunks:
        content = chunk.get("content", "")
        if not content:
            continue

        doc_id = str(chunk.get("document_id", ""))
        doc_title = chunk.get("metadata", {}).get("title") or chunk.get("metadata", {}).get("file_name") or doc_titles.get(doc_id, "Official College Record")
        file_name = chunk.get("metadata", {}).get("file_name") or doc_titles.get(doc_id, "document.txt")
        page_num = chunk.get("page_number", 1)

        content_lower = content.lower()
        title_lower = doc_title.lower()

        # Check for any term or partial stem match
        matched_terms = []
        for term in query_terms:
            t_lower = term.lower()
            if t_lower in content_lower or t_lower in title_lower:
                matched_terms.append(term)
            elif len(t_lower) >= 4 and (t_lower[:4] in content_lower or t_lower[:4] in title_lower):
                matched_terms.append(term)

        if not matched_terms:
            continue

        relevance = compute_keyword_relevance(query_terms, doc_title, content)
        if relevance < 0.15:
            continue

        excerpts = extract_matched_excerpt(content, matched_terms, max_len=260)

        results.append({
            "chunk_id": str(chunk.get("_id") or chunk.get("id")),
            "document_id": doc_id,
            "document_name": doc_title,
            "file_name": file_name,
            "page_number": page_num,
            "matched_excerpt": excerpts["highlighted_excerpt"],
            "raw_excerpt": excerpts["raw_excerpt"],
            "full_content": content,
            "relevance_score": relevance,
            "relevance_percent": int(relevance * 100),
            "matched_terms": matched_terms
        })

    # Sort results by relevance descending
    results.sort(key=lambda x: x["relevance_score"], reverse=True)
    top_results = results[:limit]

    return {
        "query": cleaned_query,
        "total_matches": len(results),
        "results": top_results
    }
