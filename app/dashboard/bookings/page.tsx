"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
};

type Customer = {
  id: string;
  full_name: string | null;
  name?: string | null;
  phone: string | null;
  email: string | null;
};

type Service = {
  id: string;
  name: string;
  price: number | null;
  duration_minutes: number | null;
  is_active: boolean | null;
};

type Booking = {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: string | null;
  source: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
};

type BookingSection = {
  key: string;
  title: string;
  description: string;
  bookings: Booking[];
};

function getStartOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStatusLabel(status?: string | null) {
  if (!status) return "Pending";

  const labels: Record<string, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    approved: "Approved",
    completed: "Completed",
    cancelled: "Cancelled",
    canceled: "Canceled",
    no_show: "No-show",
    declined: "Declined",
  };

  return labels[status] || status;
}

function getStatusClass(status?: string | null) {
  const normalizedStatus = status || "pending";

  const classes: Record<string, string> = {
    pending: "border-yellow-400/20 bg-yellow-400/10 text-yellow-200",
    confirmed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    completed: "border-blue-400/20 bg-blue-400/10 text-blue-300",
    cancelled: "border-gray-400/20 bg-gray-400/10 text-gray-300",
    canceled: "border-gray-400/20 bg-gray-400/10 text-gray-300",
    no_show: "border-red-400/20 bg-red-400/10 text-red-300",
    declined: "border-red-400/20 bg-red-400/10 text-red-300",
  };

  return (
    classes[normalizedStatus] ||
    "border-white/10 bg-white/10 text-gray-300"
  );
}

