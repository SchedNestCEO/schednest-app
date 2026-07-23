"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };

type CareNest = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
};

type FormState = {
  name: string;
  category: string;
  description: string;
  startDate: string;
  endDate: string;
};

const emptyForm: FormState = {
  name: "",
  category: "",
  description: "",
  startDate: "",
  endDate: "",
};

export default function MedCareNestsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [careNests, setCareNests] = useState<CareNest[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCareNests = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view Care Nests.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("med_profiles")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (!profileData) {
      setErrorMessage("Open the Med dashboard first to create your profile.");
      setLoading(false);
      return;
    }

    setProfile(profileData as MedProfile);

    const { data, error } = await supabase
      .from("med_care_nests")
      .select("id, name, category, description, status, start_date, end_date")
      .eq("owner_id", user.id)
      .neq("status", "archived")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setCareNests((data || []) as CareNest[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCareNests();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCareNests]);

  async function addCareNest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage("Care Nest name is required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("med_care_nests").insert({
      owner_id: user.id,
      med_profile_id: profile.id,
      name: form.name.trim(),
      category: form.category.trim() || null,
      description: form.description.trim() || null,
      status: "active",
      start_date: form.startDate || null,
      end_date: form.endDate || null,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Care Nest created.");
    await loadCareNests();
  }

  async function updateStatus(id: string, status: CareNest["status"]) {
    const { error } = await supabase
      .from("med_care_nests")
      .update({ status })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (status === "archived") {
      setCareNests((current) => current.filter((item) => item.id !== id));
    } else {
      setCareNests((current) =>
        current.map((item) => (item.id === id ? { ...item, status } : item))
      );
    }

    setMessage("Care Nest updated.");
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Patient workspace"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Live Supabase data
        </p>
        <h2 className="mt-3 text-4xl font-black">Care Nests</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          Group appointments, medications, documents, and care tasks around one health journey.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addCareNest}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Create a Care Nest</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.name}
              onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              placeholder="Surgery recovery"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.category}
              onChange={(e) => setForm((c) => ({ ...c, category: e.target.value }))}
              placeholder="Category"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
              placeholder="Description"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((c) => ({ ...c, startDate: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((c) => ({ ...c, endDate: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {saving ? "Creating..." : "Create Care Nest"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Your Care Nests</h3>
            <button
              type="button"
              onClick={() => void loadCareNests()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading Care Nests...</p>
          ) : careNests.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No Care Nests yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {careNests.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div>
                    <h4 className="font-black">{item.name}</h4>
                    {item.category ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {item.category}
                      </p>
                    ) : null}
                    {item.description ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["active", "completed", "archived"] as CareNest["status"][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(item.id, status)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          item.status === status
                            ? "border-edition-primary/20 bg-edition-primary/15 text-edition-primary-soft"
                            : "border-white/10 text-gray-500"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
