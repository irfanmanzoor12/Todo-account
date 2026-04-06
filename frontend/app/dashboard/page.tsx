"use client";
// [Spec: specs/api/rest-endpoints.md, specs/features/task-crud.md, specs/features/ai-chatbot.md]

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

type AccountCategory = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
type TransactionType = "DEBIT" | "CREDIT";

interface Entry {
  id: number;
  title: string;
  account_category: AccountCategory;
  transaction_type: TransactionType;
  account_name: string;
  amount: number;
  description?: string;
  reconciled: boolean;
  date: string;
}

interface Summary {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  net_balance: number;
  total_entries: number;
}

// Normal balance: which transaction type is typical for each category
const NORMAL_BALANCE: Record<AccountCategory, TransactionType> = {
  ASSET:     "DEBIT",
  EXPENSE:   "DEBIT",
  LIABILITY: "CREDIT",
  EQUITY:    "CREDIT",
  REVENUE:   "CREDIT",
};

// Preset account names per category
const ACCOUNT_PRESETS: Record<AccountCategory, string[]> = {
  ASSET:     ["Cash", "Bank Account", "Accounts Receivable", "Inventory", "Equipment", "Vehicles", "Prepaid Expenses"],
  LIABILITY: ["Accounts Payable", "Loans Payable", "Credit Card Payable", "Accrued Expenses", "Unearned Revenue"],
  EQUITY:    ["Owner's Capital", "Owner's Drawings", "Retained Earnings", "Common Stock"],
  REVENUE:   ["Sales Revenue", "Service Revenue", "Interest Income", "Rental Income", "Commission Income"],
  EXPENSE:   ["Rent Expense", "Salaries Expense", "Utilities Expense", "Marketing Expense", "Insurance Expense", "Depreciation Expense", "Supplies Expense"],
};

const CATEGORY_COLORS: Record<AccountCategory, string> = {
  ASSET:     "bg-blue-100 text-blue-700",
  LIABILITY: "bg-orange-100 text-orange-700",
  EQUITY:    "bg-purple-100 text-purple-700",
  REVENUE:   "bg-green-100 text-green-700",
  EXPENSE:   "bg-red-100 text-red-700",
};

const DIRECTION_COLORS: Record<TransactionType, string> = {
  DEBIT:  "bg-red-50 text-red-600",
  CREDIT: "bg-green-50 text-green-600",
};

