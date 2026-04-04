# [Spec: specs/features/task-crud.md]
# [Tasks: T-001, T-002, T-003, T-004, T-005]

from .models import AccountingEntry, EntryType


class LedgerStore:
    def __init__(self):
        self._entries: dict[int, AccountingEntry] = {}
        self._next_id: int = 1

    def add(self, title: str, entry_type: EntryType, head: str, amount: float, description: str = "") -> AccountingEntry:
        entry = AccountingEntry(
            id=self._next_id,
            title=title,
            entry_type=entry_type,
            head=head,
            amount=amount,
            description=description,
        )
        self._entries[self._next_id] = entry
        self._next_id += 1
        return entry

    def get_all(self) -> list[AccountingEntry]:
        return list(self._entries.values())

    def get(self, entry_id: int) -> AccountingEntry | None:
        return self._entries.get(entry_id)

    def update(self, entry_id: int, title: str | None = None, head: str | None = None,
               amount: float | None = None, description: str | None = None) -> AccountingEntry | None:
        entry = self.get(entry_id)
        if not entry:
            return None
        if title:
            entry.title = title
        if head:
            entry.head = head
        if amount is not None and amount > 0:
            entry.amount = amount
        if description is not None:
            entry.description = description
        return entry

    def delete(self, entry_id: int) -> AccountingEntry | None:
        return self._entries.pop(entry_id, None)

    def toggle_reconciled(self, entry_id: int) -> AccountingEntry | None:
        entry = self.get(entry_id)
        if entry:
            entry.reconciled = not entry.reconciled
        return entry

    def get_totals(self) -> dict[str, float]:
        totals = {"income": 0.0, "expense": 0.0, "debit": 0.0, "credit": 0.0}
        for e in self._entries.values():
            if e.entry_type.value == "Income":
                totals["income"] += e.amount
            elif e.entry_type.value == "Expense":
                totals["expense"] += e.amount
            elif e.entry_type.value == "Debit":
                totals["debit"] += e.amount
            elif e.entry_type.value == "Credit":
                totals["credit"] += e.amount
        return totals
