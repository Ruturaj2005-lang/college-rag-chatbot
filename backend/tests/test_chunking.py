import pytest
from app.services.document_processor import ExtractedPage
from app.services.chunking import create_chunks_from_pages, split_text_into_sentences


def test_split_text_into_sentences():
    text = "Students must attend class. The minimum attendance is 75%. Questions?"
    sentences = split_text_into_sentences(text)
    assert len(sentences) == 3
    assert sentences[0] == "Students must attend class."
    assert sentences[1] == "The minimum attendance is 75%."
    assert sentences[2] == "Questions?"


def test_create_chunks_from_pages():
    long_text = " ".join([f"This is sentence number {i} containing important college facts." for i in range(50)])
    page = ExtractedPage(page_number=1, text=long_text, heading="Academic Guidelines")
    
    chunks = create_chunks_from_pages(
        pages=[page],
        document_id="doc-123",
        doc_metadata={"file_name": "guidelines.txt"},
        chunk_size=300,
        chunk_overlap=50
    )
    
    assert len(chunks) > 1
    for chunk in chunks:
        assert chunk.document_id == "doc-123"
        assert chunk.page_number == 1
        assert chunk.chunk_id is not None
        assert len(chunk.content) > 0
        assert chunk.metadata["file_name"] == "guidelines.txt"
