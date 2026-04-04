# Database Schema

## Tables

### users (managed by Better Auth)
- id: string (primary key)
- email: string (unique)
- name: string
- created_at: timestamp

### accounting_entries
- id: integer (primary key, auto-increment)
- user_id: string (foreign key -> users.id)
- title: string (not null)
- entry_type: string (DEBIT/CREDIT/EXPENSE/INCOME)
- head: string (accounting head: Cash, Revenue, Rent, etc.)
- amount: float (positive number)
- description: text (nullable)
- reconciled: boolean (default false)
- date: timestamp (default now)
- created_at: timestamp
- updated_at: timestamp

## Indexes
- accounting_entries.user_id (filter by user)
- accounting_entries.entry_type (filter by type)
