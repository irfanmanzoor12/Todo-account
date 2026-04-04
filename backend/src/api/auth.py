# [Spec: specs/features/authentication.md]
# Session token verification — checks against Neon DB session table

import os
from datetime import datetime, timezone
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from sqlalchemy import text
from dotenv import load_dotenv
from .database import engine

load_dotenv()

security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    token = credentials.credentials

    with Session(engine) as session:
        # Look up session token in Better Auth session table
        result = session.exec(
            text('SELECT "userId", "expiresAt" FROM session WHERE token = :token'),
            params={"token": token},
        ).fetchone()

        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )

        user_id, expires_at = result

        # Check expiry
        now = datetime.now(timezone.utc)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session expired",
            )

        return {"user_id": str(user_id)}
