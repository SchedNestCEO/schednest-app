"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };

type Medication = {
  id: string;
  medication_name: string;
  dosage: string | null;
  instructions: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
  refill_date: string | null;
  prescribing_provider: string | null;
  pharmacy_name: string | null;
  is_active: boolean;
};

type FormState = {
  medicationName: string;
  dosage: string;
  instructions: string;
  frequency: string;
  startDate: string;
  endDate: string;
  refillDate: string;
  prescribingProvider: string;
  pharmacyName: string;
};

const emptyForm: FormState = {
  medicationName: "",
  dosage: "",
  instructions: "",
  frequency: "",
  startDate: "",
  endDate: "",
  refillDate: "",
  prescribingProvider: "",
  pharmacyName: "",
};

export default function MedMedicationsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadMedications = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view medications.");
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
      .from("med_medications")
      .select(
        "id, medication_name, dosage, instructions, frequency, start_date, end_date, refill_date, prescribing_provider, pharmacy_name, is_active"
      )
      .eq("owner_id", user.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setMedications((data || []) as Medication[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMedications();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadMedications]);

  async function addMedication(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    if (!form.medicationName.trim()) {
      setErrorMessage("Medication name is required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("med_medications").insert({
      owner_id: user.id,
      med_profile_id: profile.id,
      medication_name: form.medicationName.trim(),
      dosage: form.dosage.trim() || null,
      instructions: form.instructions.trim() || null,
      frequency: form.frequency.trim() || null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      refill_date: form.refillDate || null,
      prescribing_provider: form.prescribingProvider.trim() || null,
      pharmacy_name: form.pharmacyName.trim() || null,
      is_active: true,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Medication added.");
    await loadMedications();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("med_medications")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMedications((current) =>
      current.map((item) =>
        item.id === id ? { ...item, is_active: isActive } : item
      )
    );
    setMessage(isActive ? "Medication reactivated." : "Medication archived.");
  }

  async function deleteMedication(id: string) {
    const { error } = await supabase
      .from("med_medications")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMedications((current) => current.filter((item) => item.id !== id));
    setMessage("Medication deleted.");
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
        <h2 className="mt-3 text-4xl font-black">Medications</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          Track patient-entered medications, refill dates, and provider instructions.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addMedication}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add a medication</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.medicationName}
              onChange={(e) => setForm((c) => ({ ...c, medicationName: e.target.value }))}
              placeholder="Medication name"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.dosage}
              onChange={(e) => setForm((c) => ({ ...c, dosage: e.target.value }))}
              placeholder="Dosage"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.frequency}
              onChange={(e) => setForm((c) => ({ ...c, frequency: e.target.value }))}
              placeholder="Frequency"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((c) => ({ ...c, instructions: e.target.value }))}
              placeholder="Patient-provided instructions"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <div className="grid gap-4 sm:grid-cols-3">
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
              <input
                type="date"
                value={form.refillDate}
                onChange={(e) => setForm((c) => ({ ...c, refillDate: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </div>
            <input
              value={form.prescribingProvider}
              onChange={(e) => setForm((c) => ({ ...c, prescribingProvider: e.target.value }))}
              placeholder="Prescribing provider"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.pharmacyName}
              onChange={(e) => setForm((c) => ({ ...c, pharmacyName: e.target.value }))}
              placeholder="Pharmacy"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {saving ? "Adding..." : "Add medication"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Your medications</h3>
            <button
              type="button"
              onClick={() => void loadMedications()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading medications...</p>
          ) : medications.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No medications yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {medications.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{item.medication_name}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {item.dosage || "No dosage entered"}
                        {item.frequency ? ` · ${item.frequency}` : ""}
                      </p>
                      {item.refill_date ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Refill: {item.refill_date}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleActive(item.id, !item.is_active)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                      >
                        {item.is_active ? "Archive" : "Reactivate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteMedication(item.id)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <span className={`mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                    item.is_active
                      ? "border-edition-primary/15 bg-edition-primary/10 text-edition-primary-soft"
                      : "border-white/10 text-gray-500"
                  }`}>
                    {item.is_active ? "active" : "archived"}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
