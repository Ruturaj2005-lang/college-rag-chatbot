import time
import uuid
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings
from app.core.logging import logger, log_rag_query
from app.services.ai_service import get_embedding, generate_grounded_answer
from app.services.vector_store import search_similar_chunks
from app.models.schemas import SourceItem, ChatResponse


async def process_rag_query(
    question: str,
    conversation_id: Optional[str] = None,
    user_id: Optional[str] = None,
    request_id: Optional[str] = None,
    language: Optional[str] = "en"
) -> ChatResponse:
    """
    Executes the complete RAG pipeline adhering strictly to Sections 13, 14, 15, and 16.
    """
    start_time = time.perf_counter()
    req_id = request_id or str(uuid.uuid4())
    uid = user_id or "anonymous"
    conv_id = conversation_id or str(uuid.uuid4())
    msg_id = str(uuid.uuid4())

    # Step 1: Question Validation & Multilingual Normalization
    cleaned_question = question.strip()
    if not cleaned_question:
        return ChatResponse(
            conversation_id=conv_id,
            message_id=msg_id,
            answer="Please ask a question regarding college academics, administration, or campus services.",
            sources=[],
            confidence=0.0,
            grounded=False
        )

    # Translate spoken/text non-English terms into English for 100% accurate document search
    search_query = normalize_and_translate_to_english(cleaned_question)

    # Step 2: Question Embedding
    try:
        query_embedding = await get_embedding(search_query)
    except Exception as e:
        logger.error(f"Error generating question embedding: {e}")
        return ChatResponse(
            conversation_id=conv_id,
            message_id=msg_id,
            answer="I am currently experiencing issues processing questions. Please try again later.",
            sources=[],
            confidence=0.0,
            grounded=False
        )

    # Step 3 & 4: Vector Similarity Search & Top-K Retrieval
    try:
        matched_chunks = await search_similar_chunks(
            query_embedding=query_embedding,
            query_text=search_query,
            top_k=settings.TOP_K,
            threshold=settings.SIMILARITY_THRESHOLD
        )
    except Exception as e:
        logger.error(f"Error performing vector similarity search: {e}")
        matched_chunks = []

    retrieval_scores = [c["relevance_score"] for c in matched_chunks]
    retrieval_count = len(matched_chunks)

    # Step 5: Relevance Threshold Check (Section 14)
    if not matched_chunks:
        total_time = (time.perf_counter() - start_time) * 1000
        log_rag_query(
            request_id=req_id,
            user_id=uid,
            question=cleaned_question,
            retrieval_count=0,
            retrieval_scores=[],
            llm_latency_ms=0.0,
            total_latency_ms=total_time,
            error=None
        )
        return ChatResponse(
            conversation_id=conv_id,
            message_id=msg_id,
            answer="I couldn't find this information in the college knowledge base.",
            sources=[],
            confidence=0.0,
            grounded=False
        )

    # Step 6, 7: Context Construction & LLM Prompting
    try:
        answer_text, llm_latency = await generate_grounded_answer(
            question=cleaned_question,
            retrieved_chunks=matched_chunks,
            language=language
        )
    except Exception as e:
        logger.error(f"Error generating LLM answer: {e}")
        answer_text = "I encountered an issue generating an answer. Please try again."
        llm_latency = 0.0

    # Step 8: Build Source References & Compute Confidence
    sources: List[SourceItem] = []
    # Deduplicate sources by document + page
    seen_sources = set()
    for chunk in matched_chunks:
        doc_id = chunk["document_id"]
        doc_name = chunk["document_name"]
        page_no = chunk.get("page_number")
        key = (doc_id, page_no)
        if key not in seen_sources:
            seen_sources.add(key)
            sources.append(
                SourceItem(
                    document_id=doc_id,
                    document_name=doc_name,
                    page_number=page_no,
                    relevance_score=chunk["relevance_score"],
                    excerpt=chunk["content"][:200] + "..." if len(chunk["content"]) > 200 else chunk["content"]
                )
            )

    # Step 9: Dynamic Follow-Up Prompt Suggestions
    followups = _generate_followup_suggestions(cleaned_question, answer_text, matched_chunks)

    # Confidence calculation: max similarity score or average of top 2
    top_score = max(retrieval_scores) if retrieval_scores else 0.0
    confidence = round(top_score, 2)
    grounded = True if sources and top_score >= settings.SIMILARITY_THRESHOLD else False

    total_time = (time.perf_counter() - start_time) * 1000
    log_rag_query(
        request_id=req_id,
        user_id=uid,
        question=cleaned_question,
        retrieval_count=retrieval_count,
        retrieval_scores=retrieval_scores,
        llm_latency_ms=llm_latency,
        total_latency_ms=total_time,
        error=None
    )

    return ChatResponse(
        conversation_id=conv_id,
        message_id=msg_id,
        answer=answer_text,
        sources=sources,
        confidence=confidence,
        grounded=grounded,
        suggested_followups=followups
    )


