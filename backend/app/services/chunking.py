import re
import uuid
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.services.document_processor import ExtractedPage


class Chunk:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        content: str,
        page_number: Optional[int],
        chunk_index: int,
        metadata: Optional[Dict[str, Any]] = None,
        embedding: Optional[List[float]] = None
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.content = content
        self.page_number = page_number
        self.chunk_index = chunk_index
        self.metadata = metadata or {}
        self.embedding = embedding or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "_id": self.chunk_id,
            "id": self.chunk_id,
            "document_id": self.document_id,
            "content": self.content,
            "page_number": self.page_number,
            "chunk_index": self.chunk_index,
            "metadata": self.metadata,
            "embedding": self.embedding,
        }


def split_text_into_sentences(text: str) -> List[str]:
    """Splits text into sentences while keeping punctuation attached."""
    # Split on sentence end followed by whitespace or newline
    sentence_endings = re.compile(r'(?<=[.!?])\s+|\n+')
    raw_sentences = sentence_endings.split(text)
    return [s.strip() for s in raw_sentences if s.strip()]


def create_chunks_from_pages(
    pages: List[ExtractedPage],
    document_id: str,
    doc_metadata: Optional[Dict[str, Any]] = None,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[Chunk]:
    """
    Creates chunks from extracted document pages respecting sentence boundaries,
    headings, and page numbers.
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    doc_metadata = doc_metadata or {}

    chunks: List[Chunk] = []
    global_chunk_index = 0

    for page in pages:
        page_text = page.text
        if not page_text:
            continue

        sentences = split_text_into_sentences(page_text)
        current_chunk_sentences: List[str] = []
        current_chunk_len = 0
        current_heading = page.heading

        for sentence in sentences:
            # Check if sentence looks like a markdown or structural heading
            if sentence.startswith("#") or sentence.isupper() and len(sentence) < 80:
                current_heading = sentence.strip("# \t")

            sentence_len = len(sentence) + 1  # include space

            if current_chunk_len + sentence_len > chunk_size and current_chunk_sentences:
                # Flush the current chunk
                chunk_content = " ".join(current_chunk_sentences).strip()
                if chunk_content:
                    chunk_obj = Chunk(
                        chunk_id=str(uuid.uuid4()),
                        document_id=document_id,
                        content=chunk_content,
                        page_number=page.page_number,
                        chunk_index=global_chunk_index,
                        metadata={
                            **doc_metadata,
                            "page_number": page.page_number,
                            "heading": current_heading,
                            "char_count": len(chunk_content),
                        },
                    )
                    chunks.append(chunk_obj)
                    global_chunk_index += 1

                # Calculate overlap sentences to carry forward
                overlap_sentences: List[str] = []
                overlap_len = 0
                for s in reversed(current_chunk_sentences):
                    if overlap_len + len(s) <= chunk_overlap:
                        overlap_sentences.insert(0, s)
                        overlap_len += len(s)
                    else:
                        break

                current_chunk_sentences = list(overlap_sentences)
                current_chunk_len = sum(len(s) + 1 for s in current_chunk_sentences)

            current_chunk_sentences.append(sentence)
            current_chunk_len += sentence_len

        # Flush any remaining sentences for the page
        if current_chunk_sentences:
            chunk_content = " ".join(current_chunk_sentences).strip()
            if chunk_content:
                chunk_obj = Chunk(
                    chunk_id=str(uuid.uuid4()),
                    document_id=document_id,
                    content=chunk_content,
                    page_number=page.page_number,
                    chunk_index=global_chunk_index,
                    metadata={
                        **doc_metadata,
                        "page_number": page.page_number,
                        "heading": current_heading,
                        "char_count": len(chunk_content),
                    },
                )
                chunks.append(chunk_obj)
                global_chunk_index += 1

    return chunks
