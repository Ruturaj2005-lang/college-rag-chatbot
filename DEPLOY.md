# 🚀 Vibrant AI — Complete End-to-End Deployment Guide

> **Vibrant AI (RAG-Based College Inquiry Chatbot)**  
> Comprehensive, step-by-step guide for deploying both the FastAPI backend, MongoDB Atlas database, and React 18 + Vite frontend from scratch to production.

---

## 📋 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Accounts](#2-prerequisites--accounts)
3. [Step 1: Local Code Check & GitHub Setup](#step-1-local-code-check--github-setup)
4. [Step 2: MongoDB Atlas Database Setup & Vector Index](#step-2-mongodb-atlas-database-setup--vector-index)
5. [Step 3: Database Seeding (Users & College Knowledge Base)](#step-3-database-seeding-users--college-knowledge-base)
6. [Step 4: Deploying Backend to Render](#step-4-deploying-backend-to-render)
7. [Step 5: Setup 24/7 Keep-Alive (Zero Cold Starts)](#step-5-setup-247-keep-alive-zero-cold-starts)
8. [Step 6: Deploying Frontend to Vercel](#step-6-deploying-frontend-to-vercel)
9. [Step 7: Alternative Deployment — Docker Compose (VPS / AWS / DigitalOcean)](#step-7-alternative-deployment--docker-compose-vps--aws--digitalocean)
10. [Step 8: Full Post-Deployment Verification Checklist](#step-8-full-post-deployment-verification-checklist)
11. [Step 9: Environment Variable Reference Matrix](#step-9-environment-variable-reference-matrix)
12. [Step 10: Troubleshooting & Common Pitfalls](#step-10-troubleshooting--common-pitfalls)

---

## 1. Architecture Overview

```text
                                 ┌────────────────────────┐
                                 │   Student / Admin      │
                                 │       Browser          │
                                 └──────────┬─────────────┘
                                            │
                                            ▼
                       ┌────────────────────────────────────────┐
                       │           VERCEL (Frontend)            │
                       │          React 18 + Vite SPA           │
                       │ https://college-rag-frontend.vercel.app│
                       └────────────────────┬───────────────────┘
                                            │ HTTPS API Calls (VITE_API_URL)
                                            ▼
                       ┌────────────────────────────────────────┐
                       │           RENDER (Backend)             │
                       │       FastAPI + Python 3.12            │
                       │https://college-rag-backend.onrender.com│
                       └──────────┬───────────────────┬─────────┘
                                  │                   │
                     Async Motor  │                   │ Vector Search / Queries
                                  ▼                   ▼
    ┌───────────────────────────────────┐       ┌───────────────────────────────────┐
    │       OpenAI API (Optional)       │       │       MongoDB Atlas (M0/M10)      │
    │  text-embedding-3-small & GPT-4o  │       │  DB: college_rag_db               │
    │  (Or built-in high-speed TF-IDF)  │       │  Index: vector_index (1536 dims)  │
    └───────────────────────────────────┘       └───────────────────────────────────┘
```

---

## 2. Prerequisites & Accounts

Before starting, create free accounts on these platforms (all offer 100% free tiers):

| Platform | Purpose | Free Tier Limit | Link |
|---|---|---|---|
| **GitHub** | Code repository & CI/CD trigger | Unlimited public/private repos | [github.com](https://github.com) |
| **MongoDB Atlas** | Database & Vector Search Store | 512 MB Free M0 Cluster | [cloud.mongodb.com](https://cloud.mongodb.com) |
| **Render** | Backend FastAPI Web Service | Free Web Service (512 MB RAM) | [render.com](https://render.com) |
| **Vercel** | Frontend React/Vite Hosting | Unlimited Free Deployments | [vercel.com](https://vercel.com) |
| **cron-job.org** | 24/7 Keep-alive ping monitor | Unlimited free cronjobs | [cron-job.org](https://cron-job.org) |

---

## Step 1: Local Code Check & GitHub Setup

### 1.1 Verify Local Tests & Build
Open terminal in your project root (`d:\Chatbot`) and run:

```bash
# 1. Test Backend
pytest backend/tests

# 2. Test Frontend Typecheck & Build
cd frontend
npm run build
cd ..
```
*Make sure both commands complete with zero errors.*

### 1.2 Push Code to GitHub
1. Create a new GitHub repository named `college-rag-chatbot` at [github.com/new](https://github.com/new).
2. Initialize and push your project:

```bash
# Initialize git in root folder
git init

# Stage all files (.env and node_modules are ignored automatically via .gitignore)
git add .

# Create initial commit
git commit -m "feat: complete production-ready college rag chatbot"

# Rename branch to main
git branch -M main

# Link to your GitHub repository
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/college-rag-chatbot.git

# Push to GitHub
git push -u origin main
```

---

## Step 2: MongoDB Atlas Database Setup & Vector Index

### 2.1 Create Free M0 Cluster
1. Sign in to [MongoDB Atlas](https://cloud.mongodb.com).
2. Click **Create** $\rightarrow$ Select **M0 (Free)**.
3. Choose Cloud Provider (**AWS**) and a region close to your users (e.g., `us-east-1` or `eu-central-1` or `ap-south-1`).
4. Click **Create Deployment**.

### 2.2 Create Database User
1. In the left sidebar under **Security**, click **Database Access**.
2. Click **Add New Database User**.
3. **Authentication Method**: Password.
4. **Username**: `college_admin` (or your choice).
5. **Password**: Generate a secure password (save this for later).
6. **Built-in Role**: Select `Atlas Admin` or `Read and write to any database`.
7. Click **Add User**.

### 2.3 Whitelist Network IP (Allow Render to Connect)
1. In the left sidebar under **Security**, click **Network Access**.
2. Click **Add IP Address**.
3. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`).
4. Click **Confirm**.

### 2.4 Get Connection String
1. In the left sidebar under **Deployment**, click **Database**.
2. Click the **Connect** button on your cluster.
3. Select **Drivers** $\rightarrow$ **Python** (version 3.12 or latest).
4. Copy the connection URI:
   ```text
   mongodb+srv://college_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
   *(Replace `<password>` with your actual database user password).*

### 2.5 Create Vector Search Index
1. In MongoDB Atlas, click on your Cluster $\rightarrow$ **Atlas Search** (or **Search / Vector Search** tab).
2. Click **Create Search Index** $\rightarrow$ Choose **JSON Editor**.
3. Select Database: **`college_rag_db`** (or create it) and Collection: **`document_chunks`**.
4. Set Index Name to: **`vector_index`** *(Exact name required)*.
5. Paste the following JSON definition:
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
6. Click **Next** $\rightarrow$ Click **Create Search Index**.
7. Wait 1–2 minutes until the index status displays **Active / Ready**.

---

## Step 3: Database Seeding (Users & College Knowledge Base)

Run the automated seeder to initialize default admin and student accounts along with default institutional documents into MongoDB Atlas:

```bash
# In d:\Chatbot\backend
cd backend

# Temporarily set your live MongoDB URI
set MONGODB_URI=mongodb+srv://college_admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
set DATABASE_NAME=college_rag_db

# Run seeder
python seed_data.py
```

Expected output:
```text
============================================================
Seeding RAG-Based College Chatbot Knowledge Base & Users
============================================================
[+] Created user: admin@college.edu (admin)
[+] Created user: student@college.edu (student)
  -> Indexed: college_faqs.txt (12 chunks, READY)
  -> Indexed: fee_structure_2026.txt (8 chunks, READY)
  -> Indexed: hostel_rules.txt (10 chunks, READY)
  -> Indexed: academic_calendar_2026.txt (6 chunks, READY)
============================================================
Database seeding completed successfully!
```

---

## Step 4: Deploying Backend to Render

### 4.1 Create Web Service on Render
1. Log in to [Render](https://render.com).
2. Click **New +** (top right) $\rightarrow$ Select **Web Service**.
3. Under *Connect a repository*, choose your GitHub repo: `college-rag-chatbot`.

### 4.2 Configure Build & Runtime Settings
Configure the following fields:

| Field | Value |
|---|---|
| **Name** | `college-rag-chatbot-backend` |
| **Region** | Closest to your database (e.g. *Oregon (US West)* or *Frankfurt (EU)*) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` |

> ⚠️ **Critical**: The start command must bind to `0.0.0.0` and use `$PORT` so Render can route HTTP traffic properly.

### 4.3 Configure Backend Environment Variables
Scroll down to **Environment Variables** in Render and click **Add Environment Variable** for each:

| Key | Value | Description |
|---|---|---|
| `PYTHON_VERSION` | `3.12.1` | Sets Python runtime |
| `MONGODB_URI` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| `DATABASE_NAME` | `college_rag_db` | MongoDB Database Name |
| `JWT_SECRET_KEY` | *(Click 'Generate' or enter 32+ char secret)* | Auth token signing |
| `AI_PROVIDER` | `mock` *(or `openai`)* | Embedding & generation provider |
| `OPENAI_API_KEY` | *(Optional - only if AI_PROVIDER=openai)* | OpenAI Secret Key |
| `SIMILARITY_THRESHOLD` | `0.70` | Grounding confidence threshold |
| `TOP_K` | `5` | Retrieved context chunks count |
| `UPLOAD_DIR` | `uploads` | Uploaded document storage |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

### 4.4 Deploy & Test
1. Click **Create Web Service**.
2. Render will build and deploy your container in ~2 minutes.
3. Once deployed, note down your Render public backend URL, e.g.:  
   `https://college-rag-chatbot-backend.onrender.com`
4. Test the health endpoint in your browser:  
   `https://college-rag-chatbot-backend.onrender.com/health`  
   *(Expected response: `{"status":"healthy","database":"MongoDB Atlas", ...}`)*
5. View interactive API documentation:  
   `https://college-rag-chatbot-backend.onrender.com/docs`

---

## Step 5: Setup 24/7 Keep-Alive (Zero Cold Starts)

Render free tier instances sleep after 15 minutes of inactivity. To keep your backend **100% warm with instantaneous responses**:

1. Go to [cron-job.org](https://cron-job.org) and create a free account.
2. Click **Create Cronjob**.
3. **Title**: `College Chatbot Backend Ping`
4. **Address (URL)**: `https://<YOUR-RENDER-BACKEND-URL>/health`
5. **Schedule**: Set execution schedule to **Every 10 minutes** (`*/10 * * * *`).
6. Click **Create**.

*(Your backend will now stay awake 24/7).*

---

## Step 6: Deploying Frontend to Vercel

### 6.1 Import Repository in Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Find your `college-rag-chatbot` repository and click **Import**.

### 6.2 Configure Project Settings
In the configuration screen:

1. **Framework Preset**: `Vite`
2. **Root Directory**: Click **Edit** $\rightarrow$ Select `frontend` $\rightarrow$ Click **Continue**.
3. **Build & Development Settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### 6.3 Add Frontend Environment Variable
Expand the **Environment Variables** section:

| Key | Value | Example |
|---|---|---|
| `VITE_API_URL` | `https://<YOUR-RENDER-BACKEND-URL>/api` | `https://college-rag-chatbot-backend.onrender.com/api` |

> ⚠️ **Notice**: Ensure `/api` is included at the end of `VITE_API_URL`.

### 6.4 Deploy
1. Click **Deploy**.
2. Vercel will build the frontend and issue your live URL in ~45 seconds:  
   `https://college-rag-chatbot-frontend.vercel.app`
3. Click your live domain to access the application!

---

## Step 7: Alternative Deployment — Docker Compose (VPS / AWS / DigitalOcean)

If you prefer hosting both frontend, backend, and MongoDB on a single Linux VPS (e.g., Ubuntu 22.04 on AWS EC2, DigitalOcean, or Linode):

### 7.1 SSH into your Server & Install Docker
```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker & Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install -y docker-compose-plugin
```

### 7.2 Clone Repository & Configure Environment
```bash
git clone https://github.com/<YOUR-GITHUB-USERNAME>/college-rag-chatbot.git
cd college-rag-chatbot

# Create production .env file
nano .env
```

Add your production variables to `.env`:
```env
MONGODB_URI=mongodb://mongodb:27017
DATABASE_NAME=college_rag_db
JWT_SECRET_KEY=your-secure-random-jwt-key
AI_PROVIDER=mock
OPENAI_API_KEY=
SIMILARITY_THRESHOLD=0.70
TOP_K=5
```

### 7.3 Start Multi-Container Stack
```bash
# Build and run containers in background
docker compose up -d --build

# Verify all 3 containers are healthy (frontend, backend, mongodb)
docker compose ps
```

### 7.4 Setup Nginx Reverse Proxy with Free SSL (Let's Encrypt)
```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Configure Nginx site
sudo nano /etc/nginx/sites-available/chatbot.conf
```

Add configuration:
```nginx
server {
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and secure with SSL:
```bash
sudo ln -s /etc/nginx/sites-available/chatbot.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Obtain free HTTPS certificate
sudo certbot --nginx -d yourdomain.com
```

---

## Step 8: Full Post-Deployment Verification Checklist

Execute this verification sequence on your live production Vercel URL:

| Test Case | Steps to Execute | Expected Outcome | Status |
|---|---|---|---|
| **1. Student Login** | Navigate to `/login` $\rightarrow$ Enter `student@college.edu` / `Student@123456` | Dashboard opens, JWT stored in `localStorage`, user name displayed. | `[ ]` |
| **2. Forgot Password Flow** | Click *"Forgot Password?"* $\rightarrow$ Enter email $\rightarrow$ Enter displayed reset code $\rightarrow$ Enter new password | Password updated, redirects to login with success alert. | `[ ]` |
| **3. RAG Grounded Query** | Ask *"What are the hostel rules?"* or *"What is the B.Tech fee?"* | Grounded answer returned with **High Confidence** badge and citations. | `[ ]` |
| **4. Citation Inspection** | Click any Citation pill in a chat response | Drawer/Modal opens showing the exact chunk text, page number, and source file. | `[ ]` |
| **5. Fallback Guardrail** | Ask an ungrounded question (*"Who won the 1994 football world cup?"*) | Safe fallback message returned: *"I do not have verified college records for this topic."* | `[ ]` |
| **6. Multilingual Mode** | Change language dropdown to Hindi or Spanish $\rightarrow$ Ask question | Responses rendered accurately in selected language. | `[ ]` |
| **7. Admin Portal** | Login as `admin@college.edu` / `Admin@123456` $\rightarrow$ Go to `/admin` | Admin dashboard shows system analytics, total queries, uploaded documents. | `[ ]` |
| **8. Document Ingestion** | Upload a new PDF/DOCX file in Admin Vault | File uploads, status changes from `PROCESSING` to `READY`, chunk count updates. | `[ ]` |
| **9. Analytics Export** | Click **Export CSV Report** and **Generate PDF Report** in Admin Dashboard | Downloads valid CSV and PDF files without error. | `[ ]` |
| **10. DevTools Check** | Open Browser Console (`F12`) $\rightarrow$ Navigate pages | Zero CORS errors, zero unhandled promise rejections. | `[ ]` |

---

## Step 9: Environment Variable Reference Matrix

### Backend Variables (`backend/.env` / Render Settings)

| Variable | Type | Default | Production Recommendation | Description |
|---|---|---|---|---|
| `MONGODB_URI` | `string` | `mongodb://localhost:27017` | `mongodb+srv://...` | MongoDB Atlas cluster connection string |
| `DATABASE_NAME` | `string` | `college_rag_db` | `college_rag_db` | MongoDB Database identifier |
| `JWT_SECRET_KEY` | `string` | `dev-secret...` | *Strong 32+ char key* | Secret key for JWT HS256 signatures |
| `JWT_ALGORITHM` | `string` | `HS256` | `HS256` | Token encryption algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `int` | `1440` | `1440` | Token expiration time (1440 = 24 hours) |
| `AI_PROVIDER` | `string` | `mock` | `openai` or `mock` | `mock` for zero-cost RAG, `openai` for LLM |
| `OPENAI_API_KEY` | `string` | `""` | `sk-proj-...` | OpenAI API key (if `AI_PROVIDER=openai`) |
| `EMBEDDING_MODEL` | `string` | `text-embedding-3-small`| `text-embedding-3-small` | 1536-dim embedding model |
| `CHAT_MODEL` | `string` | `gpt-4o-mini` | `gpt-4o-mini` | Generation LLM model |
| `SIMILARITY_THRESHOLD`| `float` | `0.70` | `0.70` | Minimum cosine similarity for RAG answer |
| `TOP_K` | `int` | `5` | `5` | Number of context chunks retrieved |
| `CHUNK_SIZE` | `int` | `800` | `800` | Token/Character chunk size |
| `CHUNK_OVERLAP` | `int` | `120` | `120` | Character overlap between chunks |
| `UPLOAD_DIR` | `string` | `uploads` | `uploads` | Relative path to local document storage |
| `CORS_ORIGINS` | `string` | `*` | `*` or Vercel URL | Allowed origins for API requests |

### Frontend Variables (`frontend/.env` / Vercel Settings)

| Variable | Type | Production Example | Description |
|---|---|---|---|
| `VITE_API_URL` | `string` | `https://college-rag-chatbot-backend.onrender.com/api` | Full URL to backend `/api` prefix |

---

## Step 10: Troubleshooting & Common Pitfalls

### 1. `Property 'env' does not exist on type 'ImportMeta'` during Build
- **Cause**: Missing Vite client type declarations.
- **Fix**: Verify `frontend/src/vite-env.d.ts` exists and contains `/// <reference types="vite/client" />`.

### 2. CORS Errors in Browser (`Access to fetch has been blocked by CORS policy`)
- **Cause**: Backend CORS configuration missing or mismatching protocol/domain.
- **Fix**: Ensure `CORS_ORIGINS` is set to `*` in Render environment variables, or includes your exact Vercel frontend URL `https://your-frontend.vercel.app`.

### 3. `404 Not Found` when Refreshing Routes on Vercel
- **Cause**: React Router SPA client-side routes need server rewrite rules.
- **Fix**: Verify `frontend/vercel.json` exists in your repository with:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

### 4. Database Connection Timeout on Render
- **Cause**: MongoDB Atlas IP Whitelist is blocking Render's dynamic cloud IP.
- **Fix**: In MongoDB Atlas $\rightarrow$ **Security** $\rightarrow$ **Network Access** $\rightarrow$ Add `0.0.0.0/0` (*Allow access from anywhere*).

### 5. Vector Search Returns 0 Results on Atlas
- **Cause**: Search index name does not match or index is still building.
- **Fix**: Check Atlas Search tab. Confirm the index name is exactly `vector_index` and target collection is `college_rag_db.document_chunks`.

---

## 🔄 Automatic Continuous Deployment (CI/CD)

Once your setup is completed, any future updates are automated:

```bash
# 1. Make code changes in local project
# 2. Commit and push to GitHub
git add .
git commit -m "feat: enhance campus notices and theme"
git push origin main
```

- **Render** automatically redeploys your backend in ~2 minutes.
- **Vercel** automatically redeploys your frontend in ~45 seconds.
