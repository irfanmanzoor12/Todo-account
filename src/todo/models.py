# [Spec: specs/features/task-crud.md - Data Model]
# [Tasks: T-001 to T-005]

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class EntryType(Enum):
    DEBIT = "Debit"
    CREDIT = "Credit"
    EXPENSE = "Expense"
    INCOME = "Income"


@dataclass
class AccountingEntry:
    title: str
    entry_type: EntryType
    head: str
    amount: float
    id: int = 0
    description: str = ""
    reconciled: bool = False
    date: datetime = field(default_factory=datetime.now)
