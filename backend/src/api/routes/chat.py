# [Spec: specs/features/ai-chatbot.md]
# Chat endpoint — OpenAI Agent with direct function tools (no MCP subprocess)

import os
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import psycopg2
from agents import Agent, Runner, function_tool
from ..auth import verify_token

router = APIRouter()

DATABASE_URL = os.getenv("DATABASE_URL", "")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


def check_user(user_id: str, token_data: dict):
    if token_data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


# ── Accounting tools (called directly by the OpenAI Agent) ────────────────────

@function_tool
def list_entries(user_id: str, account_category: Optional[str] = None) -> str:
    """List accounting entries for the user. Optionally filter by account_category: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE."""
    conn = get_conn()
    cur = conn.cursor()
    if account_category:
        cur.execute(
            "SELECT id, title, account_category, transaction_type, account_name, amount, reconciled, date FROM accounting_entries WHERE user_id=%s AND account_category=%s ORDER BY date DESC",
            (user_id, account_category.upper()),
        )
    else:
        cur.execute(
            "SELECT id, title, account_category, transaction_type, account_name, amount, reconciled, date FROM accounting_entries WHERE user_id=%s ORDER BY date DESC",
            (user_id,),
        )
    rows = cur.fetchall()
    conn.close()
    entries = [
        {"id": r[0], "title": r[1], "account_category": r[2], "transaction_type": r[3],
         "account_name": r[4], "amount": float(r[5]), "reconciled": r[6], "date": str(r[7])}
        for r in rows
    ]
    return json.dumps(entries)


@function_tool
def create_entry(user_id: str, title: str, account_category: str, transaction_type: str, account_name: str, amount: float, description: str = "") -> str:
    """Create a new accounting entry. account_category: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE. transaction_type: DEBIT or CREDIT. Normal balances: ASSET/EXPENSE=DEBIT, LIABILITY/EQUITY/REVENUE=CREDIT."""
    conn = get_conn()
    cur = conn.cursor()
    now = datetime.utcnow()
    cur.execute(
        "INSERT INTO accounting_entries (title, account_category, transaction_type, account_name, amount, description, user_id, reconciled, date, created_at, updated_at) VALUES (%s,%s,%s,%s,%s,%s,%s,false,%s,%s,%s) RETURNING id",
        (title, account_category.upper(), transaction_type.upper(), account_name, amount, description, user_id, now, now, now),
    )
    new_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return json.dumps({"created": True, "id": new_id, "title": title, "amount": amount})


@function_tool
def get_summary(user_id: str) -> str:
    """Get financial summary: total assets, liabilities, equity, revenue, expenses, net profit (Revenue-Expenses), and net balance (Assets-Liabilities-Equity)."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "SELECT account_category, SUM(amount) FROM accounting_entries WHERE user_id=%s GROUP BY account_category",
        (user_id,),
    )
    rows = cur.fetchall()
    conn.close()
    totals = {"ASSET": 0.0, "LIABILITY": 0.0, "EQUITY": 0.0, "REVENUE": 0.0, "EXPENSE": 0.0}
    for cat, total in rows:
        totals[cat] = float(total)
    net_profit  = totals["REVENUE"] - totals["EXPENSE"]
    net_balance = totals["ASSET"] - totals["LIABILITY"] - totals["EQUITY"]
    return json.dumps({
        "total_assets": totals["ASSET"],
        "total_liabilities": totals["LIABILITY"],
        "total_equity": totals["EQUITY"],
        "total_revenue": totals["REVENUE"],
        "total_expenses": totals["EXPENSE"],
        "net_profit": net_profit,
        "net_balance": net_balance,
    })


@function_tool
def delete_entry(user_id: str, entry_id: int) -> str:
    """Delete an accounting entry by its ID."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM accounting_entries WHERE id=%s AND user_id=%s RETURNING id", (entry_id, user_id))
    deleted = cur.fetchone()
    conn.commit()
    conn.close()
    return json.dumps({"deleted": bool(deleted)})


@function_tool
def reconcile_entry(user_id: str, entry_id: int) -> str:
    """Toggle the reconciliation status of an accounting entry."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE accounting_entries SET reconciled = NOT reconciled WHERE id=%s AND user_id=%s RETURNING reconciled",
        (entry_id, user_id),
    )
    row = cur.fetchone()
    conn.commit()
    conn.close()
    return json.dumps({"reconciled": row[0] if row else None})


# ── Chat endpoint ─────────────────────────────────────────────────────────────

@router.post("/api/{user_id}/chat", response_model=ChatResponse)
async def chat(
    user_id: str,
    request: ChatRequest,
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)

    agent = Agent(
        name="Accounting Assistant",
        instructions=(
            f"You are a helpful accounting assistant for user {user_id}. "
            "The ledger follows proper accounting with 5 account heads: "
            "ASSET (Cash, Bank, Equipment — normal balance: DEBIT), "
            "LIABILITY (Loans Payable, Accounts Payable — normal balance: CREDIT), "
            "EQUITY (Owner's Capital, Retained Earnings — normal balance: CREDIT), "
            "REVENUE (Sales Revenue, Service Revenue — normal balance: CREDIT), "
            "EXPENSE (Rent, Salaries, Utilities — normal balance: DEBIT). "
            "Every entry has both an account_category AND a transaction_type (DEBIT or CREDIT). "
            "Always pass the user_id to every tool call. "
            "Format amounts with 2 decimal places. Be concise and friendly."
        ),
        tools=[list_entries, create_entry, get_summary, delete_entry, reconcile_entry],
    )

    result = await Runner.run(agent, request.message)
    return ChatResponse(response=result.final_output)
