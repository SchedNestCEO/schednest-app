"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };
type CareNest = { id: string; name: string };

type MedTask = {
  id: string;
  care_nest_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  completed_at: string | null;
  task_type:
    | "general"
    | "lab"
    | "imaging"
    | "refill"
    | "follow_up"
    | "preparation"
    | "insurance"
    | "transportation";
};

type FormState = {
  title: string;
  description: string;
  careNestId: string;
  dueAt: string;
  taskType: MedTask["task_type"];
};

const emptyForm: FormState = {
  title: "",
  description: "",
  careNestId: "",
  dueAt: "",
  taskType: "general",
};

function formatDate(value: string | null) {
  if (!value) return "No due date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MedTasksPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [careNests, setCareNests] = useState<CareNest[]>([]);
  const [tasks, setTasks] = useState<MedTask[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view care tasks.");
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

    const [nestsResult, tasksResult] = await Promise.all([
      supabase
        .from("med_care_nests")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("med_tasks")
        .select("id, care_nest_id, title, description, due_at, completed_at, task_type")
        .eq("owner_id", user.id)
        .order("completed_at", { ascending: true, nullsFirst: true })
        .order("due_at", { ascending: true, nullsFirst: false }),
    ]);

    const firstError = nestsResult.error || tasksResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setCareNests((nestsResult.data || []) as CareNest[]);
    setTasks((tasksResult.data || []) as MedTask[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    if (!form.title.trim()) {
      setErrorMessage("Task title is required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("med_tasks").insert({
      owner_id: user.id,
      med_profile_id: profile.id,
      care_nest_id: form.careNestId || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      task_type: form.taskType,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Care task added.");
    await loadData();
  }

  async function toggleTask(task: MedTask) {
    const completedAt = task.completed_at ? null : new Date().toISOString();

    const { error } = await supabase
      .from("med_tasks")
      .update({ completed_at: completedAt })
      .eq("id", task.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, completed_at: completedAt } : item
      )
    );
    setMessage(completedAt ? "Task completed." : "Task reopened.");
  }

  async function deleteTask(id: string) {
    const { error } = await supabase.from("med_tasks").delete().eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTasks((current) => current.filter((item) => item.id !== id));
    setMessage("Task deleted.");
  }

  const openCount = tasks.filter((task) => !task.completed_at).length;

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
        <h2 className="mt-3 text-4xl font-black">Care Tasks</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-rose-50/75">
          Track labs, imaging, refills, follow-ups, insurance, preparation, and transportation.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addTask}
          className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add a care task</h3>

          <div className="mt-5 space-y-4">
            <input
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
              placeholder="Schedule blood work"
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <select
              value={form.taskType}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  taskType: e.target.value as MedTask["task_type"],
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            >
              <option value="general">General</option>
              <option value="lab">Lab</option>
              <option value="imaging">Imaging</option>
              <option value="refill">Refill</option>
              <option value="follow_up">Follow-up</option>
              <option value="preparation">Preparation</option>
              <option value="insurance">Insurance</option>
              <option value="transportation">Transportation</option>
            </select>

            <select
              value={form.careNestId}
              onChange={(e) =>
                setForm((c) => ({ ...c, careNestId: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            >
              <option value="">No Care Nest</option>
              {careNests.map((nest) => (
                <option key={nest.id} value={nest.id}>
                  {nest.name}
                </option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm((c) => ({ ...c, dueAt: e.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((c) => ({ ...c, description: e.target.value }))
              }
              placeholder="Notes"
              rows={4}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-5 py-3 text-sm font-black text-rose-100"
          >
            {saving ? "Adding..." : "Add task"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-rose-200/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">Your care tasks</h3>
              <p className="mt-1 text-sm text-gray-500">{openCount} open</p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300"
            >
              Refresh
            </button>
          </div>

          {message ? <p className="mt-4 text-emerald-200">{message}</p> : null}
          {errorMessage ? <p className="mt-4 text-red-200">{errorMessage}</p> : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">Loading care tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No care tasks yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className={`rounded-[1.5rem] border border-white/10 bg-black/10 p-5 ${
                    task.completed_at ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">{task.title}</h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {task.task_type.replaceAll("_", " ")} · {formatDate(task.due_at)}
                      </p>
                      {task.description ? (
                        <p className="mt-2 text-sm text-gray-500">
                          {task.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleTask(task)}
                        className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-black text-rose-100"
                      >
                        {task.completed_at ? "Reopen" : "Complete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteTask(task.id)}
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                      >
                        Delete
                      </button>
                    </div>
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
