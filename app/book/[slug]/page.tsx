"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

type PublicBusiness = {
  id: string;
  business_name: string | null;
  slug: string | null;
  timezone: string | null;
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

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function normalizeTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
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
  const [successMessage, setSuccessMessage] = useState("");

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
    if (!bookingDate || !selectedDayHours || !selectedDayHours.is_open) {
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
  }, [bookingDate, selectedDayHours, selectedService]);

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

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!pageData) {
      setErrorMessage("Booking page not loaded.");
      return;
    }

    if (!selectedServiceId) {
      setErrorMessage("Please select a service.");
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage("Please enter your name.");
      return;
    }

    if (!bookingDate || !bookingTime) {
      setErrorMessage("Please choose an available date and time.");
      return;
    }

    const selectedTimeIsAvailable = availableTimes.some(
      (time) => time.value === bookingTime
    );

    if (!selectedTimeIsAvailable) {
      setErrorMessage("Please choose one of the available times.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    const startDateTime = new Date(`${bookingDate}T${bookingTime}`);

    const { data, error } = await supabase.rpc("create_public_booking", {
      p_business_id: pageData.business.id,
      p_service_id: selectedServiceId,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_customer_email: customerEmail,
      p_start_time: startDateTime.toISOString(),
      p_notes: notes,
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

    setSuccessMessage(
      "Your booking request was sent. The business will confirm your appointment."
    );
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
    if (!bookingTime) return;

    const stillAvailable = availableTimes.some(
      (time) => time.value === bookingTime
    );

    if (!stillAvailable) {
      setBookingTime("");
    }
  }, [availableTimes, bookingTime]);

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
    <main className="min-h-screen bg-[#050807] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-semibold text-emerald-300">
            SchedNest Booking
          </p>
          <h1 className="mt-3 text-4xl font-black">
            Book with {pageData.business.business_name || "this business"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
            Choose a service and request a time. Your appointment will be marked
            pending until confirmed.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-semibold text-emerald-300">
              Business Hours
            </p>

            <div className="mt-4 space-y-3">
              {pageData.business_hours.length === 0 && (
                <p className="text-sm text-gray-400">
                  Hours have not been added yet.
                </p>
              )}

              {pageData.business_hours.map((hour) => (
                <div
                  key={hour.day_of_week}
                  className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-gray-200">
                    {days[hour.day_of_week]}
                  </span>
                  <span className="text-gray-400">
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
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-semibold text-emerald-300">
              Request Appointment
            </p>
            <h2 className="mt-3 text-2xl font-bold">
              Choose your booking details
            </h2>

            <form onSubmit={submitBooking} className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  {pageData.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — ${service.price ?? 0} —{" "}
                      {service.duration_minutes ?? 60} min
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Your name
                </label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Your full name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Phone
                  </label>
                  <input
                    value={customerPhone}
                    onChange={(event) => setCustomerPhone(event.target.value)}
                    placeholder="Phone number"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Email
                  </label>
                  <input
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    type="email"
                    placeholder="Email address"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Date
                  </label>
                  <input
                    value={bookingDate}
                    onChange={(event) => {
                      setBookingDate(event.target.value);
                      setBookingTime("");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    type="date"
                    min={getTodayDateValue()}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-300">
                    Available time
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(event) => setBookingTime(event.target.value)}
                    disabled={!bookingDate || availableTimes.length === 0}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
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

                  {bookingDate && selectedDayHours && !selectedDayHours.is_open && (
                    <p className="mt-2 text-xs text-gray-500">
                      This business is closed on {days[selectedDayHours.day_of_week]}.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Anything the business should know?"
                  className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
                />
              </div>

              {errorMessage && (
                <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </p>
              )}

              {successMessage && (
                <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || pageData.services.length === 0}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending request..." : "Request booking"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}