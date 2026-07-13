"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type PermissionLevel =
  | "observe"
  | "recommend"
  | "ask"
  | "execute"
  | "never";

type RiskLevel =
  | "low"
  | "medium"
  | "high"
  | "prohibited";

type Product =
  | "platform"
  | "student"
  | "teams"
  | "med"
  | "business"
  | "life";

type PermissionRecord = {
  id: string;
  product: Product;
  action_key: string;
  permission_level: PermissionLevel;
  risk_level: RiskLevel;
  requires_confirmation: boolean;
  notes: string | null;
};

const starterActions: Array<{
  product: Product;
  actionKey: string;
  label: string;
  riskLevel: RiskLevel;
}> = [
  {
    product: "student",
    actionKey: "move_study_block",
    label: "Move a study block",
    riskLevel: "low",
  },
  {
    product: "student",
    actionKey: "create_assignment",
    label: "Create an assignment",
    riskLevel: "low",
  },
  {
    product: "teams",
    actionKey: "reschedule_team_meeting",
    label: "Reschedule a team meeting",
    riskLevel: "medium",
  },
  {
    product: "teams",
    actionKey: "approve_request",
    label: "Approve a team request",
    riskLevel: "high",
  },
  {
    product: "med",
    actionKey: "reschedule_appointment",
    label: "Reschedule an appointment",
    riskLevel: "high",
  },
  {
    product: "med",
    actionKey: "change_medication",
    label: "Change medication information",
    riskLevel: "prohibited",
  },
  {
    product: "business",
    actionKey: "move_customer_booking",
    label: "Move a customer booking",
    riskLevel: "high",
  },
  {
    product: "life",
    actionKey: "rebalance_personal_schedule",
    label: "Rebalance personal schedule",
    riskLevel: "medium",
  },
];

function defaultLevel(risk: RiskLevel): PermissionLevel {
  if (risk === "prohibited") return "never";
  if (risk === "high") return "ask";
  if (risk === "medium") return "recommend";
  return "execute";
}

export default function BirdyPermissionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadPermissions = useCallback(async () => {
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
      .from("birdy_action_permissions")
      .select(
        "id, product, action_key, permission_level, risk_level, requires_confirmation, notes"
      )
      .eq("owner_id", user.id)
      .order("product")
      .order("action_key");

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setPermissions((data || []) as PermissionRecord[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  function findPermission(product: Product, actionKey: string) {
    return permissions.find(
      (item) =>
        item.product === product &&
        item.action_key === actionKey
    );
  }

  async function savePermission(
    product: Product,
    actionKey: string,
    riskLevel: RiskLevel,
    permissionLevel: PermissionLevel
  ) {
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

    const requiresConfirmation =
      permissionLevel === "ask" ||
      riskLevel === "high" ||
      riskLevel === "prohibited";

    const { data, error } = await supabase
      .from("birdy_action_permissions")
      .upsert(
        {
          owner_id: user.id,
          product,
          action_key: actionKey,
          permission_level:
            riskLevel === "prohibited" ? "never" : permissionLevel,
          risk_level: riskLevel,
          requires_confirmation: requiresConfirmation,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "owner_id,product,action_key",
        }
      )
      .select(
        "id, product, action_key, permission_level, risk_level, requires_confirmation, notes"
      )
      .single();

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPermissions((current) => {
      const existing = current.some(
        (item) =>
          item.product === product &&
          item.action_key === actionKey
      );

      return existing
        ? current.map((item) =>
            item.product === product &&
            item.action_key === actionKey
              ? (data as PermissionRecord)
              : item
          )
        : [...current, data as PermissionRecord];
    });

    setMessage("Birdy permission saved.");
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[2rem] border border-fuchsia-400/20 bg-fuchsia-400/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-fuchsia-300">
            Birdy Core
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Action Permissions
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
            Control what Birdy may observe, recommend, ask about,
            execute, or never perform.
          </p>
        </section>

        {message ? (
          <p className="mt-6 text-emerald-200">{message}</p>
        ) : null}

        {errorMessage ? (
          <p className="mt-6 text-red-200">{errorMessage}</p>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          {loading ? (
            <p className="text-sm text-gray-400">
              Loading Birdy permissions...
            </p>
          ) : (
            <div className="space-y-3">
              {starterActions.map((action) => {
                const current = findPermission(
                  action.product,
                  action.actionKey
                );

                const selected =
                  current?.permission_level ||
                  defaultLevel(action.riskLevel);

                return (
                  <article
                    key={`${action.product}-${action.actionKey}`}
                    className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-black/10 p-5 lg:grid-cols-[1fr_180px_180px]"
                  >
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-fuchsia-300/15 bg-fuchsia-300/10 px-3 py-1 text-xs font-bold text-fuchsia-100">
                          {action.product}
                        </span>

                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                          {action.riskLevel} risk
                        </span>
                      </div>

                      <h2 className="mt-3 font-black">
                        {action.label}
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        {action.actionKey.replaceAll("_", " ")}
                      </p>
                    </div>

                    <select
                      value={selected}
                      disabled={action.riskLevel === "prohibited"}
                      onChange={(event) =>
                        void savePermission(
                          action.product,
                          action.actionKey,
                          action.riskLevel,
                          event.target.value as PermissionLevel
                        )
                      }
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 disabled:opacity-50"
                    >
                      <option value="observe">Observe only</option>
                      <option value="recommend">Recommend</option>
                      <option value="ask">Ask first</option>
                      <option value="execute">Execute</option>
                      <option value="never">Never</option>
                    </select>

                    <div className="flex items-center">
                      <span className="w-full rounded-xl border border-white/10 px-3 py-3 text-center text-sm font-black text-gray-300">
                        {action.riskLevel === "prohibited"
                          ? "Always blocked"
                          : selected === "execute"
                            ? "May act"
                            : selected === "ask"
                              ? "Approval required"
                              : selected === "recommend"
                                ? "Suggestion only"
                                : selected === "observe"
                                  ? "No action"
                                  : "Blocked"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
