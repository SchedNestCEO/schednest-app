"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BookingTimeMode = "fixed_hours" | "flexible_requests";

type BusinessProfile = {
  id: string;
  business_name: string | null;
  slug: string | null;
  booking_time_mode: BookingTimeMode | null;
  business_hours_enabled: boolean | null;
};

type BusinessHour = {
  id?: string;
  business_id?: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

type ServiceOption = {
  id: string;
  name: string;
};

type BookingQuestion = {
  id: string;
  business_id: string;
  owner_id: string;
  service_id: string | null;
  question_label: string;
  question_type: "short_text" | "long_text" | "select" | "checkbox";
  options: string[];
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
};

const defaultHours: BusinessHour[] = [
  {
    day_of_week: 1,
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: 2,
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: 3,
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: 4,
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: 5,
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: 6,
    is_open: false,
    open_time: null,
    close_time: null,
  },
  {
    day_of_week: 0,
    is_open: false,
    open_time: null,
    close_time: null,
  },
];

const dayLabels: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

function normalizeDayOfWeek(value: unknown) {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const cleanValue = value.toLowerCase().trim();

    if (cleanValue === "sunday" || cleanValue === "sun" || cleanValue === "0") return 0;
    if (cleanValue === "monday" || cleanValue === "mon" || cleanValue === "1") return 1;
    if (cleanValue === "tuesday" || cleanValue === "tue" || cleanValue === "2") return 2;
    if (cleanValue === "wednesday" || cleanValue === "wed" || cleanValue === "3") return 3;
    if (cleanValue === "thursday" || cleanValue === "thu" || cleanValue === "4") return 4;
    if (cleanValue === "friday" || cleanValue === "fri" || cleanValue === "5") return 5;
    if (cleanValue === "saturday" || cleanValue === "sat" || cleanValue === "6") return 6;
  }

  return null;
}

function getDayLabel(day: number) {
  return dayLabels[day] || `Day ${day}`;
}

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hour24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const value = `${String(hour24).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const label = `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;

  return { value, label };
});

function normalizeTimeValue(value: string | null) {
  if (!value) return "";

  return value.slice(0, 5);
}

function formatTimeLabel(value: string | null) {
  if (!value) return "Not set";

  const found = timeOptions.find((option) => option.value === value.slice(0, 5));
  return found?.label || value.slice(0, 5);
}

function parseQuestionOptions(value: string) {
  return value
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
}

function normalizeQuestionOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export default function BookingPageSettings() {
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [slug, setSlug] = useState("");
  const [hours, setHours] = useState<BusinessHour[]>(defaultHours);
  const [origin, setOrigin] = useState("");
  const [bookingTimeMode, setBookingTimeMode] =
    useState<BookingTimeMode>("fixed_hours");
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [isSavingBookingMode, setIsSavingBookingMode] = useState(false);
  const [message, setMessage] = useState("");

  const [services, setServices] = useState<ServiceOption[]>([]);
  const [bookingQuestions, setBookingQuestions] = useState<BookingQuestion[]>(
    []
  );
  const [questionLabel, setQuestionLabel] = useState("");
  const [questionType, setQuestionType] =
    useState<BookingQuestion["question_type"]>("short_text");
  const [questionOptions, setQuestionOptions] = useState("");
  const [questionServiceId, setQuestionServiceId] = useState("all");
  const [questionRequired, setQuestionRequired] = useState(false);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  const [updatingQuestionId, setUpdatingQuestionId] = useState<string | null>(
    null
  );

  const cleanSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const publicBookingUrl =
    cleanSlug && origin ? `${origin}/book/${cleanSlug}` : "";

  const openDays = hours.filter((hour) => hour.is_open);
  const hasOpenHours = openDays.length > 0;

  async function loadBookingPageSettings() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      return;
    }

    const { data: businessProfile, error: profileError } = await supabase
      .from("business_profiles")
      .select(
        "id, business_name, slug, booking_time_mode, business_hours_enabled"
      )
      .eq("owner_id", user.id)
      .single();

    if (profileError || !businessProfile) {
      setMessage("Could not load your business profile.");
      setIsLoading(false);
      return;
    }

    const safeProfile = businessProfile as BusinessProfile;

    setProfile(safeProfile);
    setSlug(safeProfile.slug || "");
    setBookingTimeMode(safeProfile.booking_time_mode || "fixed_hours");
    setBusinessHoursEnabled(safeProfile.business_hours_enabled !== false);

    const { data: existingHours, error: hoursError } = await supabase
      .from("business_hours")
      .select("id, business_id, day_of_week, is_open, open_time, close_time")
      .eq("business_id", safeProfile.id);

    if (!hoursError && existingHours && existingHours.length > 0) {
      const orderedHours = defaultHours.map((defaultDay) => {
        const found = existingHours.find(
          (item) => normalizeDayOfWeek(item.day_of_week) === defaultDay.day_of_week
        );

        if (!found) return defaultDay;

        return {
          ...found,
          day_of_week: defaultDay.day_of_week,
          open_time: normalizeTimeValue(found.open_time),
          close_time: normalizeTimeValue(found.close_time),
        };
      });

      setHours(orderedHours);
    } else {
      setHours(defaultHours);
    }

    const { data: serviceData } = await supabase
      .from("services")
      .select("id, name")
      .eq("business_id", safeProfile.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    setServices((serviceData || []) as ServiceOption[]);

    const { data: questionData, error: questionError } = await supabase
      .from("booking_questions")
      .select(
        "id, business_id, owner_id, service_id, question_label, question_type, options, is_required, is_active, sort_order"
      )
      .eq("business_id", safeProfile.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (questionError) {
      setMessage(questionError.message);
    } else {
      setBookingQuestions(
        ((questionData || []) as BookingQuestion[]).map((question) => ({
          ...question,
          options: normalizeQuestionOptions(question.options),
        }))
      );
    }

    setIsLoading(false);
  }

  async function saveBookingMode() {
    if (!profile) return;

    setIsSavingBookingMode(true);
    setMessage("");

    const { error } = await supabase
      .from("business_profiles")
      .update({
        booking_time_mode: bookingTimeMode,
        business_hours_enabled: businessHoursEnabled,
      })
      .eq("id", profile.id);

    if (error) {
      setMessage(error.message);
      setIsSavingBookingMode(false);
      return;
    }

    setProfile({
      ...profile,
      booking_time_mode: bookingTimeMode,
      business_hours_enabled: businessHoursEnabled,
    });

    setMessage("Booking page settings saved.");
    setIsSavingBookingMode(false);
  }

  async function saveHours() {
    if (!profile) return;

    setIsSavingHours(true);
    setMessage("");

    const rows = hours.map((item) => ({
      business_id: profile.id,
      day_of_week: item.day_of_week,
      is_open: item.is_open,
      open_time: item.is_open ? item.open_time || "09:00" : null,
      close_time: item.is_open ? item.close_time || "17:00" : null,
    }));

    const { error } = await supabase.from("business_hours").upsert(rows, {
      onConflict: "business_id,day_of_week",
    });

    if (error) {
      setMessage(error.message);
      setIsSavingHours(false);
      return;
    }

    setMessage("Business hours saved.");
    setIsSavingHours(false);
  }

  function getServiceName(serviceId: string | null) {
    if (!serviceId) return "All services";

    return (
      services.find((service) => service.id === serviceId)?.name ||
      "Selected service"
    );
  }

  async function saveBookingQuestion() {
    if (!profile) return;

    if (!questionLabel.trim()) {
      setMessage("Question label is required.");
      return;
    }

    const parsedOptions = parseQuestionOptions(questionOptions);

    if (questionType === "select" && parsedOptions.length === 0) {
      setMessage("Add at least one comma-separated option for select questions.");
      return;
    }

    setIsSavingQuestion(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please sign in again before saving questions.");
      setIsSavingQuestion(false);
      return;
    }

    const { error } = await supabase.from("booking_questions").insert({
      business_id: profile.id,
      owner_id: user.id,
      service_id: questionServiceId === "all" ? null : questionServiceId,
      question_label: questionLabel.trim(),
      question_type: questionType,
      options: questionType === "select" ? parsedOptions : [],
      is_required: questionRequired,
      is_active: true,
      sort_order: bookingQuestions.length,
    });

    if (error) {
      setMessage(error.message);
      setIsSavingQuestion(false);
      return;
    }

    setQuestionLabel("");
    setQuestionType("short_text");
    setQuestionOptions("");
    setQuestionServiceId("all");
    setQuestionRequired(false);
    setMessage("Booking question added.");
    await loadBookingPageSettings();
    setIsSavingQuestion(false);
  }

  async function toggleBookingQuestion(question: BookingQuestion) {
    setUpdatingQuestionId(question.id);
    setMessage("");

    const { error } = await supabase
      .from("booking_questions")
      .update({
        is_active: !question.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", question.id)
      .eq("business_id", question.business_id);

    if (error) {
      setMessage(error.message);
      setUpdatingQuestionId(null);
      return;
    }

    setMessage(question.is_active ? "Question paused." : "Question reactivated.");
    await loadBookingPageSettings();
    setUpdatingQuestionId(null);
  }

  async function deleteBookingQuestion(question: BookingQuestion) {
    const confirmed = window.confirm(
      `Remove "${question.question_label}" from your intake questions? Existing booking answers will stay saved.`
    );

    if (!confirmed) return;

    setUpdatingQuestionId(question.id);
    setMessage("");

    const { error } = await supabase
      .from("booking_questions")
      .delete()
      .eq("id", question.id)
      .eq("business_id", question.business_id);

    if (error) {
      setMessage(error.message);
      setUpdatingQuestionId(null);
      return;
    }

    setMessage("Question removed.");
    await loadBookingPageSettings();
    setUpdatingQuestionId(null);
  }

  async function copyBookingLink() {
    if (!publicBookingUrl) return;

    await navigator.clipboard.writeText(publicBookingUrl);
    setMessage("Booking link copied.");
  }

  function updateHour(
    day: number,
    field: "is_open" | "open_time" | "close_time",
    value: boolean | string
  ) {
    setHours((current) =>
      current.map((item) =>
        item.day_of_week === day ? { ...item, [field]: value } : item
      )
    );
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setOrigin(window.location.origin);
      void loadBookingPageSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="torogoz-dashboard-hero relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="torogoz-dashboard-hero-streaks" aria-hidden="true">
            <span />
            <span />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
            Booking Page
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Control how customers request time.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Share your public booking link, choose how customers request
            appointments, and manage whether business hours are used.
          </p>

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
              {message}
            </p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-6">
            <p className="text-sm font-black text-edition-primary">
              Public Booking Link
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Share your booking page
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              This is the link customers use to request appointments from your
              business.
            </p>

            {isLoading ? (
              <p className="mt-6 text-sm text-gray-400">
                Loading booking link...
              </p>
            ) : (
              <>
                <div className="mt-6 rounded-2xl border border-edition-primary/30 bg-black/20 px-4 py-4">
                  <p className="break-all text-sm font-black text-edition-primary-soft sm:text-base">
                    {publicBookingUrl ||
                      "Your public booking link will appear here once your business profile is ready."}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={copyBookingLink}
                    disabled={!publicBookingUrl}
                    className="rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Copy Link
                  </button>

                  {publicBookingUrl && (
                    <Link
                      href={publicBookingUrl}
                      target="_blank"
                      className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                    >
                      Open Booking Page
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-edition-primary">
              Setup Readiness
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Booking flow status
            </h2>

            <div className="mt-5 grid gap-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">Booking link</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Customers need a public URL.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    publicBookingUrl
                      ? "bg-edition-primary/10 text-edition-primary"
                      : "bg-yellow-400/10 text-yellow-200"
                  }`}
                >
                  {publicBookingUrl ? "Ready" : "Missing"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">Booking mode</p>
                  <p className="mt-1 text-xs text-gray-500">
                    How customers request time.
                  </p>
                </div>

                <span className="rounded-full bg-edition-primary/10 px-3 py-1 text-xs font-black text-edition-primary">
                  {bookingTimeMode === "fixed_hours"
                    ? "Hours"
                    : "Flexible"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">
                    Business hours
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Optional if using flexible requests.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    businessHoursEnabled && hasOpenHours
                      ? "bg-edition-primary/10 text-edition-primary"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {businessHoursEnabled && hasOpenHours ? "Set" : "Optional"}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black text-edition-primary">Booking Mode</p>

          <h2 className="mt-3 text-2xl font-black text-white">
            How should customers request time?
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            Choose whether customers must pick from available hours or can
            request a preferred time for your approval.
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setBookingTimeMode("fixed_hours");
                setBusinessHoursEnabled(true);
              }}
              className={`rounded-[2rem] border p-5 text-left transition ${
                bookingTimeMode === "fixed_hours"
                  ? "border-edition-primary/40 bg-edition-primary/10 shadow-[0_0_35px_rgba(52,211,153,0.08)]"
                  : "border-white/10 bg-black/20 hover:border-edition-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-white">
                    Use business hours
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Customers choose from available time slots based on the
                    hours you set below.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    bookingTimeMode === "fixed_hours"
                      ? "bg-edition-primary text-black"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {bookingTimeMode === "fixed_hours" ? "Selected" : "Select"}
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBookingTimeMode("flexible_requests")}
              className={`rounded-[2rem] border p-5 text-left transition ${
                bookingTimeMode === "flexible_requests"
                  ? "border-edition-primary/40 bg-edition-primary/10 shadow-[0_0_35px_rgba(52,211,153,0.08)]"
                  : "border-white/10 bg-black/20 hover:border-edition-primary/30"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-white">
                    Flexible appointment requests
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Customers request a preferred date and time. You approve it
                    or respond with a time that works.
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    bookingTimeMode === "flexible_requests"
                      ? "bg-edition-primary text-black"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {bookingTimeMode === "flexible_requests"
                    ? "Selected"
                    : "Select"}
                </span>
              </div>
            </button>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <label className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  Use business hours on booking page
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Turn this off if your business does not have set hours or only
                  books by appointment.
                </p>
              </div>

              <input
                type="checkbox"
                checked={businessHoursEnabled}
                disabled={bookingTimeMode === "fixed_hours"}
                onChange={(event) =>
                  setBusinessHoursEnabled(event.target.checked)
                }
                className="h-5 w-5 accent-[var(--edition-primary)] disabled:opacity-50"
              />
            </label>

            {bookingTimeMode === "fixed_hours" && (
              <p className="mt-3 text-xs leading-5 text-gray-500">
                Business hours are required when customers choose from available
                time slots.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={saveBookingMode}
            disabled={isSavingBookingMode}
            className="mt-6 rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingBookingMode ? "Saving..." : "Save Booking Mode"}
          </button>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black text-edition-primary">
            Intake Questions
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            Ask customers for the details you need.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            Add questions for all services or only one service. Customers answer
            them before sending a booking request.
          </p>

          <div className="mt-6 rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-5">
            <div className="grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Question
                </label>
                <input
                  value={questionLabel}
                  onChange={(event) => setQuestionLabel(event.target.value)}
                  placeholder="Example: What is the service address?"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-edition-primary"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(event) =>
                      setQuestionType(
                        event.target.value as BookingQuestion["question_type"]
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-edition-primary"
                  >
                    <option value="short_text">Short answer</option>
                    <option value="long_text">Long answer</option>
                    <option value="select">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Applies to
                  </label>
                  <select
                    value={questionServiceId}
                    onChange={(event) =>
                      setQuestionServiceId(event.target.value)
                    }
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-edition-primary"
                  >
                    <option value="all">All services</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-black text-gray-300">
                  <input
                    type="checkbox"
                    checked={questionRequired}
                    onChange={(event) =>
                      setQuestionRequired(event.target.checked)
                    }
                    className="h-5 w-5 accent-[var(--edition-primary)]"
                  />
                  Required
                </label>
              </div>

              {questionType === "select" && (
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Dropdown options
                  </label>
                  <input
                    value={questionOptions}
                    onChange={(event) =>
                      setQuestionOptions(event.target.value)
                    }
                    placeholder="Example: Small, Medium, Large"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-edition-primary"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Separate options with commas.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={saveBookingQuestion}
                disabled={isSavingQuestion}
                className="w-full rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
              >
                {isSavingQuestion ? "Saving..." : "Add question"}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {bookingQuestions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-gray-500">
                No intake questions yet.
              </div>
            ) : (
              bookingQuestions.map((question) => (
                <div
                  key={question.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="text-sm font-black text-white">
                          {question.question_label}
                        </p>

                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300">
                          {question.question_type.replace("_", " ")}
                        </span>

                        {question.is_required && (
                          <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-black text-yellow-200">
                            Required
                          </span>
                        )}

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            question.is_active
                              ? "bg-edition-primary/10 text-edition-primary"
                              : "bg-white/10 text-gray-400"
                          }`}
                        >
                          {question.is_active ? "Active" : "Paused"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs text-gray-500">
                        Applies to: {getServiceName(question.service_id)}
                      </p>

                      {question.options.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Options: {question.options.join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleBookingQuestion(question)}
                        disabled={updatingQuestionId === question.id}
                        className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {question.is_active ? "Pause" : "Reactivate"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteBookingQuestion(question)}
                        disabled={updatingQuestionId === question.id}
                        className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-2 text-xs font-black text-red-200 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {businessHoursEnabled ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-edition-primary">
              Business Hours
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Set your weekly availability
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              These hours can appear on your public booking page. In business
              hours mode, SchedNest uses them to generate available time slots.
            </p>

            <div className="mt-6 grid gap-4">
              {hours.map((item) => (
                <div
                  key={item.day_of_week}
                  className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-black text-white">
                        {getDayLabel(item.day_of_week)}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.is_open
                            ? "bg-edition-primary/10 text-edition-primary"
                            : "bg-white/10 text-gray-400"
                        }`}
                      >
                        {item.is_open ? "Open" : "Closed"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.is_open
                        ? `${formatTimeLabel(
                            item.open_time
                          )} - ${formatTimeLabel(item.close_time)}`
                        : "No availability this day"}
                    </p>
                  </div>

                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                    <input
                      type="checkbox"
                      checked={item.is_open}
                      onChange={(event) =>
                        updateHour(
                          item.day_of_week,
                          "is_open",
                          event.target.checked
                        )
                      }
                      className="accent-[var(--edition-primary)]"
                    />
                    Open
                  </label>

                  <select
                    value={item.open_time || ""}
                    disabled={!item.is_open}
                    onChange={(event) =>
                      updateHour(
                        item.day_of_week,
                        "open_time",
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-edition-primary disabled:opacity-40"
                  >
                    <option value="">Opening time</option>
                    {timeOptions.map((option) => (
                      <option
                        key={`${item.day_of_week}-open-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={item.close_time || ""}
                    disabled={!item.is_open}
                    onChange={(event) =>
                      updateHour(
                        item.day_of_week,
                        "close_time",
                        event.target.value
                      )
                    }
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-edition-primary disabled:opacity-40"
                  >
                    <option value="">Closing time</option>
                    {timeOptions.map((option) => (
                      <option
                        key={`${item.day_of_week}-close-${option.value}`}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={saveHours}
              disabled={isSavingHours}
              className="mt-6 rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingHours ? "Saving..." : "Save Business Hours"}
            </button>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-edition-primary">
              Business Hours Off
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Customers will request preferred times.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Your public booking page will not rely on set business hours. This
              works well for appointment-only businesses, mobile services, and
              flexible schedules.
            </p>

            <button
              type="button"
              onClick={() => setBusinessHoursEnabled(true)}
              className="mt-6 rounded-2xl border border-edition-primary/30 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary-soft transition hover:bg-edition-primary/20"
            >
              Turn Business Hours Back On
            </button>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}