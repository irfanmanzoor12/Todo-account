# [Spec: specs/api/rest-endpoints.md]
# [Tasks: T-001 to T-007]

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from ..models import (
    AccountingEntry, AccountingEntryCreate, AccountingEntryRead,
    AccountingEntryUpdate, EntryType, SummaryRead
)
from ..database import get_session
from ..auth import verify_token

router = APIRouter()


def check_user(user_id: str, token_data: dict):
    if token_data["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


@router.get("/api/{user_id}/entries", response_model=list[AccountingEntryRead])
def list_entries(
    user_id: str,
    type: Optional[str] = None,
    reconciled: Optional[bool] = None,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    query = select(AccountingEntry).where(AccountingEntry.user_id == user_id)
    if type and type != "all":
        query = query.where(AccountingEntry.entry_type == type.upper())
    if reconciled is not None:
        query = query.where(AccountingEntry.reconciled == reconciled)
    return session.exec(query).all()


@router.post("/api/{user_id}/entries", response_model=AccountingEntryRead, status_code=201)
def create_entry(
    user_id: str,
    entry: AccountingEntryCreate,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    db_entry = AccountingEntry(**entry.model_dump(), user_id=user_id)
    session.add(db_entry)
    session.commit()
    session.refresh(db_entry)
    return db_entry


@router.get("/api/{user_id}/entries/{entry_id}", response_model=AccountingEntryRead)
def get_entry(
    user_id: str,
    entry_id: int,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    entry = session.get(AccountingEntry, entry_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry


@router.put("/api/{user_id}/entries/{entry_id}", response_model=AccountingEntryRead)
def update_entry(
    user_id: str,
    entry_id: int,
    updates: AccountingEntryUpdate,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    entry = session.get(AccountingEntry, entry_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    data = updates.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(entry, key, value)
    entry.updated_at = datetime.utcnow()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/api/{user_id}/entries/{entry_id}", status_code=204)
def delete_entry(
    user_id: str,
    entry_id: int,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    entry = session.get(AccountingEntry, entry_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()


@router.patch("/api/{user_id}/entries/{entry_id}/reconcile", response_model=AccountingEntryRead)
def toggle_reconcile(
    user_id: str,
    entry_id: int,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    entry = session.get(AccountingEntry, entry_id)
    if not entry or entry.user_id != user_id:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.reconciled = not entry.reconciled
    entry.updated_at = datetime.utcnow()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.get("/api/{user_id}/summary", response_model=SummaryRead)
def get_summary(
    user_id: str,
    session: Session = Depends(get_session),
    token_data: dict = Depends(verify_token),
):
    check_user(user_id, token_data)
    entries = session.exec(
        select(AccountingEntry).where(AccountingEntry.user_id == user_id)
    ).all()
    totals = {"income": 0.0, "expense": 0.0, "debit": 0.0, "credit": 0.0}
    for e in entries:
        totals[e.entry_type.lower()] += e.amount
    net = totals["income"] + totals["credit"] - totals["expense"] - totals["debit"]
    return SummaryRead(**totals, net_balance=net, total_entries=len(entries))
