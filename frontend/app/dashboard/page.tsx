"use client";
// [Spec: specs/api/rest-endpoints.md, specs/features/task-crud.md]

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type EntryType = "DEBIT" | "CREDIT" | "EXPENSE" | "INCOME";

interface Entry {
  id: number;
  title: string;
  entry_type: EntryType;
  head: string;
  amount: number;
  description?: string;
  reconciled: boolean;
  date: string;
}

interface Summary {
  income: number;
  expense: number;
  debit: number;
  credit: number;
  net_balance: number;
  total_entries: number;
}

const TYPE_COLORS: Record<EntryType, string> = {
  INCOME: "bg-green-100 text-green-700",
  CREDIT: "bg-blue-100 text-blue-700",
  EXPENSE: "bg-red-100 text-red-700",
  DEBIT: "bg-orange-100 text-orange-700",
};

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", entry_type: "EXPENSE", head: "", amount: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState({ title: "", entry_type: "EXPENSE", head: "", amount: "", description: "" });

  useEffect(() => {
    if (!isPending && !session) router.push("/sign-in");
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadData();
    }
  }, [session, filter]);

  async function loadData() {
    const userId = session!.user.id;
    const [entriesData, summaryData] = await Promise.all([
      api.entries.list(userId, { type: filter === "all" ? undefined : filter }),
      api.entries.summary(userId),
    ]);
    setEntries(entriesData);
    setSummary(summaryData);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await api.entries.create(session!.user.id, { ...form, amount: parseFloat(form.amount) });
    setForm({ title: "", entry_type: "EXPENSE", head: "", amount: "", description: "" });
    setShowForm(false);
    await loadData();
    setLoading(false);
  }

  async function handleDelete(id: number) {
    await api.entries.delete(session!.user.id, id);
    await loadData();
  }

  async function handleReconcile(id: number) {
    await api.entries.reconcile(session!.user.id, id);
    await loadData();
  }

  function openEdit(entry: Entry) {
    setEditEntry(entry);
    setEditForm({
      title: entry.title,
      entry_type: entry.entry_type,
      head: entry.head,
      amount: String(entry.amount),
      description: entry.description || "",
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editEntry) return;
    setLoading(true);
    await api.entries.update(session!.user.id, editEntry.id, { ...editForm, amount: parseFloat(editForm.amount) });
    setEditEntry(null);
    await loadData();
    setLoading(false);
  }

  if (isPending) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">Accounting Ledger</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user.name}</span>
          <button onClick={() => signOut()} className="text-sm text-red-500 hover:underline">Sign Out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Income", value: summary.income, color: "text-green-600" },
              { label: "Credit", value: summary.credit, color: "text-blue-600" },
              { label: "Expense", value: summary.expense, color: "text-red-600" },
              { label: "Debit", value: summary.debit, color: "text-orange-600" },
              { label: "Net Balance", value: summary.net_balance, color: summary.net_balance >= 0 ? "text-green-700" : "text-red-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            {["all", "INCOME", "EXPENSE", "DEBIT", "CREDIT"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-sm ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border"}`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            + Add Entry
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-4 mb-4 grid grid-cols-2 gap-3">
            <input placeholder="Transaction title *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required className="border rounded px-3 py-2 text-sm col-span-2" />
            <select value={form.entry_type} onChange={e => setForm({...form, entry_type: e.target.value})} className="border rounded px-3 py-2 text-sm">
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="DEBIT">Debit</option>
              <option value="CREDIT">Credit</option>
            </select>
            <input placeholder="Accounting head (e.g. Rent, Revenue) *" value={form.head} onChange={e => setForm({...form, head: e.target.value})} required className="border rounded px-3 py-2 text-sm" />
            <input type="number" step="0.01" min="0.01" placeholder="Amount *" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="border rounded px-3 py-2 text-sm" />
            <div className="col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">{loading ? "Saving..." : "Save Entry"}</button>
            </div>
          </form>
        )}

        {/* Edit Modal */}
        {editEntry && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <form onSubmit={handleUpdate} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md grid grid-cols-2 gap-3">
              <h2 className="col-span-2 text-sm font-semibold text-gray-700 mb-1">Edit Entry</h2>
              <input placeholder="Transaction title *" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required className="border rounded px-3 py-2 text-sm col-span-2" />
              <select value={editForm.entry_type} onChange={e => setEditForm({...editForm, entry_type: e.target.value})} className="border rounded px-3 py-2 text-sm">
                <option value="EXPENSE">Expense</option>
                <option value="INCOME">Income</option>
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
              <input placeholder="Accounting head *" value={editForm.head} onChange={e => setEditForm({...editForm, head: e.target.value})} required className="border rounded px-3 py-2 text-sm" />
              <input type="number" step="0.01" min="0.01" placeholder="Amount *" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} required className="border rounded px-3 py-2 text-sm" />
              <input placeholder="Description (optional)" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="border rounded px-3 py-2 text-sm" />
              <div className="col-span-2 flex gap-2 justify-end">
                <button type="button" onClick={() => setEditEntry(null)} className="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
                <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">{loading ? "Saving..." : "Update"}</button>
              </div>
            </form>
          </div>
        )}

        {/* Entries Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {entries.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No entries yet. Add your first entry!</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Head</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Reconciled</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{entry.title}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[entry.entry_type]}`}>
                        {entry.entry_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{entry.head}</td>
                    <td className={`px-4 py-3 text-right font-medium ${entry.entry_type === "INCOME" || entry.entry_type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
                      {entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleReconcile(entry.id)} className={`text-xs px-2 py-1 rounded ${entry.reconciled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {entry.reconciled ? "Yes" : "No"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 flex gap-3">
                      <button onClick={() => openEdit(entry)} className="text-indigo-400 hover:text-indigo-600 text-xs">Edit</button>
                      <button onClick={() => handleDelete(entry.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
