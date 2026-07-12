"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../components/products/ProductShell";
import { medNavItems } from "../../lib/products/navigation";
import { medProductConfig } from "../../lib/med/config";
import { createClient } from "../../lib/supabase/client";

type MedProfile = {
  id: string;
  display_name: string | null;
};

type MedAppointment = {
  id: string;
  title: string;
  starts_at: string;
  provider_name: string | null;
  status: "scheduled" | "completed" | "cancelled" | "missed";
};

type MedMedication = {
  id: string;
  medication_name: string;
  dosage: string | null;
  refill_date: string | null;
  is_active: boolean;
};

type MedCareNest = {
  id: string;
  name: string;
  category: string | null;
  status: "active" | "completed" | "archived";
};

type MedTask = {
  id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MedDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [appointments, setAppointments] = useState<MedAppointment[]>([]);
  const [medications, setMedications] = useState<MedMedication[]>([]);
  const [careNests, setCareNests] = useState<MedCareNest[]>([]);
  const [tasks, setTasks] = useState<MedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view SchedNest Med.");
      setLoading(false);
      return;
    }

    let currentProfile: MedProfile | null = null;

    const { data: profileData, error: profileError } = await supabase
      .from("med_profiles")
      .select("id, display_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (!profileData) {
      const { data: createdProfile, error: createProfileError } = await supabase
        .from("med_profiles")
        .insert({
          owner_id: user.id,
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Patient",
        })
        .select("id, display_name")
        .single();

      if (createProfileError) {
        setErrorMessage(createProfileError.message);
        setLoading(false);
        return;
      }

      currentProfile = createdProfile as MedProfile;
    } else {
      currentProfile = profileData as MedProfile;
    }

    setProfile(currentProfile);

    const now = new Date().toISOString();

    const [appointmentsResult, medicationsResult, nestsResult, tasksResult] =
      await Promise.all([
        supabase
          .from("med_appointments")
          .select("id, title, starts_at, provider_name, status")
          .eq("owner_id", user.id)
          .eq("status", "scheduled")
          .gte("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(5),
        supabase
          .from("med_medications")
          .select("id, medication_name, dosage, refill_date, is_active")
          .eq("owner_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("med_care_nests")
          .select("id, name, category, status")
          .eq("owner_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("med_tasks")
          .select("id, title, due_at, completed_at")
          .eq("owner_id", user.id)
          .is("completed_at", null)
          .order("due_at", { ascending: true, nullsFirst: false })
          .limit(5),
      ]);

    const firstError =
      appointmentsResult.error ||
      medicationsResult.error ||
      nestsResult.error ||
      tasksResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setAppointments((appointmentsResult.data || []) as MedAppointment[]);
    setMedications((medicationsResult.data || []) as MedMedication[]);
    setCareNests((nestsResult.data || []) as MedCareNest[]);
    setTasks((tasksResult.data || []) as MedTask[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <ProductShell
      productName={medProductConfig.name}
      productLabel="Patient workspace"
      accent="rose"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-rose-300">
          Live Med dashboard
        </p>

        <h2 className="mt-3 text-4xl font-black">
          {profile?.display_name
            ? `Welcome back, ${profile.display_name}`
            : "Keep every next step organized"}
        </h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-rose-50/75">
          Appointments, medications, care tasks, and Care Nests in one place.
        </p>
      </section>

      {errorMessage ? (
        <p className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-gray-400">Loading dashboard...</p>
      ) : (
        <>
          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Upcoming appointments</p>
              <p className="mt-2 text-4xl font-black">{appointments.length}</p>
            </article>

            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Active medications</p>
              <p className="mt-2 text-4xl font-black">{medications.length}</p>
            </article>

            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Active Care Nests</p>
              <p className="mt-2 text-4xl font-black">{careNests.length}</p>
            </article>

            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Open care tasks</p>
              <p className="mt-2 text-4xl font-black">{tasks.length}</p>
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Next appointments</h3>
                <Link
                  href="/med/dashboard/appointments"
                  className="text-sm font-black text-rose-300 hover:text-rose-200"
                >
                  View all
                </Link>
              </div>

              {appointments.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  No upcoming appointments.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <p className="font-black">{appointment.title}</p>
                      <p className="mt-2 text-sm text-gray-500">
                        {formatDate(appointment.starts_at)}
                      </p>
                      {appointment.provider_name ? (
                        <p className="mt-1 text-sm text-gray-500">
                          {appointment.provider_name}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Active medications</h3>
                <Link
                  href="/med/dashboard/medications"
                  className="text-sm font-black text-rose-300 hover:text-rose-200"
                >
                  View all
                </Link>
              </div>

              {medications.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  No active medications.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {medications.map((medication) => (
                    <div
                      key={medication.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <p className="font-black">{medication.medication_name}</p>
                      <p className="mt-2 text-sm text-gray-500">
                        {medication.dosage || "No dosage entered"}
                      </p>
                      {medication.refill_date ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Refill: {medication.refill_date}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Care Nests</h3>
                <Link
                  href="/med/dashboard/care-nests"
                  className="text-sm font-black text-rose-300 hover:text-rose-200"
                >
                  Manage
                </Link>
              </div>

              {careNests.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  Create your first Care Nest.
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {careNests.map((nest) => (
                    <span
                      key={nest.id}
                      className="rounded-full border border-rose-300/15 bg-rose-300/10 px-4 py-2 text-sm font-bold text-rose-100"
                    >
                      {nest.name}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
              <h3 className="text-xl font-black">Patient safety boundary</h3>
              <p className="mt-3 text-sm leading-6 text-rose-100/55">
                SchedNest Med organizes patient-provided information and
                reminders. It does not diagnose, prescribe, or replace licensed
                medical care.
              </p>
            </article>
          </section>

          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="mt-6 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
          >
            Refresh dashboard
          </button>
        </>
      )}
    </ProductShell>
  );
}
