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
  day_of_week: string;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

const defaultHours: BusinessHour[] = [
  {
    day_of_week: "Monday",
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: "Tuesday",
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: "Wednesday",
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: "Thursday",
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: "Friday",
    is_open: true,
    open_time: "09:00",
    close_time: "17:00",
  },
  {
    day_of_week: "Saturday",
    is_open: false,
    open_time: null,
    close_time: null,
  },
  {
    day_of_week: "Sunday",
    is_open: false,
    open_time: null,
    close_time: null,
  },
];

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
          (item) => item.day_of_week === defaultDay.day_of_week
        );

        if (!found) return defaultDay;

        return {
          ...found,
          open_time: normalizeTimeValue(found.open_time),
          close_time: normalizeTimeValue(found.close_time),
        };
      });

      setHours(orderedHours);
    } else {
      setHours(defaultHours);
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
      open_time: item.is_open ? item.open_time : null,
      close_time: item.is_open ? item.close_time : null,
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

  async function copyBookingLink() {
    if (!publicBookingUrl) return;

    await navigator.clipboard.writeText(publicBookingUrl);
    setMessage("Booking link copied.");
  }

  function updateHour(
    day: string,
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
    setOrigin(window.location.origin);
    loadBookingPageSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
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
          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-sm font-black text-emerald-300">
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
                <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-black/20 px-4 py-4">
                  <p className="break-all text-sm font-black text-emerald-200 sm:text-base">
                    {publicBookingUrl ||
                      "Your public booking link will appear here once your business profile is ready."}
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={copyBookingLink}
                    disabled={!publicBookingUrl}
                    className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="text-sm font-black text-emerald-300">
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
                      ? "bg-emerald-400/10 text-emerald-300"
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

                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
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
                      ? "bg-emerald-400/10 text-emerald-300"
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
          <p className="text-sm font-black text-emerald-300">Booking Mode</p>

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
                  ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_35px_rgba(52,211,153,0.08)]"
                  : "border-white/10 bg-black/20 hover:border-emerald-400/30"
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
                      ? "bg-emerald-400 text-black"
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
                  ? "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_35px_rgba(52,211,153,0.08)]"
                  : "border-white/10 bg-black/20 hover:border-emerald-400/30"
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
                      ? "bg-emerald-400 text-black"
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
                className="h-5 w-5 accent-emerald-400 disabled:opacity-50"
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
            className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingBookingMode ? "Saving..." : "Save Booking Mode"}
          </button>
        </section>

        {businessHoursEnabled ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
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
                        {item.day_of_week}
                      </p>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          item.is_open
                            ? "bg-emerald-400/10 text-emerald-300"
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
                      className="accent-emerald-400"
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
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-400 disabled:opacity-40"
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
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-400 disabled:opacity-40"
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
              className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingHours ? "Saving..." : "Save Business Hours"}
            </button>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
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
              className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20"
            >
              Turn Business Hours Back On
            </button>
          </section>
        )}
      </div>
    </DashboardShell>
  );
}