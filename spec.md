# RAG-Based College Chatbot
**Specification-Driven Development Document**

## 1. Project Overview

Build an AI-powered college information assistant that answers student questions using **Retrieval-Augmented Generation (RAG)**.

The system must retrieve relevant information from approved college documents before generating an answer. Answers must be grounded in the retrieved knowledge base and must display the source document used.

**Primary persona:** College student seeking accurate information about academics, administration, campus services, and college activities.

**Secondary persona:** College administrator who manages the chatbot knowledge base.

### Core Principle

> No relevant retrieved information → do not invent an answer.

The application must clearly state when information is unavailable.

---

# 2. Objectives

The system must:

1. Allow students to ask college-related questions.
2. Authenticate users.
3. Allow administrators to upload college documents.
4. Extract text from documents.
5. Split documents into meaningful chunks.
6. Generate embeddings for chunks.
7. Store embeddings in a vector database.
8. Perform semantic similarity search.
9. Retrieve relevant chunks for each question.
10. Send retrieved context to an LLM.
11. Generate grounded answers.
12. Display document/source references.
13. Maintain conversation history.
14. Handle unknown questions safely.
15. Provide a functional admin document-management interface.
16. Work locally without requiring unavailable external services.
17. Be deployable as a production web application.

---

# 3. Locked Technology Stack

The implementation must use the following stack unless a requirement explicitly makes a replacement necessary.

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React
- React Router

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn

### Database

- PostgreSQL
- pgvector extension

### Authentication

- Supabase Auth

### File Storage

- Supabase Storage

### AI

- Embedding model: configurable through environment variable
- LLM: configurable through environment variable
- Default development provider: OpenAI-compatible API

### Document Processing

- PyMuPDF for PDF extraction
- python-docx for DOCX extraction

### Deployment

Frontend and backend must be independently deployable.

Recommended:

- Frontend → Vercel
- Backend → Render/Railway
- Database/Auth/Storage → Supabase

---

# 4. Architecture

```text
                    ┌──────────────────────┐
                    │    College Admin     │
                    └──────────┬───────────┘
                               │
                         Upload Document
                               │
                               ▼
                    ┌──────────────────────┐
                    │    File Storage      │
                    │  Supabase Storage    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Document Processor   │
                    │ Extract + Clean Text │
                    └──────────┬───────────┘
                               │
                            Chunking
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Embedding Generator  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ PostgreSQL + pgvector│
                    │   Vector Database    │
                    └──────────┬───────────┘
                               │
                        Similarity Search
                               ▲
                               │
┌───────────────┐       ┌──────┴─────────┐
│    Student    │──────►│ RAG API         │
│ Chat Interface│      │                 │
└───────────────┘       └──────┬─────────┘
                               │
                         Retrieved Context
                               │
                               ▼
                       ┌───────────────┐
                       │      LLM      │
                       └───────┬───────┘
                               │
                               ▼
                       Grounded Answer
                               │
                               ▼
                     Answer + Citations
```

---

# 5. User Roles

## 5.1 Student

Student can:

- Register/login
- Ask questions
- View answers
- View sources
- Continue conversations
- View chat history
- Delete conversations
- Give 👍/👎 feedback
- Use suggested questions

Student cannot:

- Upload documents
- Delete documents
- Modify knowledge-base content
- Access admin APIs

## 5.2 Admin

Admin can:

- Login
- Upload documents
- View documents
- Delete documents
- Replace documents
- View processing status
- View document metadata
- View chunk count
- View indexing status
- View basic chatbot analytics

---

# 6. Functional Requirements

## FR-01 Authentication

The system must support:

- Student registration
- Student login
- Admin login
- Logout
- Session persistence
- Protected routes
- Role-based authorization

Authentication must be handled by Supabase Auth.

Backend must validate authenticated user identity before protected operations.

---

# 7. Document Management

## FR-02 Upload

Admin must be able to upload:

- PDF
- DOCX
- TXT

Maximum file size must be configurable.

Example:

```env
MAX_FILE_SIZE_MB=20
```

Upload flow:

```text
Upload
→ Validate file
→ Store original file
→ Create document record
→ Extract text
→ Clean text
→ Chunk text
→ Generate embeddings
→ Store chunks
→ Mark document READY
```

---

# 8. Document Status

Every document must have one of:

```text
UPLOADED
PROCESSING
READY
FAILED
DELETED
```

Processing errors must be stored so administrators can understand why indexing failed.

---

# 9. Document Processing

## FR-03 Text Extraction

PDF:

```text
PyMuPDF
```

