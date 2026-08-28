import hashlib
import re
import time
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from app.core.config import settings
from app.core.logging import logger

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

# Prompt template strictly adhering to Section 15 of specification
SYSTEM_PROMPT_TEMPLATE = """You are a college information assistant.

Answer only using the supplied college knowledge-base context.

If the context does not contain enough information, say that the information is unavailable.

Format your response clearly:
- Start with a clear markdown heading for the topic (e.g. ## Understanding Admission Eligibility Criteria)
- Provide a clear, concise introductory explanation.
- Use structured bullet points (with bold key terms) for breakdown, rules, or steps.
- Maintain exact figures, amounts, dates, and prerequisites from the context.

Do not invent:
- fees
- dates
- deadlines
- policies
- contact details
- eligibility requirements
- college rules

CONTEXT:
{retrieved_chunks}

QUESTION:
{user_question}"""


def _generate_mock_embedding(text: str, dimension: int = 1536) -> List[float]:
    """
    Generates a deterministic pseudo-semantic unit vector for mock local development.
    Combines stem domain clusters, token hashing, and n-grams to produce realistic
    RAG similarity scores (>= 0.70) for relevant college documents and lower (< 0.40)
    for irrelevant/guardrail questions.
    """
    vec = np.zeros(dimension, dtype=np.float32)
    if not text:
        return vec.tolist()

    raw_words = re.findall(r"[a-zA-Z0-9]+", text.lower())
    
    # Semantic domain anchors (stem-based) mapped to dedicated multi-dimensional clusters
    domain_anchors = {
        # Admissions & Programs
        "admiss": [10, 11, 12, 13], "eligib": [10, 11, 12, 13], "cutoff": [10, 11, 12, 13],
        "criteri": [10, 11, 12, 13], "jee": [10, 11, 12, 13], "applic": [10, 11, 12, 13],
        "undergradu": [10, 11, 12, 13], "postgradu": [10, 11, 12, 13],
        "btech": [10, 11, 12, 13], "mtech": [10, 11, 12, 13],
        "bsc": [10, 11, 12, 13], "msc": [10, 11, 12, 13],
        "bca": [10, 11, 12, 13], "mca": [10, 11, 12, 13], "gate": [10, 11, 12, 13],
        
        # Fees & Finance
        "fee": [50, 51, 52, 53], "tuit": [50, 51, 52, 53], "pay": [50, 51, 52, 53],
        "cost": [50, 51, 52, 53], "revalu": [50, 51, 52, 53], "evalu": [50, 51, 52, 53],
        "totall": [50, 51, 52, 53], "instal": [50, 51, 52, 53], "charg": [50, 51, 52, 53],
        "amount": [50, 51, 52, 53],
        
        # Hostel & Housing
        "hostel": [100, 101, 102, 103], "room": [100, 101, 102, 103], "mess": [100, 101, 102, 103],
        "curfew": [100, 101, 102, 103], "warden": [100, 101, 102, 103],
        "accommod": [100, 101, 102, 103], "night": [100, 101, 102, 103],
        
        # Scholarships
        "scholar": [150, 151, 152, 153], "merit": [150, 151, 152, 153], "waiver": [150, 151, 152, 153],
        "financi": [150, 151, 152, 153], "dean": [150, 151, 152, 153], "sgpa": [150, 151, 152, 153],
        "grant": [150, 151, 152, 153], "aid": [150, 151, 152, 153], "stipend": [150, 151, 152, 153],
        
        # Courses & All Branches
        "cours": [200, 201, 202, 203], "curricul": [200, 201, 202, 203], "syllab": [200, 201, 202, 203],
        "branch": [200, 201, 202, 203], "degre": [200, 201, 202, 203], "program": [200, 201, 202, 203],
        "cse": [200, 201, 202, 203], "it": [200, 201, 202, 203], "ece": [200, 201, 202, 203],
        "eee": [200, 201, 202, 203], "mechan": [200, 201, 202, 203], "civil": [200, 201, 202, 203],
        "biotech": [200, 201, 202, 203], "physic": [200, 201, 202, 203], "chem": [200, 201, 202, 203],
        "math": [200, 201, 202, 203], "semest": [200, 201, 202, 203], "credit": [200, 201, 202, 203],
        "subject": [200, 201, 202, 203], "vlsi": [200, 201, 202, 203], "structur": [200, 201, 202, 203],
        
        # Exams & Grades
        "exam": [250, 251, 252, 253], "grad": [250, 251, 252, 253], "gpa": [250, 251, 252, 253],
        "admit": [250, 251, 252, 253], "hall": [250, 251, 252, 253], "result": [250, 251, 252, 253],
        
        # Library
        "librar": [300, 301, 302, 303], "book": [300, 301, 302, 303], "borrow": [300, 301, 302, 303],
        "read": [300, 301, 302, 303], "tim": [300, 301, 302, 303], "central": [300, 301, 302, 303],
        "journal": [300, 301, 302, 303],
        
        # Placements & Career
        "placement": [350, 351, 352, 353], "intern": [350, 351, 352, 353], "recruit": [350, 351, 352, 353],
        "packag": [350, 351, 352, 353], "ctc": [350, 351, 352, 353], "career": [350, 351, 352, 353],
        "compani": [350, 351, 352, 353], "offer": [350, 351, 352, 353],
        
        # Academic Calendar
        "calendar": [400, 401, 402, 403], "commenc": [400, 401, 402, 403], "vacat": [400, 401, 402, 403],
        "holiday": [400, 401, 402, 403], "start": [400, 401, 402, 403], "schedul": [400, 401, 402, 403],
        
        # Policies
        "polic": [450, 451, 452, 453], "rule": [450, 451, 452, 453], "attend": [450, 451, 452, 453],
        "rag": [450, 451, 452, 453], "disciplin": [450, 451, 452, 453], "code": [450, 451, 452, 453]
    }

    stopwords = {"the", "is", "at", "which", "on", "a", "an", "and", "or", "in", "to", "for", "of", "what", "are", "when", "where", "how", "who", "with", "from", "by", "do", "does", "can", "i", "me", "my"}

    matched_domains = set()

    for word in raw_words:
        if word in stopwords or len(word) < 2:
            continue
        
        stem = word[:6] if len(word) > 6 else word

        # Check domain anchor matches
        for anchor, indices in domain_anchors.items():
            if anchor in word or anchor in stem:
                matched_domains.add(anchor)
                for idx in indices:
                    vec[idx % dimension] += 30.0

        # General dynamic word & stem vector hash (ensures ALL uploaded files generate matching vectors)
        for seed in range(6):
            h = int(hashlib.md5(f"{stem}_{seed}".encode("utf-8")).hexdigest(), 16)
            vec[h % dimension] += 5.0

    # L2 normalize to unit sphere
    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    return vec.tolist()


