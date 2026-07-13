"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type BirdyDecision = {
  id: string;
  product: "platform" | "student" | "teams" | "med" | "business" | "life";
  action_key: string;
  recommendation: string;
  explanation: string | null;
  confidence: number;
  alternatives: unknown[];
  constraints: unknown[];
  status: "pending" | "approved" | "rejected" | "executed" | "cancelled" | "expired";
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BirdyDecisionCenterPage() {
  const supabase = useMemo(() => createClient(), []);
  const [decisions, setDecisions] = useState<BirdyDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    let query = supabase
      .from("birdy_action_decisions")
      .select(
        "id, product, action_key, recommendation, explanation, confidence, alternatives, constraints, status, created_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    }

    const { data, error } = await query;

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setDecisions((data || []) as BirdyDecision[]);
    setLoading(false);
  }, [filter, supabase]);

  useEffect(() => {
    void loadDecisions();
  }, [loadDecisions]);

  async function decide(
    decisionId: string,
    status: "approved" | "rejected" | "cancelled"
  ) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("decide_birdy_action", {
      target_decision_id: decisionId,
      decision_status: status,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(`Decision ${status}.`);
    await loadDecisions();
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-violet-400/20 bg-violet-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-violet-300">
            Birdy Core
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Decision Center
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            Review Birdy recommendations, understand why they were made,
            and approve or reject important actions.
          </p>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Recommendations</h2>
              <p className="mt-1 text-sm text-gray-500">
                {decisions.length} decision(s)
              </p>
            </div>

            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as "pending" | "all")
              }
              className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
            >
              <option value="pending">Pending only</option>
              <option value="all">All decisions</option>
            </select>
          </div>

          {message ? (
            <p className="mt-5 text-emerald-200">{message}</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-5 text-red-200">{errorMessage}</p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">
              Loading Birdy decisions...
            </p>
          ) : decisions.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">
              No decisions to review.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {decisions.map((decision) => (
                <article
                  key={decision.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-violet-300/15 bg-violet-300/10 px-3 py-1 text-xs font-bold text-violet-100">
                          {decision.product}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                          {Math.round(decision.confidence * 100)}% confidence
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                          {decision.status}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-black">
                        {decision.recommendation}
                      </h3>

                      {decision.explanation ? (
                        <p className="mt-3 text-sm leading-6 text-gray-400">
                          {decision.explanation}
                        </p>
                      ) : null}

                      <p className="mt-3 text-xs text-gray-600">
                        {decision.action_key.replaceAll("_", " ")} ·{" "}
                        {formatDate(decision.created_at)}
                      </p>
                    </div>
                  </div>

                  {decision.status === "pending" ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          void decide(decision.id, "approved")
                        }
                        className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-100"
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void decide(decision.id, "rejected")
                        }
                        className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-2 text-sm font-black text-red-100"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void decide(decision.id, "cancelled")
                        }
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-gray-400"
                      >
                        Dismiss
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
