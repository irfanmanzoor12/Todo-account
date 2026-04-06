# [Spec: specs/features/ai-chatbot.md]
# Chat endpoint — runs OpenAI Agent with MCP tools

import os
import sys
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from agents import Agent, Runner
from agents.mcp import MCPServerStdio
from ..auth import verify_token

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


def check_user(user_id: str, token_data: dict):
    if token_data["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")


# Path to MCP server script
MCP_SERVER_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "mcp_server", "server.py"
)


@router.post("/api/{user_id}/chat", response_model=ChatResponse)
async def chat(
    user_id: str,
    request: ChatRequest,
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)

    # MCP server runs as a subprocess (stdio transport)
    mcp_server = MCPServerStdio(
        params={
            "command": sys.executable,
            "args": [MCP_SERVER_PATH],
        }
    )

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
            "Always use the provided tools. Format amounts to 2 decimal places. Be concise and friendly."
        ),
        mcp_servers=[mcp_server],
    )

    result = await Runner.run(agent, request.message)
    return ChatResponse(response=result.final_output)
