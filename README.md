# 🎓 Vibrant AI — RAG-Based College Knowledge Assistant

> An enterprise-grade institutional AI knowledge assistant powered by **Retrieval-Augmented Generation (RAG)** and **MongoDB Atlas Vector Search**. Built to deliver grounded answers from verified college documents with page-level citations and zero hallucinations.

---

## 1. Project Name

**Vibrant AI — College RAG Knowledge Intelligence Assistant (Electric Violet Edition)**

---

## 2. Problem Statement

Navigating university administrative guidelines, tuition fee structures, course syllabi, hostel regulations, and examination calendars is often frustrating for students, faculty, and applicants. Institutional knowledge is typically scattered across dozens of unsearchable PDFs, fragmented department circulars, and static websites.

Traditional conversational bots frequently **hallucinate** or guess answers when asked domain-specific campus questions, leading to misinformation regarding crucial deadlines and fees.

### 💡 Why This Project is Useful
**Vibrant AI** solves this by deploying a strict **Retrieval-Augmented Generation (RAG)** pipeline integrated directly with **MongoDB Atlas Vector Search**:
- **Strict Grounding**: Vectorizes college documents into a 1536-dimensional semantic space and matches user queries using hybrid similarity.
- **Zero Hallucinations**: Enforces a strict similarity threshold (`SIMILARITY_THRESHOLD = 0.70`). If a query is outside institutional knowledge, it safely declines rather than guessing.
- **Page-Level Verifiable Citations**: Every answer provides clickable source cards citing the document name and exact page number.
- **Multi-Document Fact Synthesis**: Extracts facts and key details across multiple files simultaneously.

---

## 3. Features

### 🌟 Core Features
- **Strict RAG Hybrid Retrieval**: Combines dense vector cosine similarity with lexical keyword overlap to query MongoDB Atlas Vector Search indexes.
- **Zero Hallucination Guardrails**: Safe fallback responses for off-topic or low-confidence queries, guaranteeing institutional accuracy.
- **Automated Document Ingestion & Chunking**: Upload **PDF**, **DOCX**, and **TXT** files. The pipeline extracts text with PyMuPDF, cleans headers/footers, creates 800-character chunks with 120-character overlap, and indexes them in MongoDB Atlas.
- **Multi-File Keyword Search & Extraction**: Tokenizes user questions and extracts matching facts, key-value pairs, and bullet points across all uploaded documents.
- **Page-Level Source Citations**: Clickable source badges display document name, page number, and similarity confidence with an interactive **Source Chunk Inspector Modal**.
- **User Feedback Loop**: Upvote/downvote buttons for every assistant message logged to MongoDB for RAG evaluation.
- **Role-Based Authentication**: Secure JWT authentication with `bcrypt` password hashing supporting **Student** and **Administrator** roles.
- **Forgot Password Feature**: Self-service 3-step password reset with 6-digit verification code generation, demo badge, and secure bcrypt password update.
- **Admin Analytics Dashboard**: Real-time metrics on total documents, chunk distribution, query volume, average retrieval confidence, and satisfaction ratings.
- **Document Management**: Administrators can upload, view chunks, reprocess, and delete institutional knowledge files on demand.

### ⚡ Bonus & UX Features
- **Electric Violet Edition UI**: Modern, glassmorphic design built with React 18, Tailwind CSS, Lucide icons, and Google Font **Inter**.
- **Interactive Bento Grid Suggestions**: High-energy welcome screen featuring categorized inquiries (Admissions, Academics, Hostel, Fees) with 1-click execution.
- **Custom Glassmorphic Dropdowns**: Floating language selector (English, Hindi, Odia, Spanish, French) and document status filters with click-outside dismissal.
- **Organized History Grouping**: Sidebar automatically groups past conversations into *"Today"*, *"Yesterday"*, *"Previous 7 Days"*, and *"Older"* with search filtering and deletion.
- **Report Exporting**: Instant CSV analytics export and formatted PDF report downloading with table summaries.
- **Single-Command Full-Stack Runner**: Launch both FastAPI backend and Vite frontend simultaneously via `python run.py`.

