"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import {
  confidenceLabel,
  type OptimizerRecommendation,
} from "../../lib/platform/birdyOptimizer";

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function BirdyOptimizerPage() {
  const supabase = useMemo(() => createClient(), []);
  const [recommendations, setRecommendations] = useState<
    OptimizerRecommendation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRecommendations = useCallback(async () => {
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

    const { data, error } = await supabase
      .from("birdy_action_decisions")
      .select(
        "id, product, action_key, recommendation, explanation, confidence, alternatives, constraints, status, created_at"
      )
      .eq("owner_id", user.id)
      .in("action_key", [
        "resolve_schedule_conflict",
        "schedule_unscheduled_item",
      ])
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setRecommendations((data || []) as OptimizerRecommendation[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadRecommendations();
  }, [loadRecommendations]);

  async function runOptimizer() {
    setGenerating(true);
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setGenerating(false);
      setErrorMessage("You must be signed in.");
      return;
    }

    const { data, error } = await supabase.rpc(
      "generate_birdy_schedule_recommendations",
      {
        target_owner_id: user.id,
      }
    );

    setGenerating(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(
      `${data || 0} new recommendation(s) generated. No schedule changes were made.`
    );

    await loadRecommendations();
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
            Birdy Intelligence
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Schedule Optimizer
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            Birdy reviews conflicts and unscheduled work, then creates
            explainable recommendations for your approval.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-gray-300">
            Recommendation mode only. Birdy will not move or create
            schedule items automatically.
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black">Optimizer recommendations</h2>
              <p className="mt-1 text-sm text-gray-500">
                {recommendations.length} recommendation(s)
              </p>
            </div>

            <button
              type="button"
              onClick={() => void runOptimizer()}
              disabled={generating}
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-50"
            >
              {generating ? "Reviewing schedule..." : "Run optimizer"}
            </button>
          </div>

          {message ? (
            <p className="mt-5 text-emerald-200">{message}</p>
          ) : null}

          {errorMessage ? (
            <p className="mt-5 text-red-200">{errorMessage}</p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">
              Loading recommendations...
            </p>
          ) : recommendations.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 p-5">
              <p className="text-sm text-gray-400">
                No optimizer recommendations yet. Add coordination items,
                detect conflicts, and run the optimizer.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {recommendations.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                          {item.product}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                          {confidenceLabel(item.confidence)}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                          {item.status}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-black">
                        {item.recommendation}
                      </h3>

                      {item.explanation ? (
                        <p className="mt-3 text-sm leading-6 text-gray-400">
                          {item.explanation}
                        </p>
                      ) : null}

                      <p className="mt-3 text-xs text-gray-600">
                        {item.action_key.replaceAll("_", " ")} ·{" "}
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/coordination"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 hover:bg-white/10"
            >
              Open coordination engine
            </Link>

            <Link
              href="/birdy/decisions"
              className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100"
            >
              Review decisions
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
