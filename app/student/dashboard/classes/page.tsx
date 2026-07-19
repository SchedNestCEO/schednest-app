"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { studentNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type StudentProfile = {
  id: string;
  owner_id: string;
  display_name: string | null;
  school_name: string | null;
  program_name: string | null;
  timezone: string;
};

type StudentCourse = {
  id: string;
  owner_id: string;
  student_profile_id: string;
  name: string;
  course_code: string | null;
  instructor_name: string | null;
  location: string | null;
  color_label: string | null;
  starts_on: string | null;
  ends_on: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
};

type CourseForm = {
  name: string;
  courseCode: string;
  instructorName: string;
  location: string;
};

const emptyForm: CourseForm = {
  name: "",
  courseCode: "",
  instructorName: "",
  location: "",
};

export default function ClassesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view Student classes.");
      setLoading(false);
      return;
    }

    let currentProfile: StudentProfile | null = null;

    const { data: profileData, error: profileError } = await supabase
      .from("student_profiles")
      .select(
        "id, owner_id, display_name, school_name, program_name, timezone"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError) {
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (!profileData) {
      const { data: createdProfile, error: createProfileError } = await supabase
        .from("student_profiles")
        .insert({
          owner_id: user.id,
          display_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Student",
        })
        .select(
          "id, owner_id, display_name, school_name, program_name, timezone"
        )
        .single();

      if (createProfileError) {
        setErrorMessage(createProfileError.message);
        setLoading(false);
        return;
      }

      currentProfile = createdProfile as StudentProfile;
    } else {
      currentProfile = profileData as StudentProfile;
    }

    setProfile(currentProfile);

    const { data: courseData, error: courseError } = await supabase
      .from("student_courses")
      .select(
        "id, owner_id, student_profile_id, name, course_code, instructor_name, location, color_label, starts_on, ends_on, status, created_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (courseError) {
      setErrorMessage(courseError.message);
      setLoading(false);
      return;
    }

    setCourses((courseData || []) as StudentCourse[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadClasses();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadClasses]);

  async function addCourse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setErrorMessage("Course name is required.");
      return;
    }

    if (!profile) {
      setErrorMessage("Student profile is not ready yet.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to add a course.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("student_courses")
      .insert({
        owner_id: user.id,
        student_profile_id: profile.id,
        name: trimmedName,
        course_code: form.courseCode.trim() || null,
        instructor_name: form.instructorName.trim() || null,
        location: form.location.trim() || null,
        status: "active",
      })
      .select(
        "id, owner_id, student_profile_id, name, course_code, instructor_name, location, color_label, starts_on, ends_on, status, created_at"
      )
      .single();

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCourses((current) => [data as StudentCourse, ...current]);
    setForm(emptyForm);
    setMessage("Course added successfully.");
  }

  async function archiveCourse(courseId: string) {
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase
      .from("student_courses")
      .update({ status: "archived" })
      .eq("id", courseId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setCourses((current) =>
      current.map((course) =>
        course.id === courseId
          ? { ...course, status: "archived" }
          : course
      )
    );

    setMessage("Course archived.");
  }

  const activeCourses = courses.filter((course) => course.status === "active");

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

        <h2 className="mt-3 text-4xl font-black">Classes</h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-300">
          Add and organize courses, instructors, course codes, and locations.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addCourse}
          className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add a class</h3>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-gray-300">
                Course name
              </span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Anatomy and Physiology"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">
                Course code
              </span>
              <input
                value={form.courseCode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    courseCode: event.target.value,
                  }))
                }
                placeholder="BIO 201"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-300">
                Instructor
              </span>
              <input
                value={form.instructorName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    instructorName: event.target.value,
                  }))
                }
                placeholder="Professor name"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
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
                placeholder="Building or online"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-sky-300/40"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex rounded-2xl border border-sky-300/20 bg-sky-300/10 px-5 py-3 text-sm font-black text-sky-100 transition hover:bg-sky-300/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add class"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-sky-200/10 bg-white/[0.04] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">Your classes</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeCourses.length} active
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadClasses()}
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
            <p className="mt-6 text-sm text-gray-400">Loading classes...</p>
          ) : activeCourses.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center">
              <p className="font-black">No classes yet</p>
              <p className="mt-2 text-sm text-gray-500">
                Add your first class using the form.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {activeCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-black">{course.name}</h4>

                        {course.course_code ? (
                          <span className="rounded-full border border-sky-300/15 bg-sky-300/10 px-3 py-1 text-xs font-bold text-sky-200">
                            {course.course_code}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-1 text-sm text-gray-400">
                        {course.instructor_name ? (
                          <p>Instructor: {course.instructor_name}</p>
                        ) : null}

                        {course.location ? (
                          <p>Location: {course.location}</p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void archiveCourse(course.id)}
                      className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400 transition hover:border-red-300/20 hover:bg-red-300/10 hover:text-red-100"
                    >
                      Archive
                    </button>
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
