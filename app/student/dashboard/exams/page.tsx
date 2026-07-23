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

type StudentExam = {
  id: string;
  owner_id: string;
  course_id: string | null;
  title: string;
  exam_at: string;
  location: string | null;
  notes: string | null;
  status: "upcoming" | "completed" | "missed" | "cancelled";
  created_at: string;
  student_courses:
    | {
        name: string;
        course_code: string | null;
      }
    | null;
};

type ExamForm = {
  title: string;
  courseId: string;
  examAt: string;
  location: string;
  notes: string;
};

const emptyForm: ExamForm = {
  title: "",
  courseId: "",
  examAt: "",
  location: "",
  notes: "",
};

const statusLabels: Record<StudentExam["status"], string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
};

function formatExamDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ExamsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [form, setForm] = useState<ExamForm>(emptyForm);
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
      setErrorMessage("You must be signed in to view exams.");
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
          .from("student_exams")
          .select(
            "id, owner_id, course_id, title, exam_at, location, notes, status, created_at, student_courses(name, course_code)"
          )
          .eq("owner_id", user.id)
          .order("exam_at", { ascending: true }),
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
    setExams((data || []) as unknown as StudentExam[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function addExam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const title = form.title.trim();

    if (!title) {
      setErrorMessage("Exam title is required.");
      return;
    }

    if (!form.examAt) {
      setErrorMessage("Exam date and time are required.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to add an exam.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("student_exams").insert({
      owner_id: user.id,
      course_id: form.courseId || null,
      title,
      exam_at: new Date(form.examAt).toISOString(),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      status: "upcoming",
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Exam added successfully.");
    await loadData();
  }

  async function updateStatus(
    examId: string,
    status: StudentExam["status"]
  ) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_exams")
      .update({ status })
      .eq("id", examId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setExams((current) =>
      current.map((exam) =>
        exam.id === examId ? { ...exam, status } : exam
      )
    );

    setMessage("Exam updated.");
  }

  async function deleteExam(examId: string) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_exams")
      .delete()
      .eq("id", examId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setExams((current) => current.filter((exam) => exam.id !== examId));
    setMessage("Exam deleted.");
  }

  const upcomingExams = exams.filter((exam) => exam.status === "upcoming");
  const completedExams = exams.filter((exam) => exam.status === "completed");

  return (
    <ProductShell
      productName="SchedNest Student"
      productLabel="Student workspace"
      navItems={[...studentNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Live Supabase data
        </p>

        <h2 className="mt-3 text-4xl font-black">Exams</h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Track exam dates, course associations, locations, notes, and status.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addExam}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add an exam</h3>

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
                placeholder="Midterm exam"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/40"
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
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-edition-primary/40"
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
              <span className="text-sm font-bold text-gray-300">
                Date and time
              </span>
              <input
                type="datetime-local"
                value={form.examAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    examAt: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-edition-primary/40"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">Location</span>
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    location: event.target.value,
                  }))
                }
                placeholder="Room 204 or online"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/40"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">Notes</span>
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                placeholder="Chapters, materials, or preparation notes"
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/40"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft transition hover:bg-edition-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add exam"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">Your exams</h3>
              <p className="mt-1 text-sm text-gray-500">
                {upcomingExams.length} upcoming · {completedExams.length} completed
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
            <p className="mt-6 text-sm text-gray-400">Loading exams...</p>
          ) : exams.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
              <p className="font-black">No exams yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Add your first exam using the form.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {exams.map((exam) => (
                <article
                  key={exam.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-black">{exam.title}</h4>

                          <span className="rounded-full border border-edition-primary/15 bg-edition-primary/10 px-3 py-1 text-xs font-bold text-edition-primary">
                            {statusLabels[exam.status]}
                          </span>
                        </div>

                        <div className="mt-3 space-y-1 text-sm text-gray-400">
                          {exam.student_courses ? (
                            <p>
                              Course:{" "}
                              {exam.student_courses.course_code
                                ? `${exam.student_courses.course_code} — `
                                : ""}
                              {exam.student_courses.name}
                            </p>
                          ) : null}

                          <p>Date: {formatExamDate(exam.exam_at)}</p>

                          {exam.location ? (
                            <p>Location: {exam.location}</p>
                          ) : null}

                          {exam.notes ? (
                            <p className="pt-2 text-gray-500">{exam.notes}</p>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void deleteExam(exam.id)}
                        className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400 transition hover:border-red-300/20 hover:bg-red-300/10 hover:text-red-100"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "upcoming",
                          "completed",
                          "missed",
                          "cancelled",
                        ] as StudentExam["status"][]
                      ).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => void updateStatus(exam.id, status)}
                          className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                            exam.status === status
                              ? "border-edition-primary/20 bg-edition-primary/15 text-edition-primary-soft"
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