---

## 4. Technology Stack

| Layer | Technologies / Libraries Used |
|---|---|
| **Frontend Framework** | React 18 (TypeScript), Vite |
| **Styling & Design** | Tailwind CSS (Electric Violet design tokens, glassmorphism), Lucide React |
| **Typography & UI** | Google Fonts (*Inter*, *JetBrains Mono*), `jspdf`, `jspdf-autotable` |
| **Markdown Rendering** | `react-markdown`, `remark-gfm` |
| **Backend API** | Python 3.12, FastAPI, Uvicorn, Pydantic v2 |
| **Database & Vector Search** | MongoDB Atlas (Cloud Tier), Motor (Async Driver), MongoDB Vector Search (`$vectorSearch`) |
| **Document Processing** | PyMuPDF (`fitz`), `python-docx` |
| **AI / Embeddings** | OpenAI `text-embedding-3-small` / Universal deterministic fallback |
| **AI / Synthesis** | OpenAI `gpt-4o-mini` / Grounded Multi-Document Extraction Engine |
| **Authentication & Security** | JWT (JSON Web Tokens), `python-jose`, `passlib` (`bcrypt`) |
| **Testing & Tooling** | `pytest`, `pytest-asyncio`, `httpx` |

---

## 5. Screenshots

### 1. Main Chat Interface & Bento Grid
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✦ Vibrant AI              How can I help today?                             │
│ ┌──────────────┐   Ask questions about admissions, fees, syllabus, or rules │
│ │ + New Chat   │                                                            │
│ ├──────────────┤   ┌───────────────────────────┬──────────────────────────┐ │
│ │ Active Chat  │   │ 🎓 Admissions & Criteria  │ 💰 Tuition & Fees        │ │
│ │ Admin Vault  │   │ What are B.Tech criteria? │ What is the annual fee?  │ │
│ ├──────────────┤   ├───────────────────────────┼──────────────────────────┤ │
│ │ History      │   │ 🏨 Hostel Guidelines      │ 📅 Academic Calendar     │ │
│ │ • Fees Q&A   │   │ What is the curfew time?  │ When do exams begin?     │ │
│ └──────────────┘   └───────────────────────────┴──────────────────────────┘ │
│                    ┌───────────────────────────────────────────────────┬──┐ │
│                    │ Message Vibrant AI for college information...     │🚀│ │
│                    └───────────────────────────────────────────────────┴──┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Multi-File Grounded Answer & Source Citations
- **Response Card**: Clean structured Markdown with bold entity highlights, section headers, and confidence indicators (`Confidence: 0.99`).
- **Citation Badges**: Clickable pills linking directly to document names and page numbers.
- **Source Inspector Modal**: Displays verbatim chunk text and exact similarity metrics.

### 3. Forgot Password Modal
- 3-step modal with registered email verification, 6-digit code validation, and new password confirmation.

### 4. Admin Analytics & Document Vault
- Real-time KPIs, document table with color-coded status badges (🟢 Ready, 🟡 Processing, 🔴 Failed), chunk viewer, PDF report generator, and CSV exporter.

---

## 6. Live Demo

