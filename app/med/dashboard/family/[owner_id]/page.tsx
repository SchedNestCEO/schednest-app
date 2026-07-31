"use client";

import {
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ProductShell from "../../../../components/products/ProductShell";
import { medNavItems } from "../../../../lib/products/navigation";
import { createClient } from "../../../../lib/supabase/client";

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

type PermissionMap =
  Record<PermissionKey, boolean>;

type SharedAccess = {
  id: string;
  owner_id: string;
  status:
    | "pending"
    | "accepted"
    | "declined"
    | "revoked";
  relationship: string | null;
  permissions: PermissionMap;
};

type MedProfile = {
  id: string;
  display_name: string | null;
};

type Appointment = {
  id: string;
  title: string;
  starts_at: string;
  provider_name: string | null;
  location: string | null;
  status:
    | "scheduled"
    | "completed"
    | "cancelled"
    | "missed";
};

type Medication = {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  refill_date: string | null;
  is_active: boolean;
};

type MedTask = {
  id: string;
  title: string;
  due_at: string | null;
  completed_at: string | null;
  task_type: string;
};

type MedDocument = {
  id: string;
  title: string;
  document_type: string | null;
  file_url: string;
  notes: string | null;
};

type ProviderQuestion = {
  id: string;
  question: string;
  answered: boolean;
  answer_notes: string | null;
};

type EmergencyContact = {
  name: string;
  relationship: string;
  phone: string;
};

type EmergencyCard = {
  blood_type: string | null;
  allergies: string | null;
  conditions: string | null;
  emergency_contacts: EmergencyContact[];
  preferred_hospital: string | null;
  primary_provider: string | null;
  notes: string | null;
};

type PageProps = {
  params: Promise<{
    owner_id: string;
  }>;
};

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export default function SharedMedDashboardPage({
  params,
}: PageProps) {
  const { owner_id: ownerId } =
    use(params);

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const [access, setAccess] =
    useState<SharedAccess | null>(
      null,
    );

  const [profile, setProfile] =
    useState<MedProfile | null>(
      null,
    );

  const [
    appointments,
    setAppointments,
  ] = useState<Appointment[]>([]);

  const [
    medications,
    setMedications,
  ] = useState<Medication[]>([]);

  const [tasks, setTasks] =
    useState<MedTask[]>([]);

  const [
    documents,
    setDocuments,
  ] = useState<MedDocument[]>([]);

  const [
    questions,
    setQuestions,
  ] = useState<
    ProviderQuestion[]
  >([]);

  const [
    emergencyCard,
    setEmergencyCard,
  ] = useState<
    EmergencyCard | null
  >(null);

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const loadSharedDashboard =
    useCallback(async () => {
      setLoading(true);
      setErrorMessage("");
      setMessage("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        setErrorMessage(
          "Shared care access unavailable.",
        );
        setLoading(false);
        return;
      }

      const email =
        user.email?.toLowerCase();

      if (!email) {
        setErrorMessage(
          "Shared care access unavailable.",
        );
        setLoading(false);
        return;
      }

      const {
        data: accessData,
        error: accessError,
      } = await supabase
        .from(
          "med_caregiver_access",
        )
        .select(
          "id, owner_id, status, relationship, permissions",
        )
        .eq(
          "owner_id",
          ownerId,
        )
        .or(
          `caregiver_user_id.eq.${user.id},caregiver_email.ilike.${email}`,
        )
        .maybeSingle();

      if (
        accessError ||
        !accessData ||
        accessData.status !==
          "accepted"
      ) {
        setErrorMessage(
          "Shared care access unavailable.",
        );
        setLoading(false);
        return;
      }

      const normalizedAccess =
        accessData as SharedAccess;

      setAccess(
        normalizedAccess,
      );

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("med_profiles")
        .select(
          "id, display_name",
        )
        .eq(
          "owner_id",
          ownerId,
        )
        .maybeSingle();

      if (
        profileError ||
        !profileData
      ) {
        setErrorMessage(
          "Shared care access unavailable.",
        );
        setLoading(false);
        return;
      }

      setProfile(
        profileData as MedProfile,
      );

      const permissions =
        normalizedAccess.permissions;

      const results =
        await Promise.all([
          permissions.view_schedule
            ? supabase
                .from(
                  "med_appointments",
                )
                .select(
                  "id, title, starts_at, provider_name, location, status",
                )
                .eq(
                  "owner_id",
                  ownerId,
                )
                .order(
                  "starts_at",
                  {
                    ascending: true,
                  },
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          permissions.view_medications
            ? supabase
                .from(
                  "med_medications",
                )
                .select(
                  "id, medication_name, dosage, frequency, refill_date, is_active",
                )
                .eq(
                  "owner_id",
                  ownerId,
                )
                .order(
                  "is_active",
                  {
                    ascending: false,
                  },
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          permissions.manage_tasks
            ? supabase
                .from("med_tasks")
                .select(
                  "id, title, due_at, completed_at, task_type",
                )
                .eq(
                  "owner_id",
                  ownerId,
                )
                .order(
                  "completed_at",
                  {
                    ascending: true,
                    nullsFirst:
                      true,
                  },
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          permissions.view_documents
            ? supabase
                .from(
                  "med_documents",
                )
                .select(
                  "id, title, document_type, file_url, notes",
                )
                .eq(
                  "owner_id",
                  ownerId,
                )
                .order(
                  "created_at",
                  {
                    ascending: false,
                  },
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          permissions.manage_questions
            ? supabase
                .from(
                  "med_provider_questions",
                )
                .select(
                  "id, question, answered, answer_notes",
                )
                .eq(
                  "owner_id",
                  ownerId,
                )
                .order(
                  "answered",
                  {
                    ascending: true,
                  },
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          permissions.view_medications
            ? supabase
                .from(
                  "med_emergency_cards",
                )
                .select(
                  "blood_type, allergies, conditions, emergency_contacts, preferred_hospital, primary_provider, notes",
                )
                .eq(
                  "owner_id",
                  ownerId,
                )
                .maybeSingle()
            : Promise.resolve({
                data: null,
                error: null,
              }),
        ]);

      const firstError =
        results.find(
          (result) =>
            result.error,
        )?.error;

      if (firstError) {
        setErrorMessage(
          firstError.message,
        );
        setLoading(false);
        return;
      }

      setAppointments(
        (results[0].data ||
          []) as Appointment[],
      );

      setMedications(
        (results[1].data ||
          []) as Medication[],
      );

      setTasks(
        (results[2].data ||
          []) as MedTask[],
      );

      setDocuments(
        (results[3].data ||
          []) as MedDocument[],
      );

      setQuestions(
        (results[4].data ||
          []) as ProviderQuestion[],
      );

      setEmergencyCard(
        results[5].data
          ? (results[5]
              .data as EmergencyCard)
          : null,
      );

      setLoading(false);
    }, [
      ownerId,
      supabase,
    ]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(
        () => {
          void loadSharedDashboard();
        },
        0,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [loadSharedDashboard]);


  async function updateAppointmentStatus(
    appointmentId: string,
    status: Appointment["status"],
  ) {
    if (
      !access?.permissions
        .manage_appointments
    ) {
      setErrorMessage(
        "You do not have permission to manage appointments.",
      );
      return;
    }

    const { error } =
      await supabase
        .from(
          "med_appointments",
        )
        .update({ status })
        .eq(
          "id",
          appointmentId,
        )
        .eq(
          "owner_id",
          ownerId,
        );

    if (error) {
      setErrorMessage(
        error.message,
      );
      return;
    }

    setAppointments(
      (current) =>
        current.map(
          (appointment) =>
            appointment.id ===
            appointmentId
              ? {
                  ...appointment,
                  status,
                }
              : appointment,
        ),
    );

    setMessage(
      "Appointment updated.",
    );
  }

  async function toggleMedication(
    medication: Medication,
  ) {
    if (
      !access?.permissions
        .manage_medications
    ) {
      setErrorMessage(
        "You do not have permission to manage medications.",
      );
      return;
    }

    const nextActive =
      !medication.is_active;

    const { error } =
      await supabase
        .from(
          "med_medications",
        )
        .update({
          is_active:
            nextActive,
        })
        .eq(
          "id",
          medication.id,
        )
        .eq(
          "owner_id",
          ownerId,
        );

    if (error) {
      setErrorMessage(
        error.message,
      );
      return;
    }

    setMedications(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            medication.id
              ? {
                  ...item,
                  is_active:
                    nextActive,
                }
              : item,
        ),
    );

    setMessage(
      nextActive
        ? "Medication reactivated."
        : "Medication archived.",
    );
  }

  async function toggleTask(
    task: MedTask,
  ) {
    if (
      !access?.permissions
        .manage_tasks
    ) {
      setErrorMessage(
        "You do not have permission to manage care tasks.",
      );
      return;
    }

    const completedAt =
      task.completed_at
        ? null
        : new Date()
            .toISOString();

    const { error } =
      await supabase
        .from("med_tasks")
        .update({
          completed_at:
            completedAt,
        })
        .eq("id", task.id)
        .eq(
          "owner_id",
          ownerId,
        );

    if (error) {
      setErrorMessage(
        error.message,
      );
      return;
    }

    setTasks(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            task.id
              ? {
                  ...item,
                  completed_at:
                    completedAt,
                }
              : item,
        ),
    );

    setMessage(
      completedAt
        ? "Task completed."
        : "Task reopened.",
    );
  }

  async function saveQuestion(
    question: ProviderQuestion,
    answerNotes: string,
  ) {
    if (
      !access?.permissions
        .manage_questions
    ) {
      setErrorMessage(
        "You do not have permission to manage provider questions.",
      );
      return;
    }

    const normalizedAnswer =
      answerNotes.trim() ||
      null;

    const { error } =
      await supabase
        .from(
          "med_provider_questions",
        )
        .update({
          answer_notes:
            normalizedAnswer,
          answered:
            Boolean(
              normalizedAnswer,
            ),
        })
        .eq(
          "id",
          question.id,
        )
        .eq(
          "owner_id",
          ownerId,
        );

    if (error) {
      setErrorMessage(
        error.message,
      );
      return;
    }

    setQuestions(
      (current) =>
        current.map(
          (item) =>
            item.id ===
            question.id
              ? {
                  ...item,
                  answer_notes:
                    normalizedAnswer,
                  answered:
                    Boolean(
                      normalizedAnswer,
                    ),
                }
              : item,
        ),
    );

    setMessage(
      "Question updated.",
    );
  }

  async function openDocument(
    document: MedDocument,
  ) {
    if (
      !access?.permissions
        .view_documents
    ) {
      setErrorMessage(
        "You do not have permission to view documents.",
      );
      return;
    }

    const { data, error } =
      await supabase.storage
        .from("med-documents")
        .createSignedUrl(
          document.file_url,
          60,
        );

    if (
      error ||
      !data?.signedUrl
    ) {
      setErrorMessage(
        error?.message ||
          "Could not open document.",
      );
      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (loading) {
    return (
      <ProductShell
        productName="SchedNest Med"
        productLabel="Family care workspace"
        navItems={[...medNavItems]}
      >
        <p className="mt-6 text-sm text-gray-400">
          Loading shared care dashboard...
        </p>
      </ProductShell>
    );
  }

  if (
    errorMessage ||
    !access ||
    !profile
  ) {
    return (
      <ProductShell
        productName="SchedNest Med"
        productLabel="Family care workspace"
        navItems={[...medNavItems]}
      >
        <section className="rounded-[2rem] border border-red-300/20 bg-red-300/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-red-200">
            Access boundary
          </p>

          <h2 className="mt-3 text-4xl font-black">
            Shared care access unavailable
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-red-100/75">
            This invitation may be pending, declined, revoked, or assigned to
            another caregiver.
          </p>
        </section>
      </ProductShell>
    );
  }

  return (
    <ProductShell
      productName="SchedNest Med"
      productLabel="Family care workspace"
      navItems={[...medNavItems]}
    >
      <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-7">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
          Shared patient dashboard
        </p>

        <h2 className="mt-3 text-4xl font-black">
          {profile.display_name || "Shared patient"}
        </h2>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75">
          {access.relationship || "Caregiver"} access is limited to the
          permissions granted by this patient.
        </p>
      </section>

      {message ? (
        <p className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-6 rounded-2xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      ) : null}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <p className="text-sm text-gray-500">
            Visible appointments
          </p>
          <p className="mt-2 text-4xl font-black">
            {appointments.length}
          </p>
        </article>

        <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <p className="text-sm text-gray-500">
            Visible medications
          </p>
          <p className="mt-2 text-4xl font-black">
            {medications.length}
          </p>
        </article>

        <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <p className="text-sm text-gray-500">
            Manageable tasks
          </p>
          <p className="mt-2 text-4xl font-black">
            {tasks.length}
          </p>
        </article>

        <article className="rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <p className="text-sm text-gray-500">
            Visible documents
          </p>
          <p className="mt-2 text-4xl font-black">
            {documents.length}
          </p>
        </article>
      </section>

      {access.permissions.view_schedule ? (
        <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">
            Appointments
          </h3>

          {appointments.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No visible appointments.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {appointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">
                        {appointment.title}
                      </h4>

                      <p className="mt-2 text-sm text-gray-500">
                        {formatDate(appointment.starts_at)}
                      </p>

                      {appointment.provider_name ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Provider: {appointment.provider_name}
                        </p>
                      ) : null}

                      {appointment.location ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Location: {appointment.location}
                        </p>
                      ) : null}
                    </div>

                    <span className="rounded-full border border-edition-primary/15 bg-edition-primary/10 px-3 py-1 text-xs font-bold text-edition-primary-soft">
                      {appointment.status}
                    </span>
                  </div>

                  {access.permissions.manage_appointments ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(
                        [
                          "scheduled",
                          "completed",
                          "cancelled",
                          "missed",
                        ] as Appointment["status"][]
                      ).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() =>
                            void updateAppointmentStatus(
                              appointment.id,
                              status,
                            )
                          }
                          className={`rounded-xl border px-3 py-2 text-xs font-black ${
                            appointment.status === status
                              ? "border-edition-primary/20 bg-edition-primary/15 text-edition-primary-soft"
                              : "border-white/10 text-gray-500"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {access.permissions.view_medications ? (
        <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">
            Medications
          </h3>

          {medications.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No visible medications.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {medications.map((medication) => (
                <article
                  key={medication.id}
                  className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">
                        {medication.medication_name}
                      </h4>

                      <p className="mt-2 text-sm text-gray-500">
                        {medication.dosage || "No dosage entered"}
                        {medication.frequency
                          ? ` · ${medication.frequency}`
                          : ""}
                      </p>

                      {medication.refill_date ? (
                        <p className="mt-1 text-sm text-gray-500">
                          Refill: {medication.refill_date}
                        </p>
                      ) : null}
                    </div>

                    {access.permissions.manage_medications ? (
                      <button
                        type="button"
                        onClick={() =>
                          void toggleMedication(medication)
                        }
                        className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-gray-400"
                      >
                        {medication.is_active
                          ? "Archive"
                          : "Reactivate"}
                      </button>
                    ) : null}
                  </div>

                  <span className="mt-4 inline-flex rounded-full border border-edition-primary/15 bg-edition-primary/10 px-3 py-1 text-xs font-bold text-edition-primary-soft">
                    {medication.is_active
                      ? "active"
                      : "archived"}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {access.permissions.manage_tasks ? (
        <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">
            Care Tasks
          </h3>

          {tasks.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No manageable care tasks.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {tasks.map((task) => (
                <article
                  key={task.id}
                  className={`rounded-[1.5rem] border border-white/10 bg-black/10 p-5 ${
                    task.completed_at
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h4 className="font-black">
                        {task.title}
                      </h4>

                      <p className="mt-2 text-sm text-gray-500">
                        {task.task_type.replaceAll(
                          "_",
                          " ",
                        )}{" "}
                        ·{" "}
                        {formatDate(
                          task.due_at,
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        void toggleTask(
                          task,
                        )
                      }
                      className="rounded-xl border border-edition-primary/20 bg-edition-primary/10 px-3 py-2 text-xs font-black text-edition-primary-soft"
                    >
                      {task.completed_at
                        ? "Reopen"
                        : "Complete"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {access.permissions.view_documents ? (
        <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">
            Documents
          </h3>

          {documents.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No visible documents.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {documents.map(
                (document) => (
                  <article
                    key={document.id}
                    className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h4 className="font-black">
                          {document.title}
                        </h4>

                        <p className="mt-2 text-sm text-gray-500">
                          {document.document_type ||
                            "Document"}
                        </p>

                        {document.notes ? (
                          <p className="mt-2 text-sm text-gray-500">
                            {document.notes}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          void openDocument(
                            document,
                          )
                        }
                        className="rounded-xl border border-edition-primary/20 bg-edition-primary/10 px-3 py-2 text-xs font-black text-edition-primary-soft"
                      >
                        Open
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </section>
      ) : null}

      {access.permissions.manage_questions ? (
        <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">
            Provider Questions
          </h3>

          {questions.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">
              No manageable provider questions.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {questions.map(
                (question) => (
                  <QuestionEditor
                    key={question.id}
                    question={question}
                    onSave={
                      saveQuestion
                    }
                  />
                ),
              )}
            </div>
          )}
        </section>
      ) : null}

      {access.permissions
        .view_medications &&
      emergencyCard ? (
        <section className="mt-6 rounded-[2rem] border border-edition-primary/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">
            Shared Emergency Card
          </h3>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-gray-500">
                Blood type
              </p>
              <p className="mt-2 font-black">
                {emergencyCard.blood_type ||
                  "Not entered"}
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <p className="text-sm text-gray-500">
                Primary provider
              </p>
              <p className="mt-2 font-black">
                {emergencyCard.primary_provider ||
                  "Not entered"}
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:col-span-2">
              <p className="text-sm text-gray-500">
                Allergies
              </p>
              <p className="mt-2 font-black">
                {emergencyCard.allergies ||
                  "None entered"}
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:col-span-2">
              <p className="text-sm text-gray-500">
                Medical conditions
              </p>
              <p className="mt-2 font-black">
                {emergencyCard.conditions ||
                  "None entered"}
              </p>
            </article>

            {emergencyCard.preferred_hospital ? (
              <article className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:col-span-2">
                <p className="text-sm text-gray-500">
                  Preferred hospital
                </p>
                <p className="mt-2 font-black">
                  {
                    emergencyCard.preferred_hospital
                  }
                </p>
              </article>
            ) : null}

            {emergencyCard.notes ? (
              <article className="rounded-2xl border border-white/10 bg-black/10 p-4 sm:col-span-2">
                <p className="text-sm text-gray-500">
                  Emergency notes
                </p>
                <p className="mt-2 font-black">
                  {emergencyCard.notes}
                </p>
              </article>
            ) : null}
          </div>

          {emergencyCard
            .emergency_contacts
            .length > 0 ? (
            <div className="mt-5 space-y-3">
              {emergencyCard
                .emergency_contacts
                .map(
                  (
                    contact,
                    index,
                  ) => (
                    <article
                      key={`${contact.name}-${index}`}
                      className="rounded-2xl border border-white/10 bg-black/10 p-4"
                    >
                      <p className="font-black">
                        {contact.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {contact.relationship ||
                          "Emergency contact"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {contact.phone}
                      </p>
                    </article>
                  ),
                )}
            </div>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() =>
          void loadSharedDashboard()
        }
        className="mt-6 rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/[0.06] hover:text-white"
      >
        Refresh shared dashboard
      </button>
    </ProductShell>
  );
}

type QuestionEditorProps = {
  question: ProviderQuestion;
  onSave: (
    question: ProviderQuestion,
    answerNotes: string,
  ) => Promise<void>;
};

function QuestionEditor({
  question,
  onSave,
}: QuestionEditorProps) {
  const [
    answerNotes,
    setAnswerNotes,
  ] = useState(
    question.answer_notes || "",
  );

  return (
    <article className="rounded-[1.5rem] border border-white/10 bg-black/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="font-black">
            {question.question}
          </h4>

          <p className="mt-2 text-sm text-gray-500">
            {question.answered
              ? "Answered"
              : "Unanswered"}
          </p>
        </div>
      </div>

      <textarea
        value={answerNotes}
        onChange={(event) =>
          setAnswerNotes(
            event.target.value,
          )
        }
        placeholder="Answer notes"
        rows={4}
        className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white"
      />

      <button
        type="button"
        onClick={() =>
          void onSave(
            question,
            answerNotes,
          )
        }
        className="mt-4 rounded-xl border border-edition-primary/20 bg-edition-primary/10 px-4 py-2 text-xs font-black text-edition-primary-soft"
      >
        Save answer
      </button>
    </article>
  );
}
