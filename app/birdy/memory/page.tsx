"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type BirdyMemory = {
  id: string;
  product: "platform" | "student" | "teams" | "med" | "business" | "life";
  memory_type: "session" | "preference" | "behavioral" | "domain" | "sensitive";
  title: string;
  content: string;
  source: "user" | "system" | "birdy" | "integration";
  confidence: number;
  sensitivity: "standard" | "personal" | "sensitive" | "restricted";
  is_active: boolean;
  is_user_confirmed: boolean;
  updated_at: string;
};

type MemorySettings = {
  learning_enabled: boolean;
  preference_memory_enabled: boolean;
  behavioral_memory_enabled: boolean;
  domain_memory_enabled: boolean;
  sensitive_memory_enabled: boolean;
  auto_confirm_low_risk: boolean;
  retention_days: number | null;
};

const defaultSettings: MemorySettings = {
  learning_enabled: true,
  preference_memory_enabled: true,
  behavioral_memory_enabled: true,
  domain_memory_enabled: true,
  sensitive_memory_enabled: false,
  auto_confirm_low_risk: false,
  retention_days: null,
};

export default function BirdyMemoryPage() {
  const supabase = useMemo(() => createClient(), []);
  const [memories, setMemories] = useState<BirdyMemory[]>([]);
  const [settings, setSettings] = useState<MemorySettings>(defaultSettings);
  const [productFilter, setProductFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [memoryType, setMemoryType] =
    useState<BirdyMemory["memory_type"]>("preference");
  const [product, setProduct] =
    useState<BirdyMemory["product"]>("platform");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    let memoriesQuery = supabase
      .from("birdy_memories")
      .select(
        "id, product, memory_type, title, content, source, confidence, sensitivity, is_active, is_user_confirmed, updated_at"
      )
      .eq("owner_id", user.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (productFilter !== "all") {
      memoriesQuery = memoriesQuery.eq("product", productFilter);
    }

    if (typeFilter !== "all") {
      memoriesQuery = memoriesQuery.eq("memory_type", typeFilter);
    }

    const [memoriesResult, settingsResult] = await Promise.all([
      memoriesQuery,
      supabase
        .from("birdy_memory_settings")
        .select(
          "learning_enabled, preference_memory_enabled, behavioral_memory_enabled, domain_memory_enabled, sensitive_memory_enabled, auto_confirm_low_risk, retention_days"
        )
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

    const firstError = memoriesResult.error || settingsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setMemories((memoriesResult.data || []) as BirdyMemory[]);
    setSettings(
      settingsResult.data
        ? (settingsResult.data as MemorySettings)
        : defaultSettings
    );
    setLoading(false);
  }, [productFilter, typeFilter, supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function addMemory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user || !title.trim() || !content.trim()) {
      setErrorMessage("Title and memory content are required.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("birdy_memories").insert({
      owner_id: user.id,
      created_by: user.id,
      product,
      memory_type: memoryType,
      title: title.trim(),
      content: content.trim(),
      source: "user",
      confidence: 1,
      sensitivity: memoryType === "sensitive" ? "sensitive" : "standard",
      is_user_confirmed: true,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTitle("");
    setContent("");
    setMessage("Memory added.");
    await loadData();
  }

  async function confirmMemory(id: string) {
    const { error } = await supabase.rpc("confirm_birdy_memory", {
      target_memory_id: id,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMemories((current) =>
      current.map((memory) =>
        memory.id === id
          ? { ...memory, is_user_confirmed: true }
          : memory
      )
    );
  }

  async function archiveMemory(id: string) {
    const { error } = await supabase.rpc("archive_birdy_memory", {
      target_memory_id: id,
    });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMemories((current) =>
      current.filter((memory) => memory.id !== id)
    );
  }

  async function saveSettings() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("birdy_memory_settings")
      .upsert(
        {
          owner_id: user.id,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" }
      );

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Memory settings saved.");
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[2rem] border border-amber-400/20 bg-amber-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-amber-300">
            Birdy Core
          </p>
          <h1 className="mt-3 text-4xl font-black">Memory</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            See, confirm, add, archive, and control what Birdy remembers.
          </p>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Your memories</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {memories.length} active
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <option value="all">All products</option>
                  <option value="platform">Platform</option>
                  <option value="student">Student</option>
                  <option value="teams">Teams</option>
                  <option value="med">Med</option>
                  <option value="business">Business</option>
                  <option value="life">Life</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <option value="all">All types</option>
                  <option value="session">Session</option>
                  <option value="preference">Preference</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="domain">Domain</option>
                  <option value="sensitive">Sensitive</option>
                </select>
              </div>
            </div>

            {loading ? (
              <p className="mt-6 text-sm text-gray-400">Loading memories...</p>
            ) : memories.length === 0 ? (
              <p className="mt-6 text-sm text-gray-500">No memories yet.</p>
            ) : (
              <div className="mt-6 space-y-3">
                {memories.map((memory) => (
                  <article
                    key={memory.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
                            {memory.product}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                            {memory.memory_type}
                          </span>
                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                            {Math.round(memory.confidence * 100)}% confidence
                          </span>
                        </div>

                        <h3 className="mt-3 font-black">{memory.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-gray-400">
                          {memory.content}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {!memory.is_user_confirmed ? (
                          <button
                            type="button"
                            onClick={() => void confirmMemory(memory.id)}
                            className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100"
                          >
                            Confirm
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void archiveMemory(memory.id)}
                          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                        >
                          Archive
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <div className="space-y-6">
            <form
              onSubmit={addMemory}
              className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
            >
              <h2 className="text-xl font-black">Add memory</h2>

              <div className="mt-5 space-y-4">
                <select
                  value={product}
                  onChange={(e) =>
                    setProduct(e.target.value as BirdyMemory["product"])
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <option value="platform">Platform</option>
                  <option value="student">Student</option>
                  <option value="teams">Teams</option>
                  <option value="med">Med</option>
                  <option value="business">Business</option>
                  <option value="life">Life</option>
                </select>

                <select
                  value={memoryType}
                  onChange={(e) =>
                    setMemoryType(
                      e.target.value as BirdyMemory["memory_type"]
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                >
                  <option value="preference">Preference</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="domain">Domain</option>
                  <option value="session">Session</option>
                  <option value="sensitive">Sensitive</option>
                </select>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Memory title"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                />

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What should Birdy remember?"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-5 w-full rounded-2xl border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-sm font-black text-amber-100"
              >
                {saving ? "Saving..." : "Add memory"}
              </button>
            </form>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black">Memory controls</h2>

              <div className="mt-5 space-y-3">
                {(
                  [
                    ["learning_enabled", "Allow Birdy learning"],
                    ["preference_memory_enabled", "Preference memory"],
                    ["behavioral_memory_enabled", "Behavioral memory"],
                    ["domain_memory_enabled", "Domain memory"],
                    ["sensitive_memory_enabled", "Sensitive memory"],
                    ["auto_confirm_low_risk", "Auto-confirm low-risk memories"],
                  ] as Array<[keyof MemorySettings, string]>
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/10 px-3 py-3"
                  >
                    <span className="text-sm text-gray-300">{label}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settings[key])}
                      onChange={(e) =>
                        setSettings((current) => ({
                          ...current,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>

              <label className="mt-4 block">
                <span className="text-sm text-gray-300">
                  Retention days
                </span>
                <input
                  type="number"
                  min="1"
                  value={settings.retention_days || ""}
                  onChange={(e) =>
                    setSettings((current) => ({
                      ...current,
                      retention_days: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3"
                />
              </label>

              <button
                type="button"
                onClick={() => void saveSettings()}
                className="mt-5 w-full rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300"
              >
                Save controls
              </button>
            </article>
          </div>
        </section>

        {message ? <p className="mt-6 text-emerald-200">{message}</p> : null}
        {errorMessage ? <p className="mt-6 text-red-200">{errorMessage}</p> : null}
      </div>
    </main>
  );
}