- **Frontend Deployment (Vercel)**: [https://college-rag-chatbot-frontend.vercel.app](https://college-rag-chatbot-frontend.vercel.app) *(Replace with your live URL)*
- **Demo Credentials**:
  - **Student Account**: `student@college.edu` / `Student@123456`
  - **Admin Account**: `admin@college.edu` / `Admin@123456`

---

## 7. Backend

- **Backend API Deployment**: [https://college-rag-chatbot-backend.onrender.com](https://college-rag-chatbot-backend.onrender.com) *(Replace with your live API URL)*
- **Interactive Swagger Documentation**: `http://localhost:8000/docs` (or `<backend-url>/docs`)
- **ReDoc API Reference**: `http://localhost:8000/redoc`

---

## 8. Setup Instructions

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18+** & `npm`
- **MongoDB Atlas** Account (Free M0 cluster or higher)

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/college-rag-chatbot.git
cd college-rag-chatbot
```

---

### Step 2: Configure Environment Variables

1. **Backend Configuration**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and specify your configuration:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   DATABASE_NAME=college_rag_db
   JWT_SECRET_KEY=your_super_secret_jwt_key_here
   AI_PROVIDER=mock
   OPENAI_API_KEY=
   ```

2. **Frontend Configuration**:
   Create `frontend/.env.local`:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

---

### Step 3: Configure MongoDB Atlas Vector Search Index

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Navigate to **Atlas Search** $\rightarrow$ **Create Search Index** $\rightarrow$ Select **JSON Editor**.
3. Choose Database: `college_rag_db` and Collection: `document_chunks`.
4. Set Index Name: **`vector_index`**.
5. Paste the following index definition:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "document_id"
    }
  ]
}
```
6. Click **Next** and **Create Search Index**.

---

### Step 4: Install Dependencies

1. **Backend Dependencies**:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS/Linux:
   source .venv/bin/activate

   pip install -r backend/requirements.txt
   ```

2. **Frontend Dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

---

### Step 5: Seed Documents & Run Full-Stack

Launch both backend and frontend servers simultaneously using the single command runner:
```bash
python run.py
```

- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 6: Run Automated Tests
```bash
python -m pytest backend/tests -v
```

---

## 9. Environment Variables

> ⚠️ **Important Security Notice**: Never commit actual API keys, passwords, or secrets to version control. Use `.env.example` as a template and ensure `.env` and `.env.local` are added to `.gitignore`.

### Backend Environment Variables (`backend/.env`)

| Variable Name | Required | Default Value | Description |
|---|---|---|---|
| `PROJECT_NAME` | No | `RAG-Based College Chatbot` | Application display name |
| `API_V1_STR` | No | `/api` | Base path prefix for API routes |
| `MONGODB_URI` | **Yes** | `mongodb://localhost:27017` | MongoDB / MongoDB Atlas connection URI |
| `DATABASE_NAME` | **Yes** | `college_rag_db` | Name of the MongoDB database |
| `JWT_SECRET_KEY` | **Yes** | — | Secret cryptographic key for signing JWT tokens |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `10080` (7 days) | Token validity duration in minutes |
| `AI_PROVIDER` | No | `mock` | AI provider (`openai` or `mock`) |
| `OPENAI_API_KEY` | Conditional | — | Required when `AI_PROVIDER=openai` |
| `LLM_MODEL` | No | `gpt-4o-mini` | OpenAI chat model name |
| `EMBEDDING_MODEL` | No | `text-embedding-3-small` | OpenAI embedding model name |
| `EMBEDDING_DIMENSION` | No | `1536` | Embedding vector dimensionality |
| `SIMILARITY_THRESHOLD` | No | `0.70` | Cosine similarity threshold for RAG grounding |
| `TOP_K` | No | `5` | Number of context chunks retrieved per query |
| `CHUNK_SIZE` | No | `800` | Target character size for text chunks |
| `CHUNK_OVERLAP` | No | `120` | Character overlap between consecutive chunks |
| `UPLOAD_DIR` | No | `uploads` | Directory for stored uploaded documents |
| `MAX_FILE_SIZE_MB` | No | `20` | Maximum file size in MB for uploads |

### Frontend Environment Variables (`frontend/.env.local`)

| Variable Name | Required | Default Value | Description |
|---|---|---|---|
| `VITE_API_URL` | **Yes** | `http://localhost:8000/api` | Base URL of the FastAPI backend service |

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
