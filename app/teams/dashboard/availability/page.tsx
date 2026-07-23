"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { teamsNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type Workspace = { id: string; name: string };

type AvailabilityRow = {
  id?: string;
  day_of_week: number;
  available_from: string | null;
  available_until: string | null;
  is_unavailable: boolean;
  notes: string | null;
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function TeamsAvailabilityPage() {
  const supabase = useMemo(() => createClient(), []);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [rows, setRows] = useState<AvailabilityRow[]>(
    days.map((_, index) => ({
      day_of_week: index,
      available_from: "09:00",
      available_until: "17:00",
      is_unavailable: false,
      notes: "",
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadAvailability = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErrorMessage("You must be signed in.");
      setLoading(false);
      return;
    }

    const { data: workspaceData, error: workspaceError } = await supabase
      .from("team_workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (workspaceError || !workspaceData) {
      setErrorMessage(
        workspaceError?.message || "Create your workspace from Members first."
      );
      setLoading(false);
      return;
    }

    setWorkspace(workspaceData as Workspace);

    const { data, error } = await supabase
      .from("team_availability")
      .select(
        "id, day_of_week, available_from, available_until, is_unavailable, notes"
      )
      .eq("workspace_id", workspaceData.id)
      .eq("user_id", user.id)
      .order("day_of_week");

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    const existing = (data || []) as AvailabilityRow[];

    setRows(
      days.map((_, index) => {
        const found = existing.find((item) => item.day_of_week === index);

        return (
          found || {
            day_of_week: index,
            available_from: "09:00",
            available_until: "17:00",
            is_unavailable: false,
            notes: "",
          }
        );
      })
    );

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAvailability();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAvailability]);

  function updateRow(
    dayOfWeek: number,
    changes: Partial<AvailabilityRow>
  ) {
    setRows((current) =>
      current.map((row) =>
        row.day_of_week === dayOfWeek ? { ...row, ...changes } : row
      )
    );
  }

  async function saveAvailability() {
    setSaving(true);
    setMessage("");
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !workspace) {
      setSaving(false);
      setErrorMessage("Workspace is not ready.");
      return;
    }

    const payload = rows.map((row) => ({
      workspace_id: workspace.id,
      user_id: user.id,
      day_of_week: row.day_of_week,
      available_from: row.is_unavailable ? null : row.available_from,
      available_until: row.is_unavailable ? null : row.available_until,
      is_unavailable: row.is_unavailable,
      notes: row.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("team_availability")
      .upsert(payload, {
        onConflict: "workspace_id,user_id,day_of_week",
      });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Availability saved.");
  }

  return (
    <ProductShell
      productName="SchedNest Teams"
      productLabel="Team workspace"
      navItems={[...teamsNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Personal working hours
        </p>
        <h2 className="mt-3 text-4xl font-black">Availability</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Set the hours when you are available for meetings and shifts.
        </p>
      </section>

      <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-black">
          {workspace?.name || "Weekly availability"}
        </h3>

        {loading ? (
          <p className="mt-5 text-sm text-gray-400">Loading availability...</p>
        ) : (
          <div className="mt-5 space-y-3">
            {rows.map((row) => (
              <article
                key={row.day_of_week}
                className="grid gap-4 rounded-2xl border border-white/10 bg-black/10 p-4 lg:grid-cols-[140px_1fr_1fr_1fr_auto]"
              >
                <p className="font-black">{days[row.day_of_week]}</p>

                <input
                  type="time"
                  disabled={row.is_unavailable}
                  value={row.available_from || ""}
                  onChange={(e) =>
                    updateRow(row.day_of_week, {
                      available_from: e.target.value,
                    })
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 disabled:opacity-40"
                />

                <input
                  type="time"
                  disabled={row.is_unavailable}
                  value={row.available_until || ""}
                  onChange={(e) =>
                    updateRow(row.day_of_week, {
                      available_until: e.target.value,
                    })
                  }
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 disabled:opacity-40"
                />

                <input
                  value={row.notes || ""}
                  onChange={(e) =>
                    updateRow(row.day_of_week, { notes: e.target.value })
                  }
                  placeholder="Notes"
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                />

                <label className="flex items-center gap-2 text-sm text-gray-400">
                  <input
                    type="checkbox"
                    checked={row.is_unavailable}
                    onChange={(e) =>
                      updateRow(row.day_of_week, {
                        is_unavailable: e.target.checked,
                      })
                    }
                  />
                  Unavailable
                </label>
              </article>
            ))}
          </div>
        )}

        {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
        {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

        <button
          type="button"
          onClick={() => void saveAvailability()}
          disabled={saving || loading}
          className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
        >
          {saving ? "Saving..." : "Save availability"}
        </button>
      </section>
    </ProductShell>
  );
}
