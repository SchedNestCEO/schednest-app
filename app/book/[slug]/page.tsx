"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type BookingTimeMode = "fixed_hours" | "flexible_requests";

type PublicBusiness = {
  id: string;
  business_name: string | null;
  slug: string | null;
  timezone: string | null;
  booking_time_mode: BookingTimeMode | null;
  business_hours_enabled: boolean | null;
  business_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  booking_page_theme: string | null;
};

type PublicService = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  duration_minutes: number | null;
};

type PublicHour = {
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
};

type PublicBookingPageData = {
  business: PublicBusiness;
  services: PublicService[];
  business_hours: PublicHour[];
};

type ConfirmationSummary = {
  bookingId: string | null;
  customerName: string;
  businessName: string;
  serviceName: string;
  servicePrice: number | null;
  serviceDuration: number | null;
  bookingDate: string;
  bookingTime: string;
  notes: string;
  isFlexibleRequest: boolean;
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const preferredTimeOptions = Array.from({ length: 36 }, (_, index) => {
  const totalMinutes = 6 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0"
  )}`;

  return {
    value,
    label: formatTime12Hour(value),
  };
});

function normalizeTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function normalizeColor(value: string | null, fallback: string) {
  if (!value) return fallback;

  const trimmedValue = value.trim();

  if (/^#[0-9A-Fa-f]{6}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return fallback;
}

function timeToMinutes(value: string | null) {
  if (!value) return null;

  const [hourString, minuteString] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  return hour * 60 + minute;
}

function minutesToTimeValue(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatTime12Hour(value: string | null) {
  if (!value) return "";

  const cleanValue = normalizeTime(value);
  const [hourString, minuteString] = cleanValue.split(":");
  const hour24 = Number(hourString);
  const minutes = minuteString || "00";

  if (Number.isNaN(hour24)) return cleanValue;

  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${minutes.padStart(2, "0")} ${period}`;
}

