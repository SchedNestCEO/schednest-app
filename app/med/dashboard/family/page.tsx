"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type PermissionMap = Record<string, boolean>;

type SharedPatient = {
  id: string;
  owner_id: string;
  caregiver_email: string;
  relationship: string | null;
  status: "pending" | "accepted" | "declined" | "revoked";
  permissions: PermissionMap;
  med_profiles: { display_name: string | null }[] | null;
};

export default function MedFamilyPage() {
  const supabase = useMemo(() => createClient(), []);
  const [invites, setInvites] = useState<SharedPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadInvites = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view shared care.");
      setLoading(false);
      return;
    }

    const email = user.email?.toLowerCase();

    if (!email) {
      setErrorMessage("Your account needs an email address.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("med_caregiver_access")
      .select(
        "id, owner_id, caregiver_email, relationship, status, permissions, med_profiles(display_name)"
      )
      .or(`caregiver_user_id.eq.${user.id},caregiver_email.ilike.${email}`)
      .neq("status", "revoked")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const normalizedInvites: SharedPatient[] = (data ?? []).map((invite) => ({
      id: invite.id,
      owner_id: invite.owner_id,
      caregiver_email: invite.caregiver_email,
      relationship: invite.relationship,
      status: invite.status as SharedPatient["status"],
      permissions: (invite.permissions ?? {}) as PermissionMap,
      med_profiles: Array.isArray(invite.med_profiles)
        ? invite.med_profiles
        : invite.med_profiles
          ? [invite.med_profiles]
          : [],
    }));

    setInvites(normalizedInvites);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadInvites();
  }, [loadInvites]);

  async function respond(invite: SharedPatient, status: "accepted" | "declined") {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("med_caregiver_access")
      .update({
        caregiver_user_id: user.id,
        status,
        accepted_at: status === "accepted" ? new Date().toISOString() : null,
      })
      .eq("id", invite.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setInvites((current) =>
      current.map((item) =>
        item.id === invite.id ? { ...item, status } : item
      )
    );

    setMessage(
      status === "accepted"
        ? "Care invitation accepted."
        : "Care invitation declined."
    );
  }

  const pending = invites.filter((invite) => invite.status === "pending");
  const accepted = invites.filter((invite) => invite.status === "accepted");

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Family care workspace"
      accent="rose"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-rose-400/20 bg-rose-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-rose-300">
          Caregiver portal
        </p>
        <h2 className="mt-3 text-4xl font-black">Family View</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-rose-50/75">
          Accept care invitations and open the shared dashboard for each patient.
        </p>
      </section>

      {message ? <p className="mt-6 text-emerald-200">{message}</p> : null}
      {errorMessage ? <p className="mt-6 text-red-200">{errorMessage}</p> : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">Pending invitations</h3>

          {loading ? (
            <p className="mt-5 text-sm text-gray-400">Loading invitations...</p>
          ) : pending.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">No pending invitations.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {pending.map((invite) => (
                <div
                  key={invite.id}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <p className="font-black">
                    {invite.med_profiles?.[0]?.display_name || "Shared patient"}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">
                    {invite.relationship || "Caregiver invitation"}
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void respond(invite, "accepted")}
                      className="rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-black text-emerald-100"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => void respond(invite, "declined")}
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-gray-400"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">Patients shared with you</h3>

          {accepted.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No accepted care access yet.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {accepted.map((invite) => (
                <Link
                  key={invite.id}
                  href={`/med/dashboard/family/${invite.owner_id}`}
                  className="block rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-rose-300/20 hover:bg-rose-300/[0.05]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black">
                        {invite.med_profiles?.[0]?.display_name || "Shared patient"}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        {invite.relationship || "Caregiver"}
                      </p>
                    </div>

                    <span className="text-sm font-black text-rose-300">
                      Open dashboard
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {Object.entries(invite.permissions || {})
                      .filter(([, enabled]) => enabled)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="rounded-full border border-rose-300/15 bg-rose-300/10 px-3 py-1 text-xs font-bold text-rose-100"
                        >
                          {key.replaceAll("_", " ")}
                        </span>
                      ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>
    </ProductShell>
  );
}