DOCX:

```text
python-docx
```

TXT:

```text
UTF-8 text reader
```

Extraction must preserve useful structural information such as:

- Page number
- Heading
- Section
- Document name

For PDFs, page number must be stored with every chunk where available.

---

# 10. Chunking

Default configuration:

```env
CHUNK_SIZE=800
CHUNK_OVERLAP=120
```

Chunking must:

- Avoid excessively large chunks.
- Preserve sentence boundaries where possible.
- Preserve headings.
- Preserve page metadata.
- Generate stable chunk identifiers.

Each chunk must contain:

```text
chunk_id
document_id
content
page_number
chunk_index
embedding
metadata
```

---

# 11. Embeddings

Every searchable chunk must have an embedding.

Embedding model must be configurable:

```env
EMBEDDING_MODEL=...
```

Embedding generation failure must mark the document as `FAILED`.

The system must never mark a document `READY` if its chunks have not been successfully embedded.

---

# 12. Vector Database

PostgreSQL with `pgvector` is mandatory.

The database must support:

```text
vector similarity search
```

Similarity search must return:

```text
chunk content
document
page
similarity score
metadata
```

Default retrieval count:

```env
TOP_K=5
```

---

# 13. RAG Pipeline

This is the core requirement.

The complete pipeline must be:

```text
User Question
      ↓
Question Validation
      ↓
Question Embedding
      ↓
Vector Similarity Search
      ↓
Top-K Relevant Chunks
      ↓
Relevance Threshold
      ↓
Context Construction
      ↓
LLM Prompt
      ↓
Generated Answer
      ↓
Source References
      ↓
Student
```

A normal LLM chatbot without this retrieval pipeline does **not** satisfy this specification.

---

# 14. Retrieval Threshold

The backend must use a configurable similarity threshold.

```env
SIMILARITY_THRESHOLD=0.70
```

The value must be configurable because different embedding models can produce different score distributions.

If no retrieved result satisfies the threshold:

```text
No relevant information was found in the college knowledge base.
```

The LLM must not be called for an unsupported question unless explicitly configured otherwise.

---

# 15. LLM Prompt Contract

The LLM must receive:

```text
SYSTEM:
You are a college information assistant.

Answer only using the supplied college knowledge-base context.

If the context does not contain enough information, say that the information is unavailable.

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
{user_question}
```

The model must be instructed to prioritize factual grounding over conversational creativity.

---

# 16. Answer Contract

Backend response:

```json
{
  "answer": "string",
  "sources": [
    {
      "document_id": "uuid",
      "document_name": "string",
      "page_number": 3,
      "relevance_score": 0.89
    }
  ],
  "confidence": 0.89,
  "grounded": true
}
```

If information is unavailable:

```json
{
  "answer": "I couldn't find this information in the college knowledge base.",
  "sources": [],
  "confidence": 0,
  "grounded": false
}
```

---

# 17. Source Display

Every grounded answer must show its sources.

Example:

```text
Answer:
Students can apply for hostel accommodation through...

Sources:
📄 Hostel Guidelines.pdf — Page 4
📄 Student Handbook.pdf — Page 22
```

Clicking a source should display available document metadata.

Source references must never be fabricated.

---

# 18. Chat Interface

Student UI must contain:

### Header

- College logo/name
- User profile
- Logout

### Sidebar

- New Chat
- Chat history
- Search conversations

### Main Area

- Welcome message
- Suggested questions
- User messages
- AI responses
- Sources
- Feedback buttons

### Input

- Text input
- Send button
- Loading state
- Error state

---

# 19. Suggested Questions

Initial examples:

```text
What are admission requirements?

What courses are offered by CSE?

What is the examination fee?

When does the semester start?

What scholarships are available?

What are hostel rules?

Where is the central library?

What is the placement process?
```

Suggestions should be configurable.

---

# 20. Conversation History

Database must store:

```text
conversation
message
role
content
created_at
```

Roles:

```text
user
assistant
```

Each assistant message may additionally store:

```text
retrieved_chunks
sources
confidence
```

Students can only access their own conversations.

---

# 21. API Contracts

Base URL:

```text
/api
```

## Authentication

Authentication itself is handled by Supabase.

Backend endpoints:

```http
GET /api/auth/me
```