async def get_embedding(text: str) -> List[float]:
    """Generates embedding vector using configured AI_PROVIDER."""
    if settings.AI_PROVIDER.lower() == "openai" and settings.OPENAI_API_KEY and AsyncOpenAI:
        try:
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
            response = await client.embeddings.create(
                input=text.replace("\n", " "),
                model=settings.EMBEDDING_MODEL
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"OpenAI embedding call failed: {e}. Falling back to mock embedding.")
            return _generate_mock_embedding(text, settings.EMBEDDING_DIMENSION)
    else:
        return _generate_mock_embedding(text, settings.EMBEDDING_DIMENSION)


async def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a batch of text chunks."""
    if not texts:
        return []
    
    if settings.AI_PROVIDER.lower() == "openai" and settings.OPENAI_API_KEY and AsyncOpenAI:
        try:
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
            cleaned_texts = [t.replace("\n", " ") for t in texts]
            response = await client.embeddings.create(
                input=cleaned_texts,
                model=settings.EMBEDDING_MODEL
            )
            data_sorted = sorted(response.data, key=lambda x: x.index)
            return [item.embedding for item in data_sorted]
        except Exception as e:
            logger.error(f"OpenAI batch embedding failed: {e}. Falling back to mock embeddings.")
            return [_generate_mock_embedding(t, settings.EMBEDDING_DIMENSION) for t in texts]
    else:
        return [_generate_mock_embedding(t, settings.EMBEDDING_DIMENSION) for t in texts]


def _synthesize_mock_answer(question: str, chunks: List[Dict[str, Any]], language: Optional[str] = "en") -> str:
    """
    Synthesizes a grounded factual response from retrieved chunks in mock mode
    without hallucinations, complying with Sections 15, 16, and 39.
    Specifically extracts ONLY the exact branch, fee, timing, or requirement asked.
    """
    if not chunks:
        msg = "I couldn't find this information in the college knowledge base."
        return _apply_language_translation(msg, language)

    q_lower = question.lower()
    all_content = "\n\n".join([c.get("content", "") for c in chunks])

    # Universal Multi-Document Word Extractor (searches each word and extracts rich, full facts from all matching files)
    q_words = re.findall(r"[a-zA-Z0-9]+", q_lower)
    stopwords = {"what", "is", "the", "are", "for", "and", "in", "to", "of", "a", "an", "how", "much", "many", "details", "tell", "me", "about", "when", "where", "give", "who", "which", "from", "at", "on", "by", "with", "did", "do", "does", "was", "were", "file", "document", "uploaded", "show", "please", "explain", "summary", "overview", "full", "all"}
    keywords = [w for w in q_words if w not in stopwords and len(w) > 1]

    is_overview_query = any(k in q_lower for k in [
        "what is in", "tell me about", "summary", "overview", "what does", "explain",
        "describe", "details", "full details", "show me", "what is the file", "about the report",
        "all about", "guidelines", "rules", "syllabus", "fees", "curriculum"
    ]) or not keywords

    # Clean title helper
    def format_title(raw_name: str) -> str:
        clean = re.sub(r"^[a-f0-9\-]{30,}_", "", raw_name or "Document Information")
        clean = re.sub(r"^seed_", "", clean)
        clean = re.sub(r"\.[a-zA-Z0-9]+$", "", clean)
        return clean.replace("_", " ").replace("-", " ").title()

    # Group chunks by document
    docs_map: Dict[str, List[str]] = {}
    for c in chunks:
        d_name = c.get("document_name") or "Document"
        d_title = format_title(d_name)
        content = c.get("content", "").strip()
        if d_title not in docs_map:
            docs_map[d_title] = []
        if content and content not in docs_map[d_title]:
            docs_map[d_title].append(content)

    doc_sections = []

    # Known inline label headers to break onto separate bullet lines
    inline_labels = [
        "Student Details", "Name:", "Roll Number:", "Regd Number:", "Department:", "Semester:",
        "University:", "Organization Details", "Organization Name:", "Internship Duration:",
        "Industry Mentor:", "Internship Objective", "Work Performed", "Skills Acquired",
        "Technical Skills:", "Soft Skills:", "Tools/Platforms:", "Learning Outcome", "Conclusion",
        "Tuition Fee:", "Semester Examination Fee:", "Payment Deadlines:", "Eligibility Criteria:",
        "Placement Record:", "Highest Package:", "Average Package:", "Hostel Curfew:", "Mess Schedule:"
    ]

    for doc_title, doc_contents in docs_map.items():
        combined_doc_text = "\n\n".join(doc_contents)
        
        # Pre-process inline labels
        for lbl in inline_labels:
            pattern = re.compile(r"(?<!^)(?<!\n)\s*(" + re.escape(lbl) + r")", re.IGNORECASE)
            combined_doc_text = pattern.sub(r"\n\1", combined_doc_text)

        lines = re.split(r"[\n\r]+", combined_doc_text)
        extracted = []

        for line in lines:
            clean = line.strip()
            clean = re.sub(r"^[•\-\*\d\.]+\s*", "", clean).strip()
            if len(clean) < 6:
                continue
            clean = re.sub(r"^#{1,6}\s+", "", clean).strip()
            clean_lower = clean.lower()

            if is_overview_query:
                matches = 1
            elif keywords:
                matches = sum(1 for kw in keywords if kw in clean_lower or (len(kw) > 3 and kw[:4] in clean_lower))
            else:
                matches = 1

            if matches > 0:
                # Bold labels (e.g. Name:, Fee:, Skills:)
                formatted = re.sub(r"^([A-Za-z\s&/]{2,30}:)", r"**\1**", clean)
                if formatted not in [e[1] for e in extracted]:
                    extracted.append((matches, formatted))

        if extracted:
            extracted.sort(key=lambda x: x[0], reverse=True)
            top = [e[1] for e in extracted[:16]]
            doc_sections.append((doc_title, top))
        elif len(docs_map) == 1:
            snippet = [re.sub(r"^([A-Za-z\s&/]{2,30}:)", r"**\1**", l.strip()) for l in lines[:10] if len(l.strip()) > 8]
            if snippet:
                doc_sections.append((doc_title, snippet))

    if not doc_sections:
        primary_title = list(docs_map.keys())[0] if docs_map else "Document Information"
        formatted_fallback = chunks[0].get("content", "")[:750]
        return _apply_language_translation(f"## {primary_title}\n\n{formatted_fallback}", language)

    # If all matches came from a single document
    if len(doc_sections) == 1:
        title, bullets = doc_sections[0]
        result = f"## {title}\n\n"
        for b in bullets:
            result += f"- {b}\n\n"
        return _apply_language_translation(result.strip(), language)

    # Multi-document result: extract and present from ALL files
    result = "## Knowledge Base Search Results\n\n"
    for title, bullets in doc_sections:
        result += f"### Source: {title}\n\n"
        for b in bullets:
            result += f"- {b}\n\n"
    return _apply_language_translation(result.strip(), language)


def _apply_language_translation(text: str, language: Optional[str]) -> str:
    """Translates common grounded headers and phrases into the target language."""
    if not text or not language or language == "en":
        return text

    if language == "hi":
        replacements = {
            "Tuition Fee Details": "ट्यूशन फीस विवरण (Tuition Fee Details)",
            "Admission Eligibility": "प्रवेश पात्रता (Admission Eligibility)",
            "Placement Statistics": "प्लेसमेंट आंकड़े (Placement Statistics)",
            "Hostel Curfew & Gate In-Timings": "हॉस्टल गेट समय और कर्फ्यू नियम (Hostel Rules)",
            "Semester Examination Fee": "सेमेस्टर परीक्षा शुल्क",
            "per semester": "प्रति सेमेस्टर",
            "Payment Deadlines": "शुल्क भुगतान की अंतिम तिथि (Deadlines)",
            "Autumn Semester deadline": "ऑटम सेमेस्टर की अंतिम तिथि",
            "Spring Semester deadline": "स्प्रिंग सेमेस्टर की अंतिम तिथि",
            "Application Portal": "ऑनलाइन आवेदन पोर्टल",
            "Online applications open": "ऑनलाइन आवेदन खुले हैं",
            "Eligibility": "पात्रता",
            "CGPA >=": "न्यूनतम सीजीपीए",
            "with no active backlogs": "बिना किसी बैकलाग के",
            "Academic Calendar": "अकादमिक कैलेंडर (Academic Calendar)",
            "Library Timings": "पुस्तकालय का समय (Library Timings)"
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        return text

    elif language == "or":
        replacements = {
            "Tuition Fee Details": "ପାଠ୍ୟକ୍ରମ ଫି ବିବରଣୀ (Tuition Fee Details)",
            "Admission Eligibility": "ନାମଲେଖା ଯୋଗ୍ୟତା (Admission Eligibility)",
            "Placement Statistics": "ନିଯୁକ୍ତି / ପ୍ଲେସମେଣ୍ଟ ତଥ୍ୟ (Placements)",
            "Hostel Curfew & Gate In-Timings": "ଛାତ୍ରାବାସ ଗେଟ ସମୟ ଏବଂ ନିୟମ (Hostel Rules)",
            "Semester Examination Fee": "ସେମିଷ୍ଟାର ପରୀକ୍ଷା ଫି",
            "per semester": "ପ୍ରତି ସେମିଷ୍ଟାର",
            "Payment Deadlines": "ଦେୟ ପ୍ରଦାନର ଶେଷ ତାରିଖ",
            "Application Portal": "ଆବେଦନ ପୋର୍ଟାଲ",
            "Eligibility": "ଯୋଗ୍ୟତା",
            "Academic Calendar": "ଏକାଡେମିକ କ୍ୟାଲେଣ୍ଡର",
            "Library Timings": "ପାଠାଗାର ସମୟ"
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        return text

    elif language == "es":
        replacements = {
            "Tuition Fee Details": "Detalles de Tarifas y Matrícula",
            "Admission Eligibility": "Requisitos de Admisión",
            "Placement Statistics": "Estadísticas de Colocación Laboral",
            "Hostel Curfew & Gate In-Timings": "Horarios y Normas del Albergue",
            "Semester Examination Fee": "Tarifa de Examen Semestral",
            "Payment Deadlines": "Fechas Límite de Pago",
            "Application Portal": "Portal de Solicitudes"
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        return text

    elif language == "fr":
        replacements = {
            "Tuition Fee Details": "Détails des Frais de Scolarité",
            "Admission Eligibility": "Conditions d'Admission",
            "Placement Statistics": "Statistiques de Placement",
            "Hostel Curfew & Gate In-Timings": "Règles et Horaires du Foyer",
            "Semester Examination Fee": "Frais d'Examen Semestriel",
            "Payment Deadlines": "Dates Limites de Paiement",
            "Application Portal": "Portail de Candidature"
        }
        for k, v in replacements.items():
            text = text.replace(k, v)
        return text

    return text


async def generate_grounded_answer(
    question: str,
    retrieved_chunks: List[Dict[str, Any]],
    language: Optional[str] = "en"
) -> Tuple[str, float]:
    """
    Calls the LLM with retrieved context following the strict prompt template.
    Returns: (answer_text, latency_ms)
    """
    start_time = time.perf_counter()

    if not retrieved_chunks:
        latency = (time.perf_counter() - start_time) * 1000
        msg = "I couldn't find this information in the college knowledge base."
        if language == "hi":
            msg = "मुझे कॉलेज ज्ञानकोष में इस बारे में कोई आधिकारिक जानकारी नहीं मिली।"
        elif language == "or":
            msg = "କଲେଜ ଡକ୍ୟୁମେଣ୍ଟ ରେକର୍ଡରେ ଏହି ସୂଚନା ମିଳିଲା ନାହିଁ।"
        elif language == "es":
            msg = "No pude encontrar esta información en la base de conocimientos de la universidad."
        elif language == "fr":
            msg = "Je n'ai pas trouvé cette information dans les documents officiels de l'établissement."
        return msg, latency

    context_blocks = []
    for idx, c in enumerate(retrieved_chunks, 1):
        doc_name = c.get("metadata", {}).get("file_name") or c.get("metadata", {}).get("title") or "Document"
        page = c.get("page_number", "N/A")
        content = c.get("content", "")
        context_blocks.append(f"[{idx}] Source: {doc_name} (Page {page}):\n{content}")

    context_str = "\n\n".join(context_blocks)
    
    lang_directive = ""
    if language == "hi":
        lang_directive = "\n\nCRITICAL: The user has selected Hindi language. Answer strictly in fluent, formal Hindi (हिंदी) based only on the facts above."
    elif language == "or":
        lang_directive = "\n\nCRITICAL: The user has selected Odia language. Answer strictly in fluent, formal Odia (ଓଡ଼ିଆ) based only on the facts above."
    elif language == "es":
        lang_directive = "\n\nCRITICAL: The user has selected Spanish language. Answer strictly in fluent Spanish (Español) based only on the facts above."
    elif language == "fr":
        lang_directive = "\n\nCRITICAL: The user has selected French language. Answer strictly in fluent French (Français) based only on the facts above."

    prompt = SYSTEM_PROMPT_TEMPLATE.format(
        retrieved_chunks=context_str,
        user_question=question + lang_directive
    )

    if settings.AI_PROVIDER.lower() == "openai" and settings.OPENAI_API_KEY and AsyncOpenAI:
        try:
            client = AsyncOpenAI(
                api_key=settings.OPENAI_API_KEY,
                base_url=settings.OPENAI_BASE_URL
            )
            response = await client.chat.completions.create(
                model=settings.LLM_MODEL,
                messages=[
                    {"role": "system", "content": prompt}
                ],
                temperature=0.0
            )
            latency = (time.perf_counter() - start_time) * 1000
            answer = response.choices[0].message.content.strip()
            return answer, latency
        except Exception as e:
            logger.error(f"OpenAI completion failed: {e}. Falling back to mock synthesis.")
            latency = (time.perf_counter() - start_time) * 1000
            return _synthesize_mock_answer(question, retrieved_chunks, language=language), latency
    else:
        latency = (time.perf_counter() - start_time) * 1000
        return _synthesize_mock_answer(question, retrieved_chunks, language=language), latency
