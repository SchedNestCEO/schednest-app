"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import {
  consentDefinitions,
  type ConsentKey,
  type ConsentStatus,
} from "../../lib/platform/consent";

type ConsentRecord = {
  consent_key: ConsentKey;
  status: ConsentStatus;
};

export default function PrivacyControlsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage("You must be signed in.");
        return;
      }

      const { data, error } = await supabase
        .from("platform_consents")
        .select("consent_key, status")
        .eq("owner_id", user.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setConsents((data || []) as ConsentRecord[]);
    }

    void load();
  }, [supabase]);

  function statusFor(key: ConsentKey): ConsentStatus {
    return consents.find((item) => item.consent_key === key)?.status || "not_granted";
  }

  async function updateConsent(key: ConsentKey, status: ConsentStatus) {
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("platform_consents")
      .upsert(
        {
          owner_id: user.id,
          consent_key: key,
          status,
          version: "1.0",
          source: "settings_privacy",
          granted_at: status === "granted" ? now : null,
          withdrawn_at: status === "withdrawn" ? now : null,
          updated_at: now,
        },
        { onConflict: "owner_id,consent_key" }
      )
      .select("consent_key, status")
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setConsents((current) => {
      const exists = current.some((item) => item.consent_key === key);
      return exists
        ? current.map((item) => item.consent_key === key ? (data as ConsentRecord) : item)
        : [...current, data as ConsentRecord];
    });

    setMessage("Privacy preference saved.");
  }

  async function requestExport() {
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("platform_data_requests")
      .insert({
        owner_id: user.id,
        request_type: "export",
        status: "pending",
      });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Data export request submitted.");
  }

  return (
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
            Account Settings
          </p>

          <h1 className="mt-5 text-4xl font-black">
            Privacy controls
          </h1>

          <p className="mt-5 text-sm leading-6 text-gray-400">
            Manage consent, Birdy learning, connected-app access, and data requests.
          </p>
        </section>

        {message ? <p className="mt-6 text-edition-primary">{message}</p> : null}
        {errorMessage ? <p className="mt-6 text-red-300">{errorMessage}</p> : null}

        <div className="mt-8 grid gap-5">
          {consentDefinitions.map((item) => (
            <section
              key={item.key}
              className="grid gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:grid-cols-[1fr_190px]"
            >
              <div>
                <h2 className="text-lg font-black">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {item.description}
                </p>
              </div>

              <select
                value={statusFor(item.key)}
                onChange={(event) =>
                  void updateConsent(
                    item.key,
                    event.target.value as ConsentStatus
                  )
                }
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3"
              >
                <option value="granted">Granted</option>
                <option value="not_granted">Not granted</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">Your data</h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Request a copy of your SchedNest account data.
          </p>

          <button
            type="button"
            onClick={() => void requestExport()}
            className="mt-5 rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black hover:bg-edition-primary-hover"
          >
            Request data export
          </button>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/settings"
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold hover:bg-white/10"
          >
            Back to settings
          </Link>

          <Link
            href="/privacy"
            className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold hover:bg-white/10"
          >
            Read Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}