const emptyForm = { title: "", account_category: "EXPENSE" as AccountCategory, transaction_type: "DEBIT" as TransactionType, account_name: "", amount: "", description: "" };

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPending && !session) router.push("/sign-in");
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user?.id) loadData();
  }, [session, filter]);

  async function loadData() {
    const userId = session!.user.id;
    const [entriesData, summaryData] = await Promise.all([
      api.entries.list(userId, { category: filter === "all" ? undefined : filter }),
      api.entries.summary(userId),
    ]);
    setEntries(entriesData);
    setSummary(summaryData);
  }

  // Auto-suggest transaction type when category changes
  function handleCategoryChange(category: AccountCategory, isEdit = false) {
    const suggested = NORMAL_BALANCE[category];
    if (isEdit) {
      setEditForm(prev => ({ ...prev, account_category: category, transaction_type: suggested, account_name: "" }));
    } else {
      setForm(prev => ({ ...prev, account_category: category, transaction_type: suggested, account_name: "" }));
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await api.entries.create(session!.user.id, { ...form, amount: parseFloat(form.amount) });
    setForm(emptyForm);
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
      account_category: entry.account_category,
      transaction_type: entry.transaction_type,
      account_name: entry.account_name,
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

  async function handleChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const data = await api.chat(session!.user.id, userMsg);
      setChatMessages(prev => [...prev, { role: "ai", text: data.response }]);
      await loadData();
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", text: "Sorry, something went wrong. Please try again." }]);
    }
    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  if (isPending) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-indigo-600">Accounting Ledger</h1>
          <p className="text-xs text-gray-400">5 Heads: Asset · Liability · Equity · Revenue · Expense</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session.user.name}</span>
          <button onClick={() => signOut()} className="text-sm text-red-500 hover:underline">Sign Out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Summary Cards — Row 1: Balance Sheet items */}
        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              {[
                { label: "Total Assets", value: summary.total_assets, color: "text-blue-600", sub: "ASSET" },
                { label: "Total Liabilities", value: summary.total_liabilities, color: "text-orange-600", sub: "LIABILITY" },
                { label: "Total Equity", value: summary.total_equity, color: "text-purple-600", sub: "EQUITY" },
                { label: "Total Revenue", value: summary.total_revenue, color: "text-green-600", sub: "REVENUE" },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-gray-300 mt-1">{sub}</p>
                </div>
              ))}
            </div>
            {/* Row 2: P&L items */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total Expenses", value: summary.total_expenses, color: "text-red-600" },
                { label: "Net Profit", value: summary.net_profit, color: summary.net_profit >= 0 ? "text-green-700" : "text-red-700", hint: "Revenue − Expenses" },
                { label: "Net Balance", value: summary.net_balance, color: summary.net_balance >= 0 ? "text-indigo-700" : "text-red-700", hint: "Assets − Liabilities − Equity" },
              ].map(({ label, value, color, hint }) => (
                <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  {hint && <p className="text-xs text-gray-300 mt-1">{hint}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2 flex-wrap">
            {["all", "ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${filter === f ? "bg-indigo-600 text-white" : "bg-white text-gray-600 border"}`}
              >
                {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
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
          <EntryForm
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            loading={loading}
            onCategoryChange={(cat) => handleCategoryChange(cat, false)}
            submitLabel="Save Entry"
          />
        )}

        {/* Edit Modal */}
        {editEntry && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="w-full max-w-md">
              <EntryForm
                form={editForm}
                setForm={setEditForm}
                onSubmit={handleUpdate}
                onCancel={() => setEditEntry(null)}
                loading={loading}
                onCategoryChange={(cat) => handleCategoryChange(cat, true)}
                submitLabel="Update Entry"
                title="Edit Entry"
              />
            </div>
          </div>
        )}

        {/* Entries Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {entries.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No entries yet. Add your first accounting entry!</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Direction</th>
                  <th className="px-4 py-3 text-left">Account</th>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[entry.account_category]}`}>
                        {entry.account_category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${DIRECTION_COLORS[entry.transaction_type]}`}>
                        {entry.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{entry.account_name}</td>
                    <td className={`px-4 py-3 text-right font-medium ${entry.transaction_type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
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

      {/* Floating Chat Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 flex items-center justify-center text-2xl z-40"
        title="AI Accounting Assistant"
      >
        {chatOpen ? "✕" : "💬"}
      </button>

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col z-40 border border-gray-100" style={{ height: "480px" }}>
          <div className="bg-indigo-600 text-white px-4 py-3 rounded-t-2xl">
            <p className="font-semibold text-sm">AI Accounting Assistant</p>
            <p className="text-xs text-indigo-200">Ask about your ledger or give commands</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-8">
                <p className="text-2xl mb-2">🤖</p>
                <p>Hi! I understand all 5 account heads.</p>
                <p className="mt-1 text-xs">Try: "What's my net profit?" or "Add a rent expense of 5000"</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${msg.role === "user" ? "bg-indigo-600 text-white rounded-br-none" : "bg-gray-100 text-gray-800 rounded-bl-none"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-3 py-2 rounded-xl rounded-bl-none text-sm">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChat} className="p-3 border-t flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask about your ledger..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              disabled={chatLoading}
            />
            <button type="submit" disabled={chatLoading || !chatInput.trim()} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Reusable Entry Form ────────────────────────────────────────────────────────
function EntryForm({
  form, setForm, onSubmit, onCancel, loading, onCategoryChange, submitLabel, title,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  loading: boolean;
  onCategoryChange: (cat: AccountCategory) => void;
  submitLabel: string;
  title?: string;
}) {
  const presets = ACCOUNT_PRESETS[form.account_category as AccountCategory] || [];

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm p-4 mb-4 grid grid-cols-2 gap-3">
      {title && <h2 className="col-span-2 text-sm font-semibold text-gray-700">{title}</h2>}

      <input
        placeholder="Transaction title *"
        value={form.title}
        onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
        required
        className="border rounded px-3 py-2 text-sm col-span-2"
      />

      {/* Category → auto-suggests transaction type */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Account Category *</label>
        <select
          value={form.account_category}
          onChange={e => onCategoryChange(e.target.value as AccountCategory)}
          className="border rounded px-3 py-2 text-sm w-full"
        >
          <option value="ASSET">Asset</option>
          <option value="LIABILITY">Liability</option>
          <option value="EQUITY">Equity</option>
          <option value="REVENUE">Revenue</option>
          <option value="EXPENSE">Expense</option>
        </select>
      </div>

      {/* Transaction type — auto-filled but editable */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Direction *</label>
        <select
          value={form.transaction_type}
          onChange={e => setForm(prev => ({ ...prev, transaction_type: e.target.value as TransactionType }))}
          className="border rounded px-3 py-2 text-sm w-full"
        >
          <option value="DEBIT">Debit</option>
          <option value="CREDIT">Credit</option>
        </select>
      </div>

      {/* Account name — preset dropdown */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Account Name *</label>
        <select
          value={form.account_name}
          onChange={e => setForm(prev => ({ ...prev, account_name: e.target.value }))}
          required
          className="border rounded px-3 py-2 text-sm w-full"
        >
          <option value="">Select account...</option>
          {presets.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Amount *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          value={form.amount}
          onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
          required
          className="border rounded px-3 py-2 text-sm w-full"
        />
      </div>

      <input
        placeholder="Description (optional)"
        value={form.description}
        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
        className="border rounded px-3 py-2 text-sm col-span-2"
      />

      <div className="col-span-2 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 border rounded-lg">Cancel</button>
        <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg disabled:opacity-50">
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
