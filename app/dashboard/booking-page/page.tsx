"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  business_name: string | null;
  slug: string | null;
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

export default function BookingPageSettings() {
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [slug, setSlug] = useState("");
  const [hours, setHours] = useState<BusinessHour[]>(defaultHours);
  const [origin, setOrigin] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingHours, setIsSavingHours] = useState(false);
  const [message, setMessage] = useState("");

  const cleanSlug = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const publicBookingUrl =
    cleanSlug && origin ? `${origin}/book/${cleanSlug}` : "";

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
      .select("id, business_name, slug")
      .eq("owner_id", user.id)
      .single();

    if (profileError || !businessProfile) {
      setMessage("Could not load your business profile.");
      setIsLoading(false);
      return;
    }

    setProfile(businessProfile);
    setSlug(businessProfile.slug || "");

    const { data: existingHours, error: hoursError } = await supabase
      .from("business_hours")
      .select("id, business_id, day_of_week, is_open, open_time, close_time")
      .eq("business_id", businessProfile.id);

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
    <DashboardShell
      title="Booking Page"
      subtitle="Set your public booking link and business hours."
    >
      <div className="grid gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-sm font-black text-emerald-300">
            Public Booking Link
          </p>

          <h2 className="mt-4 text-3xl font-black text-white">
            Share your booking page
          </h2>

          <p className="mt-4 max-w-2xl text-gray-400">
            This is the link customers will use to request appointments.
          </p>

          {isLoading ? (
            <p className="mt-6 text-sm text-gray-400">
              Loading booking link...
            </p>
          ) : (
            <>
              <div className="mt-6 grid gap-3">
                <label className="text-sm font-semibold text-gray-300">
                  Public booking URL
                </label>

                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-4">
                  <p className="break-all text-base font-bold text-emerald-200">
                    {publicBookingUrl ||
                      "Your public booking link will appear here once your business profile is ready."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
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
                    className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                  >
                    Open Booking Page
                  </Link>
                )}
              </div>
            </>
          )}

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-gray-300">
              {message}
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-8">
          <p className="text-sm font-black text-emerald-300">Business Hours</p>

          <h2 className="mt-4 text-3xl font-black text-white">
            Set your weekly availability
          </h2>

          <p className="mt-4 max-w-2xl text-gray-400">
            These hours will appear on your public booking page. Later,
            SchedNest will use them to generate available time slots
            automatically.
          </p>

          <div className="mt-8 grid gap-4">
            {hours.map((item) => (
              <div
                key={item.day_of_week}
                className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              >
                <div>
                  <p className="font-bold text-white">{item.day_of_week}</p>
                  <p className="text-sm text-gray-500">
                    {item.is_open ? "Open" : "Closed"}
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
                  />
                  Open
                </label>

                <select
                  value={item.open_time || ""}
                  disabled={!item.is_open}
                  onChange={(event) =>
                    updateHour(item.day_of_week, "open_time", event.target.value)
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
            onClick={saveHours}
            disabled={isSavingHours}
            className="mt-6 rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingHours ? "Saving..." : "Save Business Hours"}
          </button>
        </section>
      </div>
    </DashboardShell>
  );
}