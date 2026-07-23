"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type PermissionKey =
  | "view_schedule"
  | "manage_appointments"
  | "view_medications"
  | "manage_medications"
  | "manage_tasks"
  | "view_documents"
  | "upload_documents"
  | "manage_questions"
  | "receive_reminders"
  | "manage_caregivers";

type PermissionMap = Record<PermissionKey, boolean>;

type MedProfile = { id: string };

type CaregiverAccess = {
  id: string;
  caregiver_email: string;
  relationship: string | null;
  status: "pending" | "accepted" | "declined" | "revoked";
  permissions: PermissionMap;
  created_at: string;
};

const defaultPermissions: PermissionMap = {
  view_schedule: true,
  manage_appointments: false,
  view_medications: true,
  manage_medications: false,
  manage_tasks: false,
  view_documents: false,
  upload_documents: false,
  manage_questions: false,
  receive_reminders: true,
  manage_caregivers: false,
};

const permissionLabels: Record<PermissionKey, string> = {
  view_schedule: "View schedule",
  manage_appointments: "Manage appointments",
  view_medications: "View medications",
  manage_medications: "Manage medications",
  manage_tasks: "Manage care tasks",
  view_documents: "View documents",
  upload_documents: "Upload documents",
  manage_questions: "Manage provider questions",
  receive_reminders: "Receive reminders",
  manage_caregivers: "Manage caregivers",
};

export default function MedCaregiversPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [caregivers, setCaregivers] = useState<CaregiverAccess[]>([]);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("");
  const [permissions, setPermissions] =
    useState<PermissionMap>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadCaregivers = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to manage caregivers.");
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
      .from("med_caregiver_access")
      .select("id, caregiver_email, relationship, status, permissions, created_at")
      .eq("owner_id", user.id)
      .neq("status", "revoked")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setCaregivers((data || []) as CaregiverAccess[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCaregivers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadCaregivers]);

  async function inviteCaregiver(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("med_caregiver_access").insert({
      med_profile_id: profile.id,
      owner_id: user.id,
      invited_by: user.id,
      caregiver_email: normalizedEmail,
      relationship: relationship.trim() || null,
      permission_level: permissions.manage_appointments ? "manage" : "view",
      permissions,
      status: "pending",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEmail("");
    setRelationship("");
    setPermissions(defaultPermissions);
    setMessage("Caregiver invitation created.");
    await loadCaregivers();
  }

  async function updatePermission(
    caregiver: CaregiverAccess,
    key: PermissionKey,
    value: boolean
  ) {
    const nextPermissions = {
      ...caregiver.permissions,
      [key]: value,
    };

    const { error } = await supabase
      .from("med_caregiver_access")
      .update({ permissions: nextPermissions })
      .eq("id", caregiver.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCaregivers((current) =>
      current.map((item) =>
        item.id === caregiver.id
          ? { ...item, permissions: nextPermissions }
          : item
      )
    );
    setMessage("Caregiver permissions updated.");
  }

  async function revokeCaregiver(id: string) {
    const { error } = await supabase
      .from("med_caregiver_access")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCaregivers((current) => current.filter((item) => item.id !== id));
    setMessage("Caregiver access revoked.");
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Family care workspace"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Caregiver-first access
        </p>
        <h2 className="mt-3 text-4xl font-black">Caregivers & Family</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          Invite trusted people and control exactly what they can view or manage.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.4fr]">
        <form
          onSubmit={inviteCaregiver}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Invite a caregiver</h3>

          <div className="mt-5 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="caregiver@example.com"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <input
              value={relationship}
              onChange={(event) => setRelationship(event.target.value)}
              placeholder="Relationship, such as daughter or spouse"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-sm font-black text-gray-300">Permissions</p>

            {(Object.keys(permissionLabels) as PermissionKey[]).map((key) => (
              <label
                key={key}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3"
              >
                <span className="text-sm text-gray-300">
                  {permissionLabels[key]}
                </span>
                <input
                  type="checkbox"
                  checked={permissions[key]}
                  onChange={(event) =>
                    setPermissions((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="h-4 w-4"
                />
              </label>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {saving ? "Inviting..." : "Create invitation"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-black">Shared access</h3>
            <button
              type="button"
              onClick={() => void loadCaregivers()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading caregivers...</p>
          ) : caregivers.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No caregivers yet.</p>
          ) : (
            <div className="mt-6 space-y-4">
              {caregivers.map((caregiver) => (
                <article
                  key={caregiver.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{caregiver.caregiver_email}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {caregiver.relationship || "Caregiver"} · {caregiver.status}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void revokeCaregiver(caregiver.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Revoke
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {(Object.keys(permissionLabels) as PermissionKey[]).map(
                      (key) => (
                        <label
                          key={key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2"
                        >
                          <span className="text-xs text-gray-400">
                            {permissionLabels[key]}
                          </span>
                          <input
                            type="checkbox"
                            checked={Boolean(caregiver.permissions?.[key])}
                            onChange={(event) =>
                              void updatePermission(
                                caregiver,
                                key,
                                event.target.checked
                              )
                            }
                            className="h-4 w-4"
                          />
                        </label>
                      )
                    )}
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
