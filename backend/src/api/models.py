# [Spec: specs/database/schema.md]

from datetime import datetime
from enum import Enum
from typing import Optional
from sqlmodel import Field, SQLModel


class EntryType(str, Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"
    EXPENSE = "EXPENSE"
    INCOME = "INCOME"


class AccountingEntryBase(SQLModel):
    title: str = Field(min_length=1, max_length=200)
    entry_type: EntryType
    head: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    description: Optional[str] = Field(default=None, max_length=1000)


class AccountingEntry(AccountingEntryBase, table=True):
    __tablename__ = "accounting_entries"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = Field(index=True)
    reconciled: bool = Field(default=False)
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AccountingEntryCreate(AccountingEntryBase):
    pass


class AccountingEntryUpdate(SQLModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    head: Optional[str] = Field(default=None, min_length=1, max_length=100)
    amount: Optional[float] = Field(default=None, gt=0)
    description: Optional[str] = None


class AccountingEntryRead(AccountingEntryBase):
    id: int
    user_id: str
    reconciled: bool
    date: datetime
    created_at: datetime


class SummaryRead(SQLModel):
    income: float
    expense: float
    debit: float
    credit: float
    net_balance: float
    total_entries: int
