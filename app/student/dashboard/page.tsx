"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../components/products/ProductShell";
import { studentNavItems } from "../../lib/products/navigation";
import { createClient } from "../../lib/supabase/client";

type StudentProfile = {
  display_name: string | null;
  school_name: string | null;
  program_name: string | null;
};

type Course = {
  id: string;
  name: string;
  course_code: string | null;
};

type Assignment = {
  id: string;
  title: string;
  due_at: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "not_started" | "in_progress" | "submitted" | "completed";
};

type Exam = {
  id: string;
  title: string;
  exam_at: string;
  status: "upcoming" | "completed" | "missed" | "cancelled";
};

type StudentImport = {
  id: string;
  source_name: string | null;
  file_name: string | null;
  status: string;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function StudentDashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [imports, setImports] = useState<StudentImport[]>([]);
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
      setErrorMessage("You must be signed in to view the Student dashboard.");
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();

    const [
      profileResult,
      coursesResult,
      assignmentsResult,
      examsResult,
      importsResult,
    ] = await Promise.all([
      supabase
        .from("student_profiles")
        .select("display_name, school_name, program_name")
        .eq("owner_id", user.id)
        .maybeSingle(),
      supabase
        .from("student_courses")
        .select("id, name, course_code")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("student_assignments")
        .select("id, title, due_at, priority, status")
        .eq("owner_id", user.id)
        .neq("status", "completed")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(5),
      supabase
        .from("student_exams")
        .select("id, title, exam_at, status")
        .eq("owner_id", user.id)
        .eq("status", "upcoming")
        .gte("exam_at", now)
        .order("exam_at", { ascending: true })
        .limit(5),
      supabase
        .from("student_imports")
        .select("id, source_name, file_name, status, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const firstError =
      profileResult.error ||
      coursesResult.error ||
      assignmentsResult.error ||
      examsResult.error ||
      importsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setProfile((profileResult.data || null) as StudentProfile | null);
    setCourses((coursesResult.data || []) as Course[]);
    setAssignments((assignmentsResult.data || []) as Assignment[]);
    setExams((examsResult.data || []) as Exam[]);
    setImports((importsResult.data || []) as StudentImport[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const urgentAssignments = assignments.filter(
    (assignment) =>
      assignment.priority === "urgent" || assignment.priority === "high"
  ).length;

  return (
    <ProductShell
      productName="SchedNest Student"
      productLabel="Student workspace"
      accent="sky"
      navItems={[...studentNavItems]}
    >
      <section className="rounded-[2rem] border border-sky-400/20 bg-sky-400/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-300">
          Live Student dashboard
        </p>

        <h2 className="mt-3 text-4xl font-black">
          {profile?.display_name
            ? `Welcome back, ${profile.display_name}`
            : "Plan school without the chaos"}
        </h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          {profile?.school_name || profile?.program_name
            ? [profile.school_name, profile.program_name]
                .filter(Boolean)
                .join(" · ")
            : "Classes, assignments, exams, and imported course information in one place."}
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
            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Active classes</p>
              <p className="mt-2 text-4xl font-black">{courses.length}</p>
            </article>

            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Open assignments</p>
              <p className="mt-2 text-4xl font-black">{assignments.length}</p>
            </article>

            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">High priority</p>
              <p className="mt-2 text-4xl font-black">{urgentAssignments}</p>
            </article>

            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <p className="text-sm text-gray-500">Upcoming exams</p>
              <p className="mt-2 text-4xl font-black">{exams.length}</p>
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Next assignments</h3>
                <Link
                  href="/student/dashboard/assignments"
                  className="text-sm font-black text-sky-300 hover:text-sky-200"
                >
                  View all
                </Link>
              </div>

              {assignments.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  No open assignments.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-black">{assignment.title}</p>
                        <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-xs font-bold text-sky-200">
                          {assignment.priority}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {assignment.due_at
                          ? `Due ${formatDate(assignment.due_at)}`
                          : "No due date"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Upcoming exams</h3>
                <Link
                  href="/student/dashboard/exams"
                  className="text-sm font-black text-sky-300 hover:text-sky-200"
                >
                  View all
                </Link>
              </div>

              {exams.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  No upcoming exams.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <p className="font-black">{exam.title}</p>
                      <p className="mt-2 text-sm text-gray-500">
                        {formatDate(exam.exam_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Active classes</h3>
                <Link
                  href="/student/dashboard/classes"
                  className="text-sm font-black text-sky-300 hover:text-sky-200"
                >
                  Manage
                </Link>
              </div>

              {courses.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  Add your first class to get started.
                </p>
              ) : (
                <div className="mt-5 flex flex-wrap gap-2">
                  {courses.map((course) => (
                    <span
                      key={course.id}
                      className="rounded-full border border-sky-300/15 bg-sky-300/10 px-4 py-2 text-sm font-bold text-sky-100"
                    >
                      {course.course_code
                        ? `${course.course_code} · ${course.name}`
                        : course.name}
                    </span>
                  ))}
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-black">Recent imports</h3>
                <Link
                  href="/student/dashboard/import"
                  className="text-sm font-black text-sky-300 hover:text-sky-200"
                >
                  Import
                </Link>
              </div>

              {imports.length === 0 ? (
                <p className="mt-5 text-sm text-gray-500">
                  No syllabus imports yet.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {imports.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-black">
                          {item.source_name || item.file_name || "Student import"}
                        </p>
                        <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-400">
                          {item.status.replaceAll("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