Returns:

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "student"
}
```

---

# 22. Chat API

```http
POST /api/chat
```

Request:

```json
{
  "conversation_id": "uuid",
  "message": "What is the hostel fee?"
}
```

Response:

```json
{
  "conversation_id": "uuid",
  "message_id": "uuid",
  "answer": "string",
  "sources": [],
  "confidence": 0.87,
  "grounded": true
}
```

Backend responsibilities:

1. Authenticate user.
2. Save user message.
3. Generate query embedding.
4. Search pgvector.
5. Apply threshold.
6. Build context.
7. Call LLM.
8. Save answer.
9. Return answer + sources.

---

# 23. Conversation APIs

```http
GET /api/conversations
POST /api/conversations
GET /api/conversations/{conversation_id}
DELETE /api/conversations/{conversation_id}
```

Authorization requirement:

Users can only access their own conversations.

---

# 24. Admin Document APIs

```http
POST /api/admin/documents
GET /api/admin/documents
GET /api/admin/documents/{document_id}
DELETE /api/admin/documents/{document_id}
POST /api/admin/documents/{document_id}/reprocess
```

All endpoints require:

```text
authenticated user
AND
role = admin
```

---

# 25. Feedback API

```http
POST /api/messages/{message_id}/feedback
```

Request:

```json
{
  "feedback": "positive"
}
```

Allowed values:

```text
positive
negative
```

---

# 26. Database Schema

## profiles

```text
id UUID PRIMARY KEY
full_name TEXT
role TEXT
created_at TIMESTAMPTZ
```

Allowed roles:

```text
student
admin
```

## documents

```text
id UUID PRIMARY KEY
title TEXT
file_name TEXT
file_type TEXT
storage_path TEXT
status TEXT
error_message TEXT
uploaded_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## document_chunks

```text
id UUID PRIMARY KEY
document_id UUID
chunk_index INTEGER
content TEXT
page_number INTEGER
embedding VECTOR
metadata JSONB
created_at TIMESTAMPTZ
```

## conversations

```text
id UUID PRIMARY KEY
user_id UUID
title TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

## messages

```text
id UUID PRIMARY KEY
conversation_id UUID
role TEXT
content TEXT
sources JSONB
confidence FLOAT
grounded BOOLEAN
created_at TIMESTAMPTZ
```

## feedback

```text
id UUID PRIMARY KEY
message_id UUID
user_id UUID
feedback TEXT
created_at TIMESTAMPTZ
```

---

# 27. Security Requirements

The system must implement:

- Supabase authentication
- JWT validation
- Role-based authorization
- Row Level Security
- Admin-only document APIs
- User-owned conversation access
- File-type validation
- File-size validation
- Server-side input validation
- API error handling
- Secrets stored only in environment variables

Never expose:

```text
LLM API keys
Supabase service-role key
embedding provider secrets
```

to the frontend.

---

# 28. RLS Requirements

Students:

```text
SELECT own conversations
SELECT own messages
INSERT own conversations
INSERT own messages
```

Admins:

```text
Manage documents
Manage document chunks
View analytics
```

Document storage must prevent unauthorized users from modifying files.

---

# 29. Frontend Routes

```text
/login
/register
/chat
/chat/:conversationId
/profile
/admin
/admin/documents
/admin/documents/:id
```

Protected routes must redirect unauthenticated users to `/login`.

Student attempting to access `/admin` must receive:

```text
403 Forbidden
```

or be redirected to `/chat`.

---

# 30. Admin Dashboard

Dashboard must display:

```text
Total Documents
Ready Documents
Processing Documents
Failed Documents
Total Questions
Average Confidence
Positive Feedback
Negative Feedback
```

Document table:

```text
Document
Type
Status
Chunks
Uploaded Date
Uploaded By
Actions
```

Actions:

```text
View
Reprocess
Delete
```

---

# 31. Error Handling

Frontend must show user-friendly messages.

Example:

```text
Network error:
Unable to connect to chatbot server.
```

```text
Document processing:
Document could not be processed. Check file format or try again.
```

```text
AI service:
AI service is temporarily unavailable.
```

Backend must log technical errors while returning safe messages to users.

---

# 32. Local Development Fallback

The application must remain runnable if external AI services are unavailable.

Environment:

```env
AI_PROVIDER=mock
```

Mock mode must:

- Generate deterministic fake embeddings.
- Return deterministic test responses.
- Allow document processing.
- Allow vector-search development.
- Allow frontend/backend integration testing.

This fallback must **not** bypass the RAG architecture.

The mock system must still execute:

```text
Question
→ Embedding
→ Vector Search
→ Context Retrieval
→ Answer Generation
```

---

# 33. Configuration

Example `.env`:

```env
DATABASE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER=openai
LLM_MODEL=
EMBEDDING_MODEL=
OPENAI_API_KEY=

