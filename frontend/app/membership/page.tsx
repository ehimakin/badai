"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function MembershipPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const raw = await res.text(); // read once
      let data: { error?: string; message?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg =
          data?.error ||
          data?.message ||
          (raw && raw.length < 200 ? raw : null) ||
          `Registration failed (HTTP ${res.status})`;

        setError(msg);
        return;
      }

      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-extrabold">Membership</h1>
      <h2 className="mt-3 text-xl font-semibold">What becoming a member means...</h2>
      <p className="mt-4 max-w-3xl opacity-80">
        Membership connects you to practical education, peer discussion, and a shared standard for
        safe, evidence-based use of AI in dentistry.
      </p>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        <Image
          src="/slideshow/001.jpg"
          alt="Dental team in discussion"
          className="h-44 w-full rounded-xl border object-cover"
          width={1200}
          height={800}
        />
        <Image
          src="/slideshow/002.jpg"
          alt="Clinical education session"
          className="h-44 w-full rounded-xl border object-cover"
          width={1200}
          height={800}
        />
        <Image
          src="/slideshow/003.jpg"
          alt="Dentistry technology focus"
          className="h-44 w-full rounded-xl border object-cover"
          width={1200}
          height={800}
        />
      </div>

      <p className="mt-14 max-w-4xl opacity-80">
        As a member, you gain access to curated learning, event participation, and resources designed
        for clinical reality, not just theory. Our aim is to help you build confidence with clear,
        applicable guidance.
      </p>
      <p className="mt-3 max-w-4xl opacity-80">
        Register below to create your member account. Once active, you can access member-only areas,
        track your learning, and stay connected with upcoming events.
      </p>

      {success ? (
        <div className="mt-10 rounded-2xl border border-brand-600 p-6">
          <h2 className="text-xl font-bold">Registration successful ✅</h2>
          <p className="mt-2 opacity-80">
            Your account has been created.
          </p>
          <div className="mt-4">
            <Link href="/members/login" className="btn-primary">
              Continue to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-[100px] max-w-3xl space-y-4">
          <div>
            <label className="text-sm font-semibold">Full name</label>
            <input
              className="mt-1 w-full rounded-md border border-[#d1d5db] px-3 py-2 focus:border-[#b8bec7] focus:outline-none focus:ring-1 focus:ring-[#b8bec7]"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Email</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-[#d1d5db] px-3 py-2 focus:border-[#b8bec7] focus:outline-none focus:ring-1 focus:ring-[#b8bec7]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-[#d1d5db] px-3 py-2 focus:border-[#b8bec7] focus:outline-none focus:ring-1 focus:ring-[#b8bec7]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
            <div className="mt-1 text-xs opacity-70">
              Minimum 8 characters
            </div>
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? "Registering…" : "Register"}
          </button>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <div className="text-sm opacity-80">
            Already have an account?{" "}
            <Link href="/members/login" className="hover:underline">
              Login
            </Link>
          </div>
        </form>
      )}
    </main>
  );
}
