"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { studentNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type StudentCourse = {
  id: string;
  name: string;
  course_code: string | null;
};

type StudentAssignment = {
  id: string;
  owner_id: string;
  course_id: string | null;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "submitted" | "completed";
  completed_at: string | null;
  created_at: string;
  student_courses:
    | {
        name: string;
        course_code: string | null;
      }
    | null;
};

type AssignmentForm = {
  title: string;
  description: string;
  courseId: string;
  dueAt: string;
  priority: StudentAssignment["priority"];
};

const emptyForm: AssignmentForm = {
  title: "",
  description: "",
  courseId: "",
  dueAt: "",
  priority: "medium",
};

const statusLabels: Record<StudentAssignment["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
};

const priorityStyles: Record<StudentAssignment["priority"], string> = {
  low: "border-gray-300/15 bg-gray-300/10 text-gray-200",
  medium: "border-sky-300/15 bg-sky-300/10 text-sky-200",
  high: "border-amber-300/15 bg-amber-300/10 text-amber-100",
  urgent: "border-red-300/15 bg-red-300/10 text-red-100",
};

function formatDueDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AssignmentsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
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
      setErrorMessage("You must be signed in to view assignments.");
      setLoading(false);
      return;
    }

    const [{ data: courseData, error: courseError }, { data, error }] =
      await Promise.all([
        supabase
          .from("student_courses")
          .select("id, name, course_code")
          .eq("owner_id", user.id)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("student_assignments")
          .select(
            "id, owner_id, course_id, title, description, due_at, priority, status, completed_at, created_at, student_courses(name, course_code)"
          )
          .eq("owner_id", user.id)
          .order("due_at", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false }),
      ]);

    if (courseError) {
      setErrorMessage(courseError.message);
      setLoading(false);
      return;
    }

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setCourses((courseData || []) as StudentCourse[]);
    setAssignments((data || []) as unknown as StudentAssignment[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function addAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const title = form.title.trim();

    if (!title) {
      setErrorMessage("Assignment title is required.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to add an assignment.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("student_assignments").insert({
      owner_id: user.id,
      course_id: form.courseId || null,
      title,
      description: form.description.trim() || null,
      due_at: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      priority: form.priority,
      status: "not_started",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Assignment added successfully.");
    await loadData();
  }

  async function updateStatus(
    assignmentId: string,
    status: StudentAssignment["status"]
  ) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_assignments")
      .update({
        status,
        completed_at: status === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", assignmentId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAssignments((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? {
              ...assignment,
              status,
              completed_at:
                status === "completed" ? new Date().toISOString() : null,
            }
          : assignment
      )
    );

    setMessage("Assignment updated.");
  }

  async function deleteAssignment(assignmentId: string) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAssignments((current) =>
      current.filter((assignment) => assignment.id !== assignmentId)
    );
    setMessage("Assignment deleted.");
  }

  const openAssignments = assignments.filter(
    (assignment) => assignment.status !== "completed"
  );
  const completedAssignments = assignments.filter(
    (assignment) => assignment.status === "completed"
  );

  return (
    <ProductShell
      productName="SchedNest Student"
      productLabel="Student workspace"
      accent="sky"
      navItems={[...studentNavItems]}
    >
      <section className="rounded-[2rem] border border-sky-400/20 bg-sky-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-300">
          Live Supabase data
        </p>

        <h2 className="mt-3 text-4xl font-black">Assignments</h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Track coursework, due dates, priorities, progress, and completion.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addAssignment}
          className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add an assignment</h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-gray-300">Title</span>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Chapter 4 discussion post"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">Course</span>
              <select
                value={form.courseId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseId: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-300/40"
              >
                <option value="">No course selected</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code
                      ? `${course.course_code} — ${course.name}`
                      : course.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">Due date</span>
              <input
                type="datetime-local"
                value={form.dueAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueAt: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-300/40"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">Priority</span>
              <select
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.target.value as StudentAssignment["priority"],
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-sky-300/40"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">
                Description
              </span>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Add instructions or notes"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex rounded-2xl border border-sky-300/20 bg-sky-300/10 px-5 py-3 text-sm font-black text-sky-100 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add assignment"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">Your assignments</h3>
              <p className="mt-1 text-sm text-gray-500">
                {openAssignments.length} open · {completedAssignments.length} completed
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              Refresh
            </button>
          </div>

          {message ? (
            <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
              {message}
            </p>
          ) : null}

          {errorMessage ? (
            <p className="mt-4 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-6 text-sm text-gray-400">
              Loading assignments...
            </p>
          ) : assignments.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
              <p className="font-black">No assignments yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Add your first assignment using the form.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {assignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-black">
                            {assignment.title}
                          </h4>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityStyles[assignment.priority]}`}
                          >
                            {assignment.priority}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-gray-400">
                          {assignment.student_courses ? (
                            <p>
                              Course:{" "}
                              {assignment.student_courses.course_code
                                ? `${assignment.student_courses.course_code} — `
                                : ""}
                              {assignment.student_courses.name}
                            </p>
                          ) : null}

                          <p>Due: {formatDueDate(assignment.due_at)}</p>
                          <p>Status: {statusLabels[assignment.status]}</p>

                          {assignment.description ? (
                            <p className="pt-2 text-gray-500">
                              {assignment.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void deleteAssignment(assignment.id)}
                        className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400 transition hover:border-red-300/20 hover:bg-red-300/10 hover:text-red-100"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "not_started",
                          "in_progress",
                          "submitted",
                          "completed",
                        ] as StudentAssignment["status"][]
                      ).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            void updateStatus(assignment.id, status)
                          }
                          className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                            assignment.status === status
                              ? "border-sky-300/20 bg-sky-300/15 text-sky-100"
                              : "border-white/10 text-gray-500 hover:bg-white/[0.06] hover:text-white"
                          }`}
                        >
                          {statusLabels[status]}
                        </button>
                      ))}
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