export default function BookingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [bookingDate, setBookingDate] = useState(getTodayDateValue());
  const [bookingTime, setBookingTime] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [source, setSource] = useState("manual");
  const [notes, setNotes] = useState("");

  async function loadBookingsPage() {
    setIsLoading(true);
    setErrorMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage("Unable to load user session.");
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("business_profiles")
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .single();

    if (profileError || !profile) {
      setErrorMessage("Business profile not found.");
      setIsLoading(false);
      return;
    }

    setBusinessProfile(profile);

    const { data: customerData, error: customerError } = await supabase
      .from("customers")
      .select("id, full_name, name, phone, email")
      .eq("business_id", profile.id)
      .order("created_at", { ascending: false });

    if (customerError) {
      setErrorMessage(customerError.message);
      setIsLoading(false);
      return;
    }

    const { data: serviceData, error: serviceError } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, is_active")
      .eq("business_id", profile.id)
      .order("created_at", { ascending: false });

    if (serviceError) {
      setErrorMessage(serviceError.message);
      setIsLoading(false);
      return;
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id,
        customer_id,
        service_id,
        start_time,
        end_time,
        status,
        source,
        customer_name,
        customer_phone,
        customer_email,
        notes,
        services (
          name,
          price,
          duration_minutes
        )
      `
      )
      .eq("business_id", profile.id)
      .order("start_time", { ascending: true });

    if (bookingError) {
      setErrorMessage(bookingError.message);
      setIsLoading(false);
      return;
    }

    const activeServices = serviceData || [];

    setCustomers(customerData || []);
    setServices(activeServices);
    setBookings((bookingData || []) as Booking[]);

    if (!selectedCustomerId && customerData && customerData.length > 0) {
      setSelectedCustomerId(customerData[0].id);
    }

    if (!selectedServiceId && activeServices && activeServices.length > 0) {
      setSelectedServiceId(activeServices[0].id);
    }

    setIsLoading(false);
  }

  async function handleAddBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessProfile) {
      setErrorMessage("Business profile not loaded yet.");
      return;
    }

    if (!selectedCustomerId) {
      setErrorMessage("Please select a customer.");
      return;
    }

    if (!selectedServiceId) {
      setErrorMessage("Please select a service.");
      return;
    }

    if (!bookingDate || !bookingTime) {
      setErrorMessage("Please choose a date and time.");
      return;
    }

    const selectedCustomer = customers.find(
      (customer) => customer.id === selectedCustomerId
    );
    const selectedService = services.find(
      (service) => service.id === selectedServiceId
    );

    if (!selectedCustomer || !selectedService) {
      setErrorMessage("Selected customer or service was not found.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const startDateTime = new Date(`${bookingDate}T${bookingTime}`);
    const duration = selectedService.duration_minutes || 60;
    const endDateTime = new Date(
      startDateTime.getTime() + duration * 60 * 1000
    );

    const customerName =
      selectedCustomer.full_name || selectedCustomer.name || "Customer";

    const { error } = await supabase.from("bookings").insert({
      business_id: businessProfile.id,
      owner_id: businessProfile.owner_id,
      customer_id: selectedCustomer.id,
      service_id: selectedService.id,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      status,
      source,
      customer_name: customerName,
      customer_phone: selectedCustomer.phone || null,
      customer_email: selectedCustomer.email || null,
      notes: notes.trim() || null,
    });

    if (error) {
      setErrorMessage(error.message);
      setIsSaving(false);
      return;
    }

    setBookingDate(getTodayDateValue());
    setBookingTime("");
    setStatus("confirmed");
    setSource("manual");
    setNotes("");

    await loadBookingsPage();
    setIsSaving(false);
  }

  async function updateBookingStatus(bookingId: string, newStatus: string) {
    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    await loadBookingsPage();
  }

  function formatDateTime(value: string) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function formatTimeRange(booking: Booking) {
    const startTime = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(booking.start_time));

    const endTime = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(booking.end_time));

    return `${startTime} - ${endTime}`;
  }

  function getServiceName(booking: Booking) {
    return (
      services.find((service) => service.id === booking.service_id)?.name ||
      "Service"
    );
  }

  function getBookingSections(): BookingSection[] {
    const today = getStartOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const dayAfterTomorrow = addDays(today, 2);
    const nextWeek = addDays(today, 7);

    const todayBookings: Booking[] = [];
    const tomorrowBookings: Booking[] = [];
    const thisWeekBookings: Booking[] = [];
    const laterBookings: Booking[] = [];
    const pastBookings: Booking[] = [];

    bookings.forEach((booking) => {
      const bookingDay = getStartOfDay(new Date(booking.start_time));

      if (bookingDay < today) {
        pastBookings.push(booking);
        return;
      }

      if (bookingDay.getTime() === today.getTime()) {
        todayBookings.push(booking);
        return;
      }

      if (bookingDay.getTime() === tomorrow.getTime()) {
        tomorrowBookings.push(booking);
        return;
      }

      if (bookingDay >= dayAfterTomorrow && bookingDay < nextWeek) {
        thisWeekBookings.push(booking);
        return;
      }

      laterBookings.push(booking);
    });

    return [
      {
        key: "today",
        title: "Today",
        description: "Appointments scheduled for today.",
        bookings: todayBookings,
      },
      {
        key: "tomorrow",
        title: "Tomorrow",
        description: "Appointments coming up tomorrow.",
        bookings: tomorrowBookings,
      },
      {
        key: "this-week",
        title: "This Week",
        description: "Upcoming appointments in the next few days.",
        bookings: thisWeekBookings,
      },
      {
        key: "later",
        title: "Later",
        description: "Appointments scheduled beyond this week.",
        bookings: laterBookings,
      },
      {
        key: "past",
        title: "Past",
        description: "Previous appointments and completed history.",
        bookings: pastBookings,
      },
    ];
  }

  useEffect(() => {
    loadBookingsPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookingSections = getBookingSections();
  const upcomingCount =
    bookingSections.find((section) => section.key === "today")?.bookings
      .length ||
    0 +
      (bookingSections.find((section) => section.key === "tomorrow")?.bookings
        .length || 0) +
      (bookingSections.find((section) => section.key === "this-week")?.bookings
        .length || 0) +
      (bookingSections.find((section) => section.key === "later")?.bookings
        .length || 0);

  return (
    <DashboardShell>
     
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-semibold text-emerald-300">
            Manual Booking
          </p>
          <h2 className="mt-3 text-2xl font-bold">Create a booking</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Start by creating bookings manually. Later, customers will request
            bookings from the public booking page.
          </p>

          {(customers.length === 0 || services.length === 0) && !isLoading && (
            <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
              <p className="text-sm font-black text-yellow-200">
                Finish setup before creating bookings
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                You need at least one customer and one service before a manual
                booking can be created.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                {customers.length === 0 && (
                  <Link
                    href="/dashboard/customers"
                    className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-black transition hover:bg-gray-200"
                  >
                    Add customer
                  </Link>
                )}

                {services.length === 0 && (
                  <Link
                    href="/dashboard/services"
                    className="rounded-2xl bg-emerald-400 px-4 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
                  >
                    Add service
                  </Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleAddBooking} className="mt-6 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(event) => setSelectedCustomerId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name ||
                        customer.name ||
                        "Unnamed customer"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Service
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="">Select service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {service.duration_minutes || 60} min
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Date
                </label>
                <input
                  value={bookingDate}
                  onChange={(event) => setBookingDate(event.target.value)}
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Time
                </label>
                <input
                  value={bookingTime}
                  onChange={(event) => setBookingTime(event.target.value)}
                  type="time"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-300">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No-show</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="manual">Manual</option>
                  <option value="text">Text</option>
                  <option value="dm">Instagram/DM</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="booking_page">Booking page</option>
                  <option value="phone">Phone call</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Example: Customer asked for morning appointment."
                className="mt-2 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
              />
            </div>

            {errorMessage && (
              <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || customers.length === 0 || services.length === 0}
              className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 md:w-fit"
            >
              {isSaving ? "Saving..." : "Create booking"}
            </button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                Booking Schedule
              </p>
              <h2 className="mt-3 text-2xl font-bold">
                {isLoading
                  ? "Loading bookings..."
                  : `${bookings.length} booking${
                      bookings.length === 1 ? "" : "s"
                    }`}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Your bookings are now grouped by timing so you can quickly see
                what is happening today, what is coming up, and what already
                passed.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                Upcoming
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {isLoading ? "..." : upcomingCount}
              </p>
            </div>
          </div>

          {!isLoading && bookings.length === 0 && (
            <div className="mt-6 rounded-[2rem] border border-white/10 bg-black/20 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                ✦
              </div>

              <h3 className="mt-4 text-xl font-black text-white">
                No bookings yet.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                Create your first manual booking above, or share your public
                booking page so customers can request time with you.
              </p>

              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/dashboard/booking-page"
                  className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                >
                  Share booking page
                </Link>

                <Link
                  href="/dashboard/services"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Manage services
                </Link>
              </div>
            </div>
          )}

          {!isLoading && bookings.length > 0 && (
            <div className="mt-6 grid gap-6">
              {bookingSections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-[2rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-gray-400">
                        {section.description}
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300">
                      {section.bookings.length}
                    </span>
                  </div>

                  {section.bookings.length === 0 ? (
                    <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-500">
                      No bookings in this section.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-4">
                      {section.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
                        >
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-3">
                                <h4 className="text-lg font-bold text-white">
                                  {booking.customer_name || "Customer"}
                                </h4>

                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${getStatusClass(
                                    booking.status
                                  )}`}
                                >
                                  {getStatusLabel(booking.status)}
                                </span>
                              </div>

                              <p className="mt-2 text-sm text-gray-300">
                                {getServiceName(booking)} ·{" "}
                                {formatDateTime(booking.start_time)}
                              </p>

                              <p className="mt-1 text-xs font-bold text-emerald-300">
                                {formatTimeRange(booking)}
                              </p>

                              <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-300">
                                {booking.customer_phone && (
                                  <span className="rounded-full bg-white/5 px-3 py-1">
                                    {booking.customer_phone}
                                  </span>
                                )}

                                {booking.customer_email && (
                                  <span className="rounded-full bg-white/5 px-3 py-1">
                                    {booking.customer_email}
                                  </span>
                                )}

                                <span className="rounded-full bg-white/5 px-3 py-1">
                                  Source: {booking.source || "manual"}
                                </span>
                              </div>

                              {booking.notes && (
                                <p className="mt-4 text-sm leading-6 text-gray-400">
                                  {booking.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  updateBookingStatus(booking.id, "completed")
                                }
                                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
                              >
                                Complete
                              </button>

                              <button
                                onClick={() =>
                                  updateBookingStatus(booking.id, "cancelled")
                                }
                                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-white/10"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}