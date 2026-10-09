"use client";

import { useState } from "react";
import { loginStaff } from "@/lib/http";
import Navigation from "@/components/Navigation";

interface StaffLoginProps {
  onLoggedIn: () => void;
}

export default function StaffLogin({ onLoggedIn }: StaffLoginProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginStaff(password);
      onLoggedIn();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        setError("That password isn't right. Please try again.");
      } else if (status === 429) {
        setError("Too many attempts. Please wait a minute and try again.");
      } else {
        setError("Couldn't reach the server. Please try again shortly.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--boston-gray-light)" }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--boston-charles-blue)" }}>
          Staff Dashboard
        </h1>
        <p className="text-sm text-slate-600 mb-6">Enter the staff password to view feedback analytics.</p>

        <label htmlFor="staff-password" className="block text-sm font-medium mb-2" style={{ color: "var(--boston-gray-dark)" }}>
          Password
        </label>
        <input
          id="staff-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 mb-4 focus:outline-none focus:ring-2"
          style={{ borderColor: "var(--boston-gray-medium-dark)" }}
        />

        {error && (
          <p role="alert" className="text-sm mb-4" style={{ color: "var(--boston-freedom-trail-red)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-lg py-2 font-medium text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: "var(--boston-optimistic-blue)" }}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <Navigation />
    </div>
  );
}
