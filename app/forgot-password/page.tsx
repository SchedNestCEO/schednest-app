"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleResetRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Reset link sent. Check your email for the secure reset link.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while sending the reset link."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#07110d]/85 p-8 shadow-[0_0_80px_rgba(16,185,129,0.12)] backdrop-blur-xl">
          <a href="/" className="inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold text-emerald-300">
              S
            </div>

            <span className="text-xl font-semibold tracking-tight">
              SchedNest
            </span>
          </a>

          <div className="mt-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Account Recovery
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Reset your password
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Enter the email connected to your account. We&apos;ll send a
              secure reset link.
            </p>
          </div>

          <form onSubmit={handleResetRequest} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-gray-300">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-300"
              />
            </label>

            {message && (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-gray-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl bg-emerald-400 px-6 py-4 font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Remember your password?{" "}
            <a
              href="/login"
              className="font-medium text-emerald-300 transition hover:text-emerald-200"
            >
              Back to login
            </a>
          </p>

          <p className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-gray-500">
            Password reset will be handled through a secure verification link.
            SchedNest will never expose plain-text passwords.
          </p>
        </div>
      </div>
    </main>
  );
}
