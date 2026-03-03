"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MembersLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, password }),
    });

    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setMsg(data?.error ?? "Login failed");
      return;
    }

    router.push("/members");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-extrabold">Member Login</h1>
      <p className="mt-3 opacity-80">Sign in to access member resources.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-semibold">Email or username</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            placeholder="you@example.com or @username"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {msg && <div className="text-sm text-red-600">{msg}</div>}

        <div className="text-sm opacity-80">
          No account? <Link className="hover:underline" href="/membership">Register</Link>
        </div>
      </form>
    </main>
  );
}
