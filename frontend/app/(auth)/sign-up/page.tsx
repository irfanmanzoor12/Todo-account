"use client";
// [Spec: specs/features/authentication.md]

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await signUp.email({ name, email, password });
    if (error) {
      setError(error.message || "Sign up failed");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">Accounting Ledger</h1>
        <p className="text-gray-500 mb-6">Create your account</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text" placeholder="Full Name" value={name}
            onChange={e => setName(e.target.value)} required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <input
            type="password" placeholder="Password (min 8 chars)" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={8}
            className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Have an account? <Link href="/sign-in" className="text-indigo-600 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
