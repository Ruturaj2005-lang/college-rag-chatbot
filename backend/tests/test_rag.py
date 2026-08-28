import pytest
import asyncio
from app.services.ai_service import _generate_mock_embedding, get_embedding, generate_grounded_answer
from app.services.vector_store import calculate_cosine_similarity
from app.services.rag_service import process_rag_query
from app.core.database import memory_db


@pytest.mark.asyncio
async def test_mock_embedding_similarity():
    # Semantically related queries should have higher cosine similarity
    emb1 = await get_embedding("What is the hostel gate curfew in-timing?")
    emb2 = await get_embedding("Hostel gates close at 9:30 PM for boys and 9:00 PM for girls.")
    emb3 = await get_embedding("The computational complexity of matrix multiplication.")

    sim_related = calculate_cosine_similarity(emb1, emb2)
    sim_unrelated = calculate_cosine_similarity(emb1, emb3)

    assert sim_related > sim_unrelated
    assert sim_related > 0.60


@pytest.mark.asyncio
async def test_generate_grounded_answer_no_context():
    answer, latency = await generate_grounded_answer(
        question="What is the tuition fee?",
        retrieved_chunks=[]
    )
    assert "couldn't find this information" in answer.lower()


@pytest.mark.asyncio
async def test_rag_pipeline_empty_query():
    res = await process_rag_query("")
    assert not res.grounded
    assert len(res.sources) == 0