CHUNK_SIZE=800
CHUNK_OVERLAP=120
TOP_K=5
SIMILARITY_THRESHOLD=0.70

MAX_FILE_SIZE_MB=20
```

Secrets must never be committed to Git.

---

# 34. Observability

Backend must log:

```text
request_id
user_id
question
retrieval_count
retrieval_scores
LLM latency
total latency
error
```

Do not log sensitive authentication tokens.

---

# 35. Performance Requirements

Target:

```text
API response: < 5 seconds
```

under normal development/production conditions.

Document processing may be asynchronous.

For large documents:

```text
Upload
→ PROCESSING
→ Background indexing
→ READY
```

The user must not need to keep the upload page open.

---

# 36. Bonus Features

After all core requirements work, implement:

### Phase 2

- Department-wise collections
- Hybrid keyword + vector search
- Re-ranking
- Multilingual support
- Streaming answers
- Voice input
- Suggested questions
- Conversation export

### Phase 3

- OCR for scanned PDFs
- Automatic document summarization
- Automatic FAQ generation
- Document versioning
- Source highlighting
- Confidence visualization
- Admin analytics
- Advanced feedback analysis

---

# 37. Multilingual Requirement

If enabled, the chatbot should support:

```text
English
Hindi
Odia
```

The RAG architecture must remain unchanged:

```text
Question
→ multilingual embedding
→ vector search
→ retrieved context
→ multilingual answer
```

---

# 38. Document Versioning

Future document versions must not destroy historical information immediately.

Example:

```text
Academic Calendar 2026.pdf
Version 1
Version 2
```

Only the active version should normally participate in retrieval.

---

# 39. Unknown Question Strategy

Questions outside the knowledge base must receive a controlled response.

Example:

> I couldn't find reliable information about this in the college knowledge base. Please contact the relevant college department for confirmation.

The model must never fill missing information using general knowledge when `grounded=true` is required.

---

# 40. RAG Quality Requirements

The implementation must support evaluation using a test dataset.

Example:

```text
Question
Expected Source
Expected Answer
Retrieved Source
Similarity Score
Grounded
```

Minimum evaluation categories:

- Admissions
- Fees
- Courses
- Exams
- Hostel
- Library
- Scholarships
- Placements
- Policies
- Academic calendar

---

# 41. Acceptance Criteria

The project is considered complete only when all are true:

- [ ] Student authentication works.
- [ ] Admin authentication works.
- [ ] Admin can upload PDF.
- [ ] Admin can upload DOCX/TXT.
- [ ] Document text is extracted.
- [ ] Text is chunked.
- [ ] Embeddings are generated.
- [ ] Embeddings are stored in pgvector.
- [ ] User questions are embedded.
- [ ] Vector similarity search works.
- [ ] Relevant chunks are retrieved.
- [ ] Similarity threshold works.
- [ ] Retrieved context reaches LLM.
- [ ] Generated answer is grounded in context.
- [ ] Sources are displayed.
- [ ] Unknown questions are handled.
- [ ] Chat history works.
- [ ] Admin can delete documents.
- [ ] Admin can reprocess documents.
- [ ] RLS/security works.
- [ ] Frontend/backend integration works.
- [ ] Mock AI mode works locally.
- [ ] Production AI mode works.
- [ ] Application is deployed.
- [ ] End-to-end RAG test passes.

---

# 42. Definition of Done

A feature is **Done** only when:

```text
Frontend
    ↓
API
    ↓
Database
    ↓
Business Logic
    ↓
RAG Pipeline
    ↓
AI
    ↓
Response
```

works end-to-end.

A UI that only looks complete does not count.

A chatbot that only calls an LLM does not count.

A document uploader without embeddings does not count.

A vector database without retrieval integration does not count.

The final system must demonstrate the complete chain:

```text
College Document
      ↓
Text Extraction
      ↓
Chunking
      ↓
Embedding
      ↓
pgvector
      ↓
Semantic Search
      ↓
Relevant Context
      ↓
LLM
      ↓
Grounded Answer
      ↓
Source
```

# 43. Development Priority

Implementation order must be:

```text
1. Project structure
2. Database + pgvector
3. Authentication
4. Document upload
5. Document processing
6. Chunking
7. Embeddings
8. Vector search
9. RAG API
10. Chat UI
11. Source display
12. Chat history
13. Admin dashboard
14. Security/RLS
15. Error handling
16. Mock fallback
17. Testing
18. Deployment
19. Bonus features
```

No bonus feature should be started until the complete core RAG pipeline is working.