function formatBusinessHourRange(
  openTime: string | null,
  closeTime: string | null
) {
  if (!openTime || !closeTime) return "Closed";

  return `${formatTime12Hour(openTime)} - ${formatTime12Hour(closeTime)}`;
}

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "Price not listed";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDateLabel(dateValue: string) {
  if (!dateValue) return "";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateDayIndex(dateValue: string) {
  if (!dateValue) return null;

  const date = new Date(`${dateValue}T00:00:00`);
  return date.getDay();
}

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "";
  const supabase = useMemo(() => createClient(), []);

  const [pageData, setPageData] = useState<PublicBookingPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmationSummary, setConfirmationSummary] =
    useState<ConfirmationSummary | null>(null);

  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");

  const selectedService = useMemo(() => {
    if (!pageData) return null;

    return (
      pageData.services.find((service) => service.id === selectedServiceId) ||
      null
    );
  }, [pageData, selectedServiceId]);

  const bookingTimeMode = pageData?.business.booking_time_mode || "fixed_hours";
  const businessHoursEnabled =
    pageData?.business.business_hours_enabled !== false;
  const isFlexibleRequest =
    bookingTimeMode === "flexible_requests" || !businessHoursEnabled;
  const usesFixedHours = !isFlexibleRequest;

  const primaryColor = normalizeColor(
    pageData?.business.brand_primary_color || null,
    "#34d399"
  );
  const accentColor = normalizeColor(
    pageData?.business.brand_accent_color || null,
    "#34d399"
  );
  const bookingPageTheme =
    pageData?.business.booking_page_theme || "schednest_dark";
  const isCleanTheme = bookingPageTheme === "brand_clean";

  const pageClass = isCleanTheme
    ? "min-h-screen bg-slate-50 px-6 py-10 text-slate-950"
    : "min-h-screen bg-[#050807] px-6 py-10 text-white";

  const cardClass = isCleanTheme
    ? "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
    : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-6";

  const heroCardClass = isCleanTheme
    ? "rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
    : "rounded-[2rem] border border-white/10 bg-white/[0.04] p-8";

  const mutedTextClass = isCleanTheme ? "text-slate-600" : "text-gray-400";
  const softTextClass = isCleanTheme ? "text-slate-500" : "text-gray-500";
  const titleTextClass = isCleanTheme ? "text-slate-950" : "text-white";
  const inputClass = isCleanTheme
    ? "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-400"
    : "mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400";

  const selectedDayHours = useMemo(() => {
    if (!pageData || !bookingDate) return null;

    const dayIndex = getDateDayIndex(bookingDate);

    if (dayIndex === null) return null;

    return (
      pageData.business_hours.find((hour) => hour.day_of_week === dayIndex) ||
      null
    );
  }, [pageData, bookingDate]);

  const availableTimes = useMemo(() => {
    if (
      isFlexibleRequest ||
      !bookingDate ||
      !selectedDayHours ||
      !selectedDayHours.is_open
    ) {
      return [];
    }

    const openMinutes = timeToMinutes(selectedDayHours.open_time);
    const closeMinutes = timeToMinutes(selectedDayHours.close_time);

    if (openMinutes === null || closeMinutes === null) return [];

    const serviceDuration = selectedService?.duration_minutes || 60;
    const latestStartTime = closeMinutes - serviceDuration;

    if (latestStartTime < openMinutes) return [];

    const todayValue = getTodayDateValue();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const slots: { value: string; label: string }[] = [];

    for (let minutes = openMinutes; minutes <= latestStartTime; minutes += 30) {
      if (bookingDate === todayValue && minutes <= currentMinutes) {
        continue;
      }

      const value = minutesToTimeValue(minutes);

      slots.push({
        value,
        label: formatTime12Hour(value),
      });
    }

    return slots;
  }, [bookingDate, selectedDayHours, selectedService, isFlexibleRequest]);

  async function loadPage() {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase.rpc("get_public_booking_page", {
      p_slug: slug,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (!data) {
      setErrorMessage("Booking page not found.");
      setIsLoading(false);
      return;
    }

    const typedData = data as PublicBookingPageData;

    setPageData(typedData);

    if (typedData.services.length > 0) {
      setSelectedServiceId(typedData.services[0].id);
    }

    setIsLoading(false);
  }

  function resetFormForAnotherRequest() {
    setConfirmationSummary(null);
    setErrorMessage("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setBookingDate("");
    setBookingTime("");
    setNotes("");
  }

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pageData) {
      setErrorMessage("Booking page not loaded.");
      return;
    }

    if (!selectedServiceId || !selectedService) {
      setErrorMessage("Please select a service.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!bookingDate || !bookingTime) {
      setErrorMessage(
        isFlexibleRequest
          ? "Please choose your preferred date and time."
          : "Please choose an available date and time."
      );
      return;
    }

    if (usesFixedHours) {
      const selectedTimeIsAvailable = availableTimes.some(
        (time) => time.value === bookingTime
      );

      if (!selectedTimeIsAvailable) {
        setErrorMessage("Please choose one of the available times.");
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setConfirmationSummary(null);

    const startDateTime = new Date(`${bookingDate}T${bookingTime}`);

    const requestNotes = isFlexibleRequest
      ? [
          notes.trim(),
          "Flexible request: customer selected a preferred time. Business may confirm this time or respond with another time that works.",
        ]
          .filter(Boolean)
          .join("\n\n")
      : notes.trim();

    const { data, error } = await supabase.rpc("create_public_booking", {
      p_business_id: pageData.business.id,
      p_service_id: selectedServiceId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail,
      p_start_time: startDateTime.toISOString(),
      p_notes: requestNotes,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    const bookingResult = data as { id?: string } | null;

    if (bookingResult?.id) {
      await fetch("/api/booking-notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId: bookingResult.id,
          eventType: "booking.requested",
        }),
      });
    }

    setConfirmationSummary({
      bookingId: bookingResult?.id || null,
      customerName: customerName.trim(),
      businessName: pageData.business.business_name || "this business",
      serviceName: selectedService.name,
      servicePrice: selectedService.price,
      serviceDuration: selectedService.duration_minutes,
      bookingDate,
      bookingTime,
      notes: notes.trim(),
      isFlexibleRequest,
    });

    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setBookingDate("");
    setBookingTime("");
    setNotes("");

    setIsSubmitting(false);
  }

  useEffect(() => {
    if (slug) {
      loadPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    if (!bookingTime || isFlexibleRequest) return;

    const stillAvailable = availableTimes.some(
      (time) => time.value === bookingTime
    );

    if (!stillAvailable) {
      setBookingTime("");
    }
  }, [availableTimes, bookingTime, isFlexibleRequest]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm text-gray-400">Loading booking page...</p>
        </div>
      </main>
    );
  }

  if (!pageData) {
    return (
      <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-2xl font-bold">Booking page unavailable</h1>
          <p className="mt-3 text-sm text-gray-400">{errorMessage}</p>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-5xl space-y-6">
        <section className={heroCardClass}>
          <div
            className="h-2 w-24 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />

          <p className="mt-6 text-sm font-black uppercase tracking-[0.28em]">
            <span style={{ color: primaryColor }}>SchedNest Booking</span>
          </p>

          <h1 className={`mt-3 text-4xl font-black ${titleTextClass}`}>
            Book with {pageData.business.business_name || "this business"}
          </h1>

          <p className={`mt-4 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
            {pageData.business.business_description ||
              (isFlexibleRequest
                ? "Choose a service and request your preferred time. The business will confirm or respond with a time that works."
                : "Choose a service and request a time. Your appointment will be marked pending until confirmed.")}
          </p>

          {(pageData.business.contact_email ||
            pageData.business.contact_phone) && (
            <div className="mt-5 flex flex-wrap gap-3 text-sm">
              {pageData.business.contact_email && (
                <a
                  href={`mailto:${pageData.business.contact_email}`}
                  className={`rounded-full px-4 py-2 font-bold ${
                    isCleanTheme
                      ? "border border-slate-200 bg-slate-50 text-slate-700"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  {pageData.business.contact_email}
                </a>
              )}

              {pageData.business.contact_phone && (
                <a
                  href={`tel:${pageData.business.contact_phone}`}
                  className={`rounded-full px-4 py-2 font-bold ${
                    isCleanTheme
                      ? "border border-slate-200 bg-slate-50 text-slate-700"
                      : "bg-white/5 text-gray-300"
                  }`}
                >
                  {pageData.business.contact_phone}
                </a>
              )}
            </div>
          )}
        </section>

        {confirmationSummary && (
          <section
            className="rounded-[2rem] border p-8 shadow-[0_0_40px_rgba(52,211,153,0.08)]"
            style={{
              borderColor: `${primaryColor}40`,
              backgroundColor: `${primaryColor}18`,
            }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-black text-black"
                  style={{ backgroundColor: accentColor }}
                >
                  ✓
                </div>

                <p
                  className="mt-5 text-sm font-black uppercase tracking-[0.28em]"
                  style={{ color: primaryColor }}
                >
                  Request Received
                </p>

                <h2 className={`mt-3 text-3xl font-black ${titleTextClass}`}>
                  Thanks, {confirmationSummary.customerName}.
                </h2>

                <p className={`mt-3 max-w-2xl text-sm leading-6 ${mutedTextClass}`}>
                  Your booking request was sent to{" "}
                  {confirmationSummary.businessName}.{" "}
                  {confirmationSummary.isFlexibleRequest
                    ? "The business will review your preferred time and confirm or respond with a time that works."
                    : "The business will review your request and confirm your appointment soon."}
                </p>
              </div>

              <button
                type="button"
                onClick={resetFormForAnotherRequest}
                className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
                  isCleanTheme
                    ? "border-slate-200 text-slate-700 hover:bg-slate-100"
                    : "border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                Request another time
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div
                className={`rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-slate-200 bg-white"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
                  Service
                </p>
                <p className={`mt-2 text-lg font-black ${titleTextClass}`}>
                  {confirmationSummary.serviceName}
                </p>
                <p className={`mt-1 text-sm ${mutedTextClass}`}>
                  {formatMoney(confirmationSummary.servicePrice)}
                  {" · "}
                  {confirmationSummary.serviceDuration || 60} min
                </p>
              </div>

              <div
                className={`rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-slate-200 bg-white"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
                  {confirmationSummary.isFlexibleRequest
                    ? "Preferred Time"
                    : "Requested Time"}
                </p>
                <p className={`mt-2 text-lg font-black ${titleTextClass}`}>
                  {formatDateLabel(confirmationSummary.bookingDate)}
                </p>
                <p className="mt-1 text-sm font-bold" style={{ color: primaryColor }}>
                  {formatTime12Hour(confirmationSummary.bookingTime)}
                </p>
              </div>
            </div>

            {confirmationSummary.notes && (
              <div
                className={`mt-4 rounded-2xl border p-5 ${
                  isCleanTheme
                    ? "border-slate-200 bg-white"
                    : "border-white/10 bg-black/20"
                }`}
              >
                <p className={`text-xs font-bold uppercase tracking-[0.2em] ${softTextClass}`}>
                  Note Sent
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  {confirmationSummary.notes}
                </p>
              </div>
            )}

            <div
              className={`mt-5 rounded-2xl border p-5 ${
                isCleanTheme
                  ? "border-slate-200 bg-white"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <p className={`text-sm font-black ${titleTextClass}`}>
                What happens next?
              </p>
              <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                {confirmationSummary.isFlexibleRequest
                  ? "This is a preferred time request, not a confirmed appointment. The business may approve it or respond with a different time for that date."
                  : "This is not confirmed yet. Once the business approves or declines the request, you may receive an update from the business."}
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className={cardClass}>
            <p className="text-sm font-black" style={{ color: primaryColor }}>
              {businessHoursEnabled ? "Business Hours" : "By Appointment"}
            </p>

            {businessHoursEnabled && pageData.business_hours.length > 0 ? (
              <div className="mt-4 space-y-3">
                {pageData.business_hours.map((hour) => (
                  <div
                    key={hour.day_of_week}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                      isCleanTheme ? "bg-slate-50" : "bg-black/20"
                    }`}
                  >
                    <span
                      className={`font-bold ${
                        isCleanTheme ? "text-slate-800" : "text-gray-200"
                      }`}
                    >
                      {days[hour.day_of_week]}
                    </span>
                    <span className={mutedTextClass}>
                      {hour.is_open
                        ? formatBusinessHourRange(
                            hour.open_time,
                            hour.close_time
                          )
                        : "Closed"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="mt-4 rounded-2xl border p-5"
                style={{
                  borderColor: `${primaryColor}35`,
                  backgroundColor: `${primaryColor}12`,
                }}
              >
                <p className="text-sm font-black" style={{ color: primaryColor }}>
                  Flexible scheduling
                </p>
                <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                  This business accepts preferred appointment times. Request a
                  date and time, and the business will confirm or respond with a
                  time that works.
                </p>
              </div>
            )}
          </div>

          <div className={cardClass}>
            <p className="text-sm font-black" style={{ color: primaryColor }}>
              Request Appointment
            </p>
            <h2 className={`mt-3 text-2xl font-black ${titleTextClass}`}>
              Choose your booking details
            </h2>

            <form onSubmit={submitBooking} className="mt-6 grid gap-4">
              <div>
                <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                  Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(event) => {
                    setSelectedServiceId(event.target.value);
                    setBookingTime("");
                    setErrorMessage("");
                  }}
                  className={inputClass}
                >
                  {pageData.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatMoney(service.price)} —{" "}
                      {service.duration_minutes ?? 60} min
                    </option>
                  ))}
                </select>

                {selectedService?.description && (
                  <p className={`mt-2 text-xs leading-5 ${softTextClass}`}>
                    {selectedService.description}
                  </p>
                )}
              </div>

              <div>
                <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                  Your name
                </label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    Phone
                  </label>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Phone number"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    Email
                  </label>
                  <input
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    type="email"
                    placeholder="Email address"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {isFlexibleRequest ? "Preferred date" : "Date"}
                  </label>
                  <input
                    value={bookingDate}
                    onChange={(event) => {
                      setBookingDate(event.target.value);
                      setBookingTime("");
                      setErrorMessage("");
                      setConfirmationSummary(null);
                    }}
                    type="date"
                    min={getTodayDateValue()}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                    {isFlexibleRequest ? "Preferred time" : "Available time"}
                  </label>

                  {isFlexibleRequest ? (
                    <select
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      disabled={!bookingDate}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {!bookingDate && (
                        <option value="">Choose a date first</option>
                      )}

                      {bookingDate && (
                        <option value="">Choose preferred time</option>
                      )}

                      {preferredTimeOptions.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                      disabled={!bookingDate || availableTimes.length === 0}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      {!bookingDate && (
                        <option value="">Choose a date first</option>
                      )}

                      {bookingDate && availableTimes.length === 0 && (
                        <option value="">No available times for this day</option>
                      )}

                      {bookingDate && availableTimes.length > 0 && (
                        <option value="">Choose an available time</option>
                      )}

                      {availableTimes.map((time) => (
                        <option key={time.value} value={time.value}>
                          {time.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {!isFlexibleRequest &&
                    bookingDate &&
                    selectedDayHours &&
                    !selectedDayHours.is_open && (
                      <p className={`mt-2 text-xs ${softTextClass}`}>
                        This business is closed on{" "}
                        {days[selectedDayHours.day_of_week]}.
                      </p>
                    )}

                  {!isFlexibleRequest &&
                    bookingDate &&
                    selectedDayHours &&
                    selectedDayHours.is_open &&
                    availableTimes.length === 0 && (
                      <p className={`mt-2 text-xs ${softTextClass}`}>
                        No times are available for the selected service on this
                        day.
                      </p>
                    )}

                  {isFlexibleRequest && bookingDate && (
                    <p className={`mt-2 text-xs ${softTextClass}`}>
                      This is a preferred time request. The business may confirm
                      it or respond with another time.
                    </p>
                  )}
                </div>
              </div>

              {selectedService && bookingDate && bookingTime && (
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: `${primaryColor}35`,
                    backgroundColor: `${primaryColor}12`,
                  }}
                >
                  <p className="text-sm font-black" style={{ color: primaryColor }}>
                    Request summary
                  </p>
                  <p className={`mt-2 text-sm leading-6 ${mutedTextClass}`}>
                    {selectedService.name} on {formatDateLabel(bookingDate)} at{" "}
                    {formatTime12Hour(bookingTime)}.
                  </p>
                  <p className={`mt-1 text-xs ${softTextClass}`}>
                    {isFlexibleRequest
                      ? "This preferred time will be sent to the business for review."
                      : "This appointment will be pending until the business confirms it."}
                  </p>
                </div>
              )}

              <div>
                <label className={`text-sm font-bold ${isCleanTheme ? "text-slate-700" : "text-gray-300"}`}>
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything the business should know?"
                  className={`${inputClass} min-h-24`}
                />
              </div>

              {errorMessage && (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || pageData.services.length === 0}
                className="rounded-2xl px-5 py-3 text-sm font-black text-black transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ backgroundColor: accentColor }}
              >
                {isSubmitting
                  ? "Sending request..."
                  : isFlexibleRequest
                    ? "Request preferred time"
                    : "Request booking"}
              </button>
            </form>
          </div>
        </section>

        <section
          className={`rounded-[2rem] border p-5 text-center ${
            isCleanTheme
              ? "border-slate-200 bg-white text-slate-500"
              : "border-white/10 bg-white/[0.03] text-gray-500"
          }`}
        >
          <p className="text-xs font-bold">
            Powered by SchedNest · From first client to full company.
          </p>
        </section>
      </div>
    </main>
  );
}