# Accounting Ledger App

## Phases
- [x] Phase I: Python Console App
- [x] Phase II: Full-Stack Web App (Next.js + FastAPI + Neon DB)

## Quick Start

### 1. Get Neon DB URL
- Sign up at neon.tech (free)
- Create a project → copy the connection string

### 2. Setup Backend
```bash
cd backend
cp .env.example .env
# Edit .env: add DATABASE_URL and BETTER_AUTH_SECRET
uv run uvicorn src.api.main:app --reload --port 8000
```

### 3. Setup Frontend
```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local: add same BETTER_AUTH_SECRET
npm run dev
```

### 4. Open App
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8000/docs

## Deployment
- Frontend: Deploy to Vercel (connect GitHub repo)
- Set env vars in Vercel dashboard
- Backend: Deploy to Railway/Render/VPS
