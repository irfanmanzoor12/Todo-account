# [Spec: specs/features/task-crud.md]
# [Tasks: T-001, T-002, T-003, T-004, T-005]

from rich.console import Console
from rich.table import Table
from rich.prompt import Prompt
from rich import print as rprint
from .models import EntryType
from .storage import LedgerStore

console = Console()
store = LedgerStore()

ENTRY_TYPES = {
    "1": EntryType.DEBIT,
    "2": EntryType.CREDIT,
    "3": EntryType.EXPENSE,
    "4": EntryType.INCOME,
}

TYPE_COLORS = {
    "Debit": "red",
    "Credit": "green",
    "Expense": "red",
    "Income": "green",
}


def show_menu():
    console.print("\n[bold cyan]=== Accounting Ledger App ===[/bold cyan]")
    console.print("[1] Add Entry")
    console.print("[2] View Ledger")
    console.print("[3] Update Entry")
    console.print("[4] Delete Entry")
    console.print("[5] Mark Reconciled")
    console.print("[0] Exit")


def view_ledger():
    entries = store.get_all()
    if not entries:
        console.print("[yellow]No entries yet![/yellow]")
        return

    table = Table(title="Accounting Ledger", show_footer=True)
    table.add_column("ID", style="cyan", width=5)
    table.add_column("Title")
    table.add_column("Type", width=10)
    table.add_column("Head")
    table.add_column("Amount", justify="right", footer="---")
    table.add_column("Reconciled", width=12)
    table.add_column("Date", style="dim")

    for e in entries:
        color = TYPE_COLORS.get(e.entry_type.value, "white")
        reconciled = "[green]Yes[/green]" if e.reconciled else "[dim]No[/dim]"
        table.add_row(
            str(e.id),
            e.title,
            f"[{color}]{e.entry_type.value}[/{color}]",
            e.head,
            f"[{color}]{e.amount:,.2f}[/{color}]",
            reconciled,
            e.date.strftime("%Y-%m-%d"),
        )

    console.print(table)

    totals = store.get_totals()
    net = totals["income"] + totals["credit"] - totals["expense"] - totals["debit"]
    console.print(f"\n[dim]Income:[/dim] [green]{totals['income']:,.2f}[/green]  "
                  f"[dim]Credit:[/dim] [green]{totals['credit']:,.2f}[/green]  "
                  f"[dim]Expense:[/dim] [red]{totals['expense']:,.2f}[/red]  "
                  f"[dim]Debit:[/dim] [red]{totals['debit']:,.2f}[/red]  "
                  f"[bold]Net Balance: {'[green]' if net >= 0 else '[red]'}{net:,.2f}[/]")


def add_entry():
    title = Prompt.ask("[bold]Transaction title[/bold]")
    if not title.strip():
        console.print("[red]Title cannot be empty.[/red]")
        return

    console.print("Entry type: [1] Debit  [2] Credit  [3] Expense  [4] Income")
    type_choice = Prompt.ask("Choose type", choices=["1", "2", "3", "4"])
    entry_type = ENTRY_TYPES[type_choice]

    head = Prompt.ask("Accounting head (e.g. Cash, Revenue, Rent)")
    if not head.strip():
        console.print("[red]Head cannot be empty.[/red]")
        return

    try:
        amount = float(Prompt.ask("Amount"))
        if amount <= 0:
            raise ValueError
    except ValueError:
        console.print("[red]Amount must be a positive number.[/red]")
        return

    description = Prompt.ask("Description (optional)", default="")
    entry = store.add(title.strip(), entry_type, head.strip(), amount, description.strip())
    rprint(f"[green]Entry #{entry.id} added:[/green] {entry.title} — {entry.entry_type.value} {entry.amount:,.2f}")


def update_entry():
    view_ledger()
    try:
        entry_id = int(Prompt.ask("Enter entry ID to update"))
    except ValueError:
        console.print("[red]Invalid ID.[/red]")
        return

    new_title = Prompt.ask("New title (leave blank to keep)", default="")
    new_head = Prompt.ask("New head (leave blank to keep)", default="")
    new_amount_str = Prompt.ask("New amount (leave blank to keep)", default="")
    new_desc = Prompt.ask("New description (leave blank to keep)", default="")

    new_amount = None
    if new_amount_str:
        try:
            new_amount = float(new_amount_str)
            if new_amount <= 0:
                raise ValueError
        except ValueError:
            console.print("[red]Invalid amount.[/red]")
            return

    entry = store.update(entry_id, new_title or None, new_head or None, new_amount, new_desc or None)
    if entry:
        rprint(f"[green]Entry #{entry.id} updated:[/green] {entry.title}")
    else:
        console.print(f"[red]Entry #{entry_id} not found.[/red]")


def delete_entry():
    view_ledger()
    try:
        entry_id = int(Prompt.ask("Enter entry ID to delete"))
    except ValueError:
        console.print("[red]Invalid ID.[/red]")
        return

    entry = store.delete(entry_id)
    if entry:
        rprint(f"[green]Entry #{entry_id} deleted:[/green] {entry.title}")
    else:
        console.print(f"[red]Entry #{entry_id} not found.[/red]")


def toggle_reconciled():
    view_ledger()
    try:
        entry_id = int(Prompt.ask("Enter entry ID to toggle reconciled"))
    except ValueError:
        console.print("[red]Invalid ID.[/red]")
        return

    entry = store.toggle_reconciled(entry_id)
    if entry:
        status = "Reconciled" if entry.reconciled else "Unreconciled"
        rprint(f"[green]Entry #{entry.id}[/green] is now [bold]{status}[/bold]")
    else:
        console.print(f"[red]Entry #{entry_id} not found.[/red]")


def main():
    console.print("[bold magenta]Welcome to Accounting Ledger App![/bold magenta]")
    while True:
        show_menu()
        choice = Prompt.ask("Choose an option", default="0")
        if choice == "1":
            add_entry()
        elif choice == "2":
            view_ledger()
        elif choice == "3":
            update_entry()
        elif choice == "4":
            delete_entry()
        elif choice == "5":
            toggle_reconciled()
        elif choice == "0":
            console.print("[bold]Goodbye![/bold]")
            break
        else:
            console.print("[red]Invalid option.[/red]")


if __name__ == "__main__":
    main()
