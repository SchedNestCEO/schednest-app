"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";

type CoordinationItem = {
  id: string;
  product: "platform" | "student" | "teams" | "med" | "business" | "life";
  item_type: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  priority: number;
  flexibility: "fixed" | "movable" | "preferred";
  status: string;
};

type Conflict = {
  id: string;
  severity: "info" | "warning" | "critical";
  explanation: string | null;
  detected_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "No date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CoordinationPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<CoordinationItem[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [title, setTitle] = useState("");
  const [product, setProduct] =
    useState<CoordinationItem["product"]>("platform");
  const [itemType, setItemType] = useState("event");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [flexibility, setFlexibility] =
    useState<CoordinationItem["flexibility"]>("fixed");
  const [priority, setPriority] = useState(3);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
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

    const [itemsResult, conflictsResult] = await Promise.all([
      supabase
        .from("coordination_items")
        .select(
          "id, product, item_type, title, description, starts_at, ends_at, due_at, priority, flexibility, status"
        )
        .eq("owner_id", user.id)
        .neq("status", "archived")
        .order("starts_at", { ascending: true, nullsFirst: false }),
      supabase
        .from("coordination_conflicts")
        .select("id, severity, explanation, detected_at")
        .eq("owner_id", user.id)
        .eq("status", "open")
        .order("detected_at", { ascending: false }),
    ]);

    const firstError = itemsResult.error || conflictsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setItems((itemsResult.data || []) as CoordinationItem[]);
    setConflicts((conflictsResult.data || []) as Conflict[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function addItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !title.trim()) {
      setErrorMessage("Title is required.");
      return;
    }

    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      setErrorMessage("End time must be after start time.");
      return;
    }

    const { error } = await supabase.from("coordination_items").insert({
      owner_id: user.id,
      created_by: user.id,
      product,
      item_type: itemType.trim() || "event",
      title: title.trim(),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      priority,
      flexibility,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTitle("");
    setStartsAt("");
    setEndsAt("");
    setDueAt("");
    setMessage("Coordination item added.");
    await loadData();
  }

  async function detectConflicts() {
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const { data, error } = await supabase.rpc(
      "detect_coordination_time_conflicts",
      {
        target_owner_id: user.id,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage(`${data || 0} conflict record(s) checked.`);
    await loadData();
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-sky-400/20 bg-sky-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-300">
            SchedNest Platform
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Coordination Engine
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            One normalized schedule for Student, Teams, Med, Business,
            Life, and Birdy.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.4fr]">
          <form
            onSubmit={addItem}
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
          >
            <h2 className="text-xl font-black">Add coordination item</h2>

            <div className="mt-5 space-y-4">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={product}
                  onChange={(event) =>
                    setProduct(
                      event.target.value as CoordinationItem["product"]
                    )
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <option value="platform">Platform</option>
                  <option value="student">Student</option>
                  <option value="teams">Teams</option>
                  <option value="med">Med</option>
                  <option value="business">Business</option>
                  <option value="life">Life</option>
                </select>

                <input
                  value={itemType}
                  onChange={(event) => setItemType(event.target.value)}
                  placeholder="Item type"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                />
              </div>

              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              />

              <select
                value={flexibility}
                onChange={(event) =>
                  setFlexibility(
                    event.target
                      .value as CoordinationItem["flexibility"]
                  )
                }
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <option value="fixed">Fixed</option>
                <option value="movable">Movable</option>
                <option value="preferred">Preferred</option>
              </select>

              <label className="block">
                <span className="text-sm text-gray-400">
                  Priority: {priority}
                </span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={priority}
                  onChange={(event) =>
                    setPriority(Number(event.target.value))
                  }
                  className="mt-2 w-full"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl border border-sky-300/20 bg-sky-300/10 px-5 py-3 text-sm font-black text-sky-100"
            >
              Add item
            </button>
          </form>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">Unified schedule</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {items.length} item(s)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void detectConflicts()}
                  className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm font-black text-amber-100"
                >
                  Detect conflicts
                </button>
              </div>

              {message ? (
                <p className="mt-4 text-emerald-200">{message}</p>
              ) : null}

              {errorMessage ? (
                <p className="mt-4 text-red-200">{errorMessage}</p>
              ) : null}

              {loading ? (
                <p className="mt-6 text-sm text-gray-400">
                  Loading schedule...
                </p>
              ) : items.length === 0 ? (
                <p className="mt-6 text-sm text-gray-500">
                  No coordination items yet.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-xs font-bold text-sky-100">
                              {item.product}
                            </span>
                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-gray-400">
                              {item.flexibility}
                            </span>
                          </div>

                          <h3 className="mt-3 font-black">{item.title}</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            {item.starts_at
                              ? formatDate(item.starts_at)
                              : item.due_at
                                ? `Due ${formatDate(item.due_at)}`
                                : "No date"}
                          </p>
                        </div>

                        <span className="text-xs font-black text-gray-500">
                          Priority {item.priority}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black">Open conflicts</h2>

              {conflicts.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  No open conflicts.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {conflicts.map((conflict) => (
                    <article
                      key={conflict.id}
                      className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.05] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <p className="font-black">
                          {conflict.explanation || "Schedule conflict"}
                        </p>
                        <span className="text-xs font-black text-amber-200">
                          {conflict.severity}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
