"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

export default function SignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            business_name: businessName,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Account created. Check your email to confirm your account, then log in."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your account."
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
              Start Your Nest
            </p>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Create your account
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Build your scheduling dashboard and let Birdy help you stay ahead
              of appointments, follow-ups, and daily tasks.
            </p>
          </div>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-gray-300">
                Business name
              </span>
              <input
                type="text"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Your business name"
                autoComplete="organization"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-emerald-300"
              />
            </label>

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

            <label className="block">
              <span className="text-sm font-medium text-gray-300">
                Password
              </span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a secure password"
                autoComplete="new-password"
                required
                minLength={8}
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
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <a
              href="/login"
              className="font-medium text-emerald-300 transition hover:text-emerald-200"
            >
              Log in
            </a>
          </p>

          <p className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-gray-500">
            SchedNest is being built privacy-first. Account security will
            continue improving with verification and two-factor options later.
          </p>
        </div>
      </div>
    </main>
  );
}
