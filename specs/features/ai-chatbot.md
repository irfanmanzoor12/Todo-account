# AI Chatbot — Phase III Spec

## Purpose
Add an AI assistant to the accounting ledger. Users can ask questions and give commands in natural language.

## User Stories
- "What's my net balance?" → AI queries summary and responds
- "Add a rent expense of 5000" → AI creates the entry
- "Show me all income entries" → AI lists filtered entries
- "Delete entry 3" → AI deletes it
- "Reconcile entry 5" → AI marks it reconciled

## Tech Stack
- **OpenAI Agents SDK** (`openai-agents`) — orchestrates the AI agent
- **MCP (Model Context Protocol)** — exposes accounting DB as tools
- **FastAPI** — chat endpoint on existing backend
- **Next.js** — chat UI panel on dashboard

## Architecture
```
User types message
      ↓
POST /api/{user_id}/chat  (FastAPI)
      ↓
OpenAI Agent  (openai-agents SDK)
      ↓
MCP Server tools (stdio)
      ↓
Neon DB queries
      ↓
Natural language response
```

## MCP Tools (server.py)
| Tool | Description |
|------|-------------|
| `list_entries` | Get all entries, optionally filtered by type |
| `create_entry` | Create a new accounting entry |
| `get_summary` | Get totals: income, expense, debit, credit, net balance |
| `delete_entry` | Delete an entry by ID |
| `reconcile_entry` | Toggle reconciliation on an entry |

## API Endpoint
```
POST /api/{user_id}/chat
Body: { "message": "string" }
Response: { "response": "string" }
```

## Chat UI
- Collapsible panel at bottom-right of dashboard
- Shows message history (user + AI bubbles)
- Input box with Send button
- Persists in component state (not DB)

## Acceptance Criteria
- [ ] User can ask natural language questions about their ledger
- [ ] AI can create entries from natural language
- [ ] AI can read and summarize ledger data
- [ ] Chat UI is accessible from the dashboard
- [ ] Auth: user_id scopes all DB queries (AI cannot access other users' data)
