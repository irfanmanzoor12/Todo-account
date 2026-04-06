# [Spec: specs/features/ai-chatbot.md]
# MCP Server — exposes accounting DB as tools for the AI agent

import os
import json
from datetime import datetime
import psycopg2
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '..', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL", "")

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

app = Server("accounting-ledger")


def get_conn():
    return psycopg2.connect(DATABASE_URL)


@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="list_entries",
            description="List accounting entries for the user. Optionally filter by account_category: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE.",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "account_category": {"type": "string", "description": "Optional: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE"},
                },
                "required": ["user_id"],
            },
        ),
        types.Tool(
            name="create_entry",
            description=(
                "Create a new accounting entry. "
                "account_category must be one of: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE. "
                "transaction_type must be DEBIT or CREDIT. "
                "Normal balances: ASSET/EXPENSE → DEBIT, LIABILITY/EQUITY/REVENUE → CREDIT."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "title": {"type": "string"},
                    "account_category": {"type": "string", "description": "ASSET, LIABILITY, EQUITY, REVENUE, or EXPENSE"},
                    "transaction_type": {"type": "string", "description": "DEBIT or CREDIT"},
                    "account_name": {"type": "string", "description": "Specific account e.g. Cash, Rent Expense, Sales Revenue"},
                    "amount": {"type": "number"},
                    "description": {"type": "string"},
                },
                "required": ["user_id", "title", "account_category", "transaction_type", "account_name", "amount"],
            },
        ),
        types.Tool(
            name="get_summary",
            description="Get financial summary: total assets, liabilities, equity, revenue, expenses, net profit, and net balance.",
            inputSchema={
                "type": "object",
                "properties": {"user_id": {"type": "string"}},
                "required": ["user_id"],
            },
        ),
        types.Tool(
            name="delete_entry",
            description="Delete an accounting entry by ID.",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "entry_id": {"type": "integer"},
                },
                "required": ["user_id", "entry_id"],
            },
        ),
        types.Tool(
            name="reconcile_entry",
            description="Toggle the reconciliation status of an entry.",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "entry_id": {"type": "integer"},
                },
                "required": ["user_id", "entry_id"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    user_id = arguments.get("user_id")

    if name == "list_entries":
        conn = get_conn()
        cur = conn.cursor()
        category = arguments.get("account_category")
        if category:
            cur.execute(
                "SELECT id, title, account_category, transaction_type, account_name, amount, reconciled, date FROM accounting_entries WHERE user_id=%s AND account_category=%s ORDER BY date DESC",
                (user_id, category.upper()),
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
        return [types.TextContent(type="text", text=json.dumps(entries))]

    elif name == "create_entry":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO accounting_entries (title, account_category, transaction_type, account_name, amount, description, user_id, reconciled, date, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, false, %s, %s, %s) RETURNING id",
            (
                arguments["title"],
                arguments["account_category"].upper(),
                arguments["transaction_type"].upper(),
                arguments["account_name"],
                arguments["amount"],
                arguments.get("description", ""),
                user_id,
                datetime.utcnow(),
                datetime.utcnow(),
                datetime.utcnow(),
            ),
        )
        new_id = cur.fetchone()[0]
        conn.commit()
        conn.close()
        return [types.TextContent(type="text", text=json.dumps({"created": True, "id": new_id}))]

    elif name == "get_summary":
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
        return [types.TextContent(type="text", text=json.dumps({
            "total_assets": totals["ASSET"],
            "total_liabilities": totals["LIABILITY"],
            "total_equity": totals["EQUITY"],
            "total_revenue": totals["REVENUE"],
            "total_expenses": totals["EXPENSE"],
            "net_profit": net_profit,
            "net_balance": net_balance,
        }))]

    elif name == "delete_entry":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM accounting_entries WHERE id=%s AND user_id=%s RETURNING id",
            (arguments["entry_id"], user_id),
        )
        deleted = cur.fetchone()
        conn.commit()
        conn.close()
        return [types.TextContent(type="text", text=json.dumps({"deleted": bool(deleted)}))]

    elif name == "reconcile_entry":
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE accounting_entries SET reconciled = NOT reconciled WHERE id=%s AND user_id=%s RETURNING reconciled",
            (arguments["entry_id"], user_id),
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()
        return [types.TextContent(type="text", text=json.dumps({"reconciled": row[0] if row else None}))]

    return [types.TextContent(type="text", text="Unknown tool")]


if __name__ == "__main__":
    import asyncio
    asyncio.run(stdio_server(app))