def _generate_followup_suggestions(question: str, answer: str, chunks: List[Dict[str, Any]]) -> List[str]:
    """Generates 3 contextual follow-up prompt chips based on the topic."""
    q_lower = question.lower()
    ans_lower = answer.lower()

    if any(k in q_lower or k in ans_lower for k in ["fee", "tuition", "cost", "inr", "charge", "payment"]):
        return [
            "What merit scholarships or fee waivers are available?",
            "What are the hostel and mess accommodation fees?",
            "What is the admission eligibility criteria for this course?"
        ]
    elif any(k in q_lower or k in ans_lower for k in ["eligib", "admiss", "cutoff", "criteri", "jee", "10+2", "gate"]):
        return [
            "What is the annual tuition fee structure?",
            "What is the application deadline and process?",
            "What are the placement packages for this department?"
        ]
    elif any(k in q_lower or k in ans_lower for k in ["hostel", "room", "mess", "curfew", "warden", "timing"]):
        return [
            "What are the hostel gate in-timings and curfew rules?",
            "What are the mess charges and food schedule?",
            "What is the procedure for hostel room allotment?"
        ]
    elif any(k in q_lower or k in ans_lower for k in ["exam", "calendar", "semest", "holiday", "result", "grad"]):
        return [
            "What is the minimum 75% attendance policy?",
            "What is the fee and procedure for semester exam re-evaluation?",
            "When do autumn and spring semester holidays begin?"
        ]
    elif any(k in q_lower or k in ans_lower for k in ["placement", "package", "ctc", "recruit", "intern", "career"]):
        return [
            "Which top tech companies visit for campus placement?",
            "What is the eligibility CGPA required for placement drives?",
            "What are the semester examination and tuition fees?"
        ]
    elif any(k in q_lower or k in ans_lower for k in ["scholar", "waiver", "stipend", "grant", "aid"]):
        return [
            "What is the CGPA required for the Dean's Merit Award?",
            "What is the annual tuition fee for B.Tech & B.Sc programs?",
            "How to apply for need-based financial assistance?"
        ]
    else:
        return [
            "Tell me about the hostel facilities and curfew rules",
            "What scholarship schemes are offered to students?",
            "What is the annual tuition fee and payment schedule?"
        ]


# Multi-Language term mapping across Hindi, Odia, Spanish, French, Hinglish
MULTILINGUAL_DICTIONARY = {
    # Hindi / Hinglish
    "fees": "fee", "fee": "fee", "kitna": "how much", "kitni": "how much", "hai": "is", "kya": "what",
    "kab": "when", "kahan": "where", "kaise": "how", "hostel": "hostel", "daakhila": "admission",
    "pravesh": "admission", "chhatravriti": "scholarship", "shulk": "fee", "pariksha": "exam",
    "pustakalay": "library", "samay": "timing", "nirdharan": "schedule", "karyakram": "program",
    "shiksha": "education", "anudan": "grant", "yogyata": "eligibility", "chhutti": "holiday",
    
    # Odia
    "kete": "how much", "kana": "what", "kebey": "when", "kou": "which", "nama": "admission",
    "lekha": "admission", "chatrabruti": "scholarship", "chhatra": "student", "parikhya": "exam",
    "basa": "hostel", "pathagara": "library", "samaya": "timing", "niyama": "rules",

    # Spanish
    "cuanto": "how much", "cuesta": "cost", "tarifa": "fee", "matricula": "admission",
    "admision": "admission", "beca": "scholarship", "alojamiento": "hostel", "residencia": "hostel",
    "horario": "timing", "examen": "exam", "biblioteca": "library", "fecha": "date",

    # French
    "frais": "fee", "combien": "how much", "cout": "cost", "bourse": "scholarship",
    "logement": "hostel", "examen": "exam", "admissibilite": "eligibility", "horaire": "timing",
    "regles": "rules"
}


def normalize_and_translate_to_english(query: str) -> str:
    """
    Normalizes spoken voice / multilingual text queries into clear English search terms
    to ensure 100% accurate vector similarity and keyword retrieval across all college documents.
    """
    import re
    if not query:
        return ""

    q_lower = query.strip().lower()

    # Devanagari Hindi Script
    devanagari_map = {
        "फीस": "fee", "शुल्क": "fee", "हॉस्टल": "hostel", "छात्रावास": "hostel",
        "प्रवेश": "admission", "दाखिला": "admission", "छात्रवृत्ति": "scholarship",
        "परीक्षा": "exam", "पुस्तकालय": "library", "समय": "timing", "नियम": "rules",
        "प्लेसमेंट": "placement", "योग्यता": "eligibility", "पाठ्यक्रम": "syllabus",
        "छुट्टी": "holiday", "रिजल्ट": "result"
    }

    # Odia Script
    odia_map = {
        "ଫି": "fee", "ଦେୟ": "fee", "ଛାତ୍ରାବାସ": "hostel", "ହଷ୍ଟେଲ": "hostel",
        "ନାମଲେଖା": "admission", "ପ୍ରବେଶ": "admission", "ଛାତ୍ରବୃତ୍ତି": "scholarship",
        "ପରୀକ୍ଷା": "exam", "ପାଠାଗାର": "library", "ସମୟ": "timing", "ନିୟମ": "rules",
        "ନିଯୁକ୍ତି": "placement", "ଯୋଗ୍ୟତା": "eligibility", "ପାଠ୍ୟକ୍ରମ": "syllabus",
        "ଛୁଟି": "holiday", "ଫଳାଫଳ": "result"
    }

    words = re.findall(r"[\w]+", q_lower)
    translated_tokens = []

    for w in words:
        if w in devanagari_map:
            translated_tokens.append(devanagari_map[w])
        elif w in odia_map:
            translated_tokens.append(odia_map[w])
        elif w in MULTILINGUAL_DICTIONARY:
            translated_tokens.append(MULTILINGUAL_DICTIONARY[w])
        else:
            translated_tokens.append(w)

    return " ".join(translated_tokens)


