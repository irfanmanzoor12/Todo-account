# Feature Spec: Accounting Entry Management

## User Stories
- As a user, I can add an accounting entry with type (debit/credit/expense/income), head, and amount
- As a user, I can view all entries in a ledger table with totals per type
- As a user, I can update an entry's details by its ID
- As a user, I can delete an entry by its ID
- As a user, I can mark an entry as reconciled or unreconciled by its ID

## Data Model

### AccountingEntry
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | int | Yes | Auto-incremented unique ID |
| title | str | Yes | Transaction name (1-200 chars) |
| entry_type | EntryType | Yes | DEBIT / CREDIT / EXPENSE / INCOME |
| head | str | Yes | Accounting head (e.g. Cash, Revenue, Rent, Salary) |
| amount | float | Yes | Transaction amount (positive number) |
| description | str | No | Optional notes/reference |
| reconciled | bool | Yes | Default: False |
| date | datetime | Yes | Auto-set on creation |

### EntryType Enum
- DEBIT — Money going out (asset increase or liability decrease)
- CREDIT — Money coming in (liability increase or asset decrease)
- EXPENSE — Cost incurred (rent, salaries, utilities)
- INCOME — Revenue earned (sales, services)

## Acceptance Criteria

### Add Entry (T-001)
- Title, entry_type, head, amount are required
- Amount must be a positive number
- ID auto-assigned starting from 1
- Entry marked unreconciled by default

### View Ledger (T-002)
- Show table: ID, Title, Type, Head, Amount, Status, Date
- Color code: green = income/credit, red = debit/expense
- Show totals row: total income, total expense, net balance
- Show "No entries yet" if empty

### Update Entry (T-003)
- User provides ID + fields to change
- Error if ID not found
- Amount must remain positive if changed

### Delete Entry (T-004)
- User provides ID
- Error if ID not found
- Show success message with entry title

### Mark Reconciled (T-005)
- Toggles reconciled status by ID
- Shows new status after toggle
- Error if ID not found
