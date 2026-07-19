"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };

type Appointment = {
  id: string;
  title: string;
  provider_name: string | null;
  facility_name: string | null;
  appointment_type: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  preparation_instructions: string | null;
  status: "scheduled" | "completed" | "cancelled" | "missed";
};

type FormState = {
  title: string;
  providerName: string;
  facilityName: string;
  appointmentType: string;
  startsAt: string;
  endsAt: string;
  location: string;
  preparationInstructions: string;
};

const emptyForm: FormState = {
  title: "",
  providerName: "",
  facilityName: "",
  appointmentType: "",
  startsAt: "",
  endsAt: "",
  location: "",
  preparationInstructions: "",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MedAppointmentsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view appointments.");
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
      .from("med_appointments")
      .select(
        "id, title, provider_name, facility_name, appointment_type, starts_at, ends_at, location, preparation_instructions, status"
      )
      .eq("owner_id", user.id)
      .order("starts_at", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setAppointments((data || []) as Appointment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAppointments();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAppointments]);

  async function addAppointment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    if (!form.title.trim() || !form.startsAt) {
      setErrorMessage("Title and start time are required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("med_appointments").insert({
      owner_id: user.id,
      med_profile_id: profile.id,
      title: form.title.trim(),
      provider_name: form.providerName.trim() || null,
      facility_name: form.facilityName.trim() || null,
      appointment_type: form.appointmentType.trim() || null,
      starts_at: new Date(form.startsAt).toISOString(),
      ends_at: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      location: form.location.trim() || null,
      preparation_instructions:
        form.preparationInstructions.trim() || null,
      status: "scheduled",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Appointment added.");
    await loadAppointments();
  }

  async function updateStatus(
    id: string,
    status: Appointment["status"]
  ) {
    const { error } = await supabase
      .from("med_appointments")
      .update({ status })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
    setMessage("Appointment updated.");
  }

  async function deleteAppointment(id: string) {
    const { error } = await supabase
      .from("med_appointments")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAppointments((current) => current.filter((item) => item.id !== id));
    setMessage("Appointment deleted.");
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Patient workspace"
      accent="rose"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-rose-300">
          Live Supabase data
        </p>
        <h2 className="mt-3 text-4xl font-black">Appointments</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-rose-50/75">
          Add doctor visits, labs, imaging, follow-ups, locations, and preparation instructions.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addAppointment}
          className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add an appointment</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Cardiology follow-up"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.providerName}
              onChange={(e) => setForm((c) => ({ ...c, providerName: e.target.value }))}
              placeholder="Provider name"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.facilityName}
              onChange={(e) => setForm((c) => ({ ...c, facilityName: e.target.value }))}
              placeholder="Facility name"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <input
              value={form.appointmentType}
              onChange={(e) => setForm((c) => ({ ...c, appointmentType: e.target.value }))}
              placeholder="Appointment type"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
              />
            </div>
            <input
              value={form.location}
              onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
              placeholder="Location"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
            <textarea
              value={form.preparationInstructions}
              onChange={(e) =>
                setForm((c) => ({ ...c, preparationInstructions: e.target.value }))
              }
              placeholder="Preparation instructions"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-5 py-3 text-sm font-black text-rose-100"
          >
            {saving ? "Adding..." : "Add appointment"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Your appointments</h3>
            <button
              type="button"
              onClick={() => void loadAppointments()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading appointments...</p>
          ) : appointments.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No appointments yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {appointments.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{item.title}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {formatDate(item.starts_at)}
                      </p>
                      {item.provider_name ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Provider: {item.provider_name}
                        </p>
                      ) : null}
                      {item.location ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Location: {item.location}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteAppointment(item.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["scheduled", "completed", "cancelled", "missed"] as Appointment["status"][]).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateStatus(item.id, status)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black ${
                          item.status === status
                            ? "border-rose-300/20 bg-rose-300/15 text-rose-100"
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
