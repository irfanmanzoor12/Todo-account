# REST API Endpoints

## Base URL
- Development: http://localhost:8000
- All endpoints require JWT token: Authorization: Bearer <token>

## Endpoints

### GET /api/{user_id}/entries
List all accounting entries for the user.
Query params: type (DEBIT/CREDIT/EXPENSE/INCOME/all), reconciled (true/false)

### POST /api/{user_id}/entries
Create a new accounting entry.
Body: { title, entry_type, head, amount, description? }

### GET /api/{user_id}/entries/{id}
Get a single entry by ID.

### PUT /api/{user_id}/entries/{id}
Update an entry.
Body: { title?, head?, amount?, description? }

### DELETE /api/{user_id}/entries/{id}
Delete an entry.

### PATCH /api/{user_id}/entries/{id}/reconcile
Toggle reconciled status.

### GET /api/{user_id}/summary
Get totals: income, expense, debit, credit, net balance.
