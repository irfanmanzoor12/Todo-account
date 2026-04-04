# AGENTS.md — Project Constitution

## Purpose
This project uses **Spec-Driven Development (SDD)**.
No agent is allowed to write code until the specification is complete.
Theme: **Accounting Management App** — tracks debits, credits, expenses, income.

## Workflow (Mandatory)
> Specify → Plan → Tasks → Implement

## Rules
1. Never generate code without a referenced Task ID
2. Never modify architecture without updating `specs/`
3. Every feature must have a spec in `specs/features/`
4. No manual coding — refine spec until Claude generates correct output
5. Accounting logic must follow double-entry bookkeeping principles

## Skills in Use
- Accountant Skill (skills.sh) — validates financial logic
- FastAPI Skill — used in Phase II for backend API

## Tech Stack (Phase I)
- Python 3.13+
- UV package manager
- `rich` library for CLI output
- In-memory storage only (no database in Phase I)

## Project Structure
- `/specs` — All specification files
- `/src/todo` — Python source code
- `CLAUDE.md` — Claude Code entry point

## Accounting Heads Reference
- Assets: Cash, Bank, Accounts Receivable
- Liabilities: Accounts Payable, Loans
- Income: Sales Revenue, Service Revenue
- Expenses: Rent, Salaries, Utilities, Marketing

## Code Standards
- Clean, readable Python
- Dataclasses + Enums for models
- Single responsibility per file
- No external dependencies except `rich`
