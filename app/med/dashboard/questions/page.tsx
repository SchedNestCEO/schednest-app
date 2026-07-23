"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProductShell from "../../../components/products/ProductShell";
import { medNavItems } from "../../../lib/products/navigation";
import { createClient } from "../../../lib/supabase/client";

type MedProfile = { id: string };
type CareNest = { id: string; name: string };
type Appointment = { id: string; title: string; starts_at: string };

type ProviderQuestion = {
  id: string;
  care_nest_id: string | null;
  appointment_id: string | null;
  question: string;
  answered: boolean;
  answer_notes: string | null;
  created_at: string;
};

type FormState = {
  question: string;
  careNestId: string;
  appointmentId: string;
};

const emptyForm: FormState = {
  question: "",
  careNestId: "",
  appointmentId: "",
};

export default function MedQuestionsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<MedProfile | null>(null);
  const [careNests, setCareNests] = useState<CareNest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [questions, setQuestions] = useState<ProviderQuestion[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in to view provider questions.");
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

    const [nestsResult, appointmentsResult, questionsResult] =
      await Promise.all([
        supabase
          .from("med_care_nests")
          .select("id, name")
          .eq("owner_id", user.id)
          .eq("status", "active")
          .order("name"),
        supabase
          .from("med_appointments")
          .select("id, title, starts_at")
          .eq("owner_id", user.id)
          .eq("status", "scheduled")
          .order("starts_at", { ascending: true }),
        supabase
          .from("med_provider_questions")
          .select(
            "id, care_nest_id, appointment_id, question, answered, answer_notes, created_at"
          )
          .eq("owner_id", user.id)
          .order("answered", { ascending: true })
          .order("created_at", { ascending: false }),
      ]);

    const firstError =
      nestsResult.error || appointmentsResult.error || questionsResult.error;

    if (firstError) {
      setErrorMessage(firstError.message);
      setLoading(false);
      return;
    }

    setCareNests((nestsResult.data || []) as CareNest[]);
    setAppointments((appointmentsResult.data || []) as Appointment[]);
    setQuestions((questionsResult.data || []) as ProviderQuestion[]);

    const drafts: Record<string, string> = {};
    for (const question of (questionsResult.data || []) as ProviderQuestion[]) {
      drafts[question.id] = question.answer_notes || "";
    }
    setAnswerDrafts(drafts);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  async function addQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (!profile) {
      setErrorMessage("Med profile is not ready.");
      return;
    }

    if (!form.question.trim()) {
      setErrorMessage("Question is required.");
      return;
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("You must be signed in.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("med_provider_questions").insert({
      owner_id: user.id,
      med_profile_id: profile.id,
      care_nest_id: form.careNestId || null,
      appointment_id: form.appointmentId || null,
      question: form.question.trim(),
      answered: false,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setForm(emptyForm);
    setMessage("Question added.");
    await loadData();
  }

  async function saveAnswer(question: ProviderQuestion) {
    const answerNotes = answerDrafts[question.id]?.trim() || null;
    const answered = Boolean(answerNotes);

    const { error } = await supabase
      .from("med_provider_questions")
      .update({
        answer_notes: answerNotes,
        answered,
      })
      .eq("id", question.id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setQuestions((current) =>
      current.map((item) =>
        item.id === question.id
          ? { ...item, answer_notes: answerNotes, answered }
          : item
      )
    );
    setMessage("Question updated.");
  }

  async function deleteQuestion(id: string) {
    const { error } = await supabase
      .from("med_provider_questions")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setQuestions((current) => current.filter((item) => item.id !== id));
    setMessage("Question deleted.");
  }

  const unansweredCount = questions.filter((question) => !question.answered).length;

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Patient workspace"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Live Supabase data
        </p>
        <h2 className="mt-3 text-4xl font-black">Questions for My Provider</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          Save questions before appointments and record answer notes afterward.
        </p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={addQuestion}
          className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6"
        >
          <h3 className="text-xl font-black">Add a question</h3>

          <div className="mt-5 space-y-4">
            <textarea
              value={form.question}
              onChange={(e) =>
                setForm((c) => ({ ...c, question: e.target.value }))
              }
              placeholder="What should I ask my provider?"
              rows={5}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            />

            <select
              value={form.appointmentId}
              onChange={(e) =>
                setForm((c) => ({ ...c, appointmentId: e.target.value }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
            >
              <option value="">No appointment</option>
              {appointments.map((appointment) => (
                <option key={appointment.id} value={appointment.id}>
                  {appointment.title}
                </option>
              ))}
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
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft"
          >
            {saving ? "Adding..." : "Add question"}
          </button>
        </form>

        <section className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black">Your questions</h3>
              <p className="mt-1 text-sm text-gray-500">
                {unansweredCount} unanswered
              </p>
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
            <p className="mt-6 text-sm text-gray-400">Loading questions...</p>
          ) : questions.length === 0 ? (
            <p className="mt-6 text-sm text-gray-500">No questions yet.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {questions.map((question) => (
                <article
                  key={question.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <h4 className="font-black">{question.question}</h4>
                      <span
                        className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                          question.answered
                            ? "border-emerald-300/15 bg-emerald-300/10 text-emerald-100"
                            : "border-edition-primary/15 bg-edition-primary/10 text-edition-primary-soft"
                        }`}
                      >
                        {question.answered ? "answered" : "unanswered"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => void deleteQuestion(question.id)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                    >
                      Delete
                    </button>
                  </div>

                  <textarea
                    value={answerDrafts[question.id] || ""}
                    onChange={(e) =>
                      setAnswerDrafts((current) => ({
                        ...current,
                        [question.id]: e.target.value,
                      }))
                    }
                    placeholder="Record the provider's answer"
                    rows={3}
                    className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
                  />

                  <button
                    type="button"
                    onClick={() => void saveAnswer(question)}
                    className="mt-3 rounded-xl border border-edition-primary/20 bg-edition-primary/10 px-4 py-2 text-xs font-black text-edition-primary-soft"
                  >
                    Save answer
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </ProductShell>
  );
}
