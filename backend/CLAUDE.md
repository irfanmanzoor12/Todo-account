# Backend Guidelines

## Stack
- FastAPI, SQLModel, Neon PostgreSQL, Python 3.13+

## Structure
- `src/api/main.py` - FastAPI app entry point
- `src/api/models.py` - SQLModel database models
- `src/api/database.py` - DB connection (Neon)
- `src/api/auth.py` - JWT verification (Better Auth tokens)
- `src/api/routes/entries.py` - Accounting entry routes

## Conventions
- All routes under `/api/{user_id}/`
- JWT token verified on every request
- Use HTTPException for errors
- Filter all DB queries by authenticated user_id

## Running
uvicorn src.api.main:app --reload --port 8000
