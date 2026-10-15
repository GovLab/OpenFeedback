"use client";

import { useState } from "react";
import { CircleAlert, LoaderCircle, LockKeyhole } from "lucide-react";
import { loginStaff } from "@/lib/http";
import { useDocumentTitle } from "@/lib/useDocumentTitle";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/Button";
import { CARD, INPUT } from "@/components/ui/styles";

interface StaffLoginProps {
  onLoggedIn: () => void;
}

export default function StaffLogin({ onLoggedIn }: StaffLoginProps) {
  useDocumentTitle("Staff sign in");
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
    <div className="flex min-h-screen items-center justify-center bg-[var(--boston-gray-light)] px-4">
      <main className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className={`${CARD} p-8`} noValidate>
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#1871bd]/10 text-[#1871bd]">
            <LockKeyhole className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mb-1 text-2xl text-[#091F2F]">Staff Dashboard</h1>
          <p className="mb-6 text-sm text-slate-600">Enter the staff password to view feedback analytics.</p>

          <label htmlFor="staff-password" className="mb-2 block text-sm font-medium text-slate-800">
            Password
          </label>
          <input
            id="staff-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "staff-password-error" : undefined}
            className={`${INPUT} mb-4`}
          />

          {error && (
            <p
              id="staff-password-error"
              role="alert"
              className="mb-4 flex items-start gap-2 text-sm text-[var(--text-danger)]"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <Button type="submit" disabled={submitting || !password} className="w-full" size="md">
            {submitting && <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />}
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </main>
      <Navigation />
    </div>
  );
}
