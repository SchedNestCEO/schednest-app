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
  pricing_type: string | null;
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

function getDateValueFromDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateValue() {
  return getDateValueFromDate(new Date());
}

function getNextWeekdayDateValue(weekdayName: string) {
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const wantedDay = weekdays.indexOf(weekdayName.toLowerCase());

  if (wantedDay === -1) return "";

  const today = new Date();
  const todayDay = today.getDay();
  let daysUntil = wantedDay - todayDay;

  if (daysUntil <= 0) {
    daysUntil += 7;
  }

  return getDateValueFromDate(addDays(today, daysUntil));
}

function normalizePhone(value: string | null | undefined) {
  return (value || "").replace(/\D/g, "");
}

function extractEmail(value: string) {
  return value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(value: string) {
  return (
    value.match(
      /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/
    )?.[0] || ""
  );
}

function extractTime(value: string) {
  const twelveHourMatch = value.match(
    /\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i
  );

  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minute = twelveHourMatch[2] || "00";
    const period = twelveHourMatch[3].toLowerCase();

    if (period === "pm" && hour !== 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;

    return `${String(hour).padStart(2, "0")}:${minute}`;
  }

  const twentyFourHourMatch = value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);

  if (twentyFourHourMatch) {
    return `${String(Number(twentyFourHourMatch[1])).padStart(2, "0")}:${
      twentyFourHourMatch[2]
    }`;
  }

  return "";
}

function extractDate(value: string) {
  const lowerValue = value.toLowerCase();

  if (lowerValue.includes("today")) {
    return getTodayDateValue();
  }

  if (lowerValue.includes("tomorrow")) {
    return getDateValueFromDate(addDays(new Date(), 1));
  }

  const weekdayMatch = lowerValue.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );

  if (weekdayMatch) {
    return getNextWeekdayDateValue(weekdayMatch[1]);
  }

  const numericDateMatch = lowerValue.match(
    /\b(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?\b/
  );

  if (numericDateMatch) {
    const now = new Date();
    const month = Number(numericDateMatch[1]) - 1;
    const day = Number(numericDateMatch[2]);
    const year = numericDateMatch[3]
      ? Number(
          numericDateMatch[3].length === 2
            ? `20${numericDateMatch[3]}`
            : numericDateMatch[3]
        )
      : now.getFullYear();

    const date = new Date(year, month, day);

    if (!Number.isNaN(date.getTime())) {
      return getDateValueFromDate(date);
    }
  }

  return "";
}

function extractName(value: string) {
  const patterns = [
    /\bmy name is\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bthis is\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bi am\s+([a-z][a-z\s.'-]{1,40})/i,
    /\bi'm\s+([a-z][a-z\s.'-]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return match[1]
        .replace(/\b(and|for|at|on|can|could|would|looking)\b.*$/i, "")
        .trim();
    }
  }

  return "";
}

function inferSource(value: string) {
  const lowerValue = value.toLowerCase();

  if (lowerValue.includes("whatsapp")) return "whatsapp";
  if (
    lowerValue.includes("instagram") ||
    lowerValue.includes("insta") ||
    lowerValue.includes(" ig ") ||
    lowerValue.includes("dm")
  ) {
    return "dm";
  }
  if (lowerValue.includes("text") || lowerValue.includes("sms")) return "text";
  if (lowerValue.includes("call") || lowerValue.includes("phone")) return "phone";

  return "manual";
}

function formatMoney(value: number | null) {
  if (value === null || value === undefined) return "Price not listed";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPriceFromType(
  value: number | null,
  pricingType: string | null | undefined
) {
  const type = pricingType || "fixed";

  if (type === "quote") return "Quote required";
  if (type === "varies") return "Price varies";

  if (value === null || value === undefined) {
    if (type === "hourly") return "Hourly rate not listed";
    if (type === "starting_at") return "Starting price not listed";
    return "Price not listed";
  }

  if (type === "hourly") return `${formatMoney(value)}/hr`;
  if (type === "starting_at") return `Starting at ${formatMoney(value)}`;

  return formatMoney(value);
}

function getServicePriceLabel(service: Service) {
  return formatPriceFromType(service.price, service.pricing_type);
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

function formatDuration(value: number | null) {
  if (!value) return "Duration varies";

  return `${value} min`;
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
  const [isCreateBookingOpen, setIsCreateBookingOpen] = useState(false);

  const [captureText, setCaptureText] = useState("");
  const [captureMessage, setCaptureMessage] = useState("");
  const [capturedCustomerName, setCapturedCustomerName] = useState("");
  const [capturedCustomerPhone, setCapturedCustomerPhone] = useState("");
  const [capturedCustomerEmail, setCapturedCustomerEmail] = useState("");
  const [isCreatingCapturedCustomer, setIsCreatingCapturedCustomer] =
    useState(false);

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
      .select("id, name, price, pricing_type, duration_minutes, is_active")
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

  function findMatchingCustomer(
    customerName: string,
    customerPhone: string,
    customerEmail: string
  ) {
    const email = customerEmail.trim().toLowerCase();
    const phone = normalizePhone(customerPhone);
    const name = customerName.trim().toLowerCase();

    return (
      customers.find((customer) => {
        const customerEmailValue = (customer.email || "").toLowerCase();
        const customerPhoneValue = normalizePhone(customer.phone);
        const customerNameValue = (
          customer.full_name ||
          customer.name ||
          ""
        ).toLowerCase();

        return (
          (email && customerEmailValue === email) ||
          (phone && customerPhoneValue.endsWith(phone.slice(-7))) ||
          (name && customerNameValue.includes(name))
        );
      }) || null
    );
  }

  function findMatchingService(message: string) {
    const lowerMessage = message.toLowerCase();

    return (
      services.find((service) =>
        lowerMessage.includes(service.name.toLowerCase())
      ) || null
    );
  }

  function handleExtractBookingDetails() {
    if (!captureText.trim()) {
      setCaptureMessage("Paste a customer message first.");
      return;
    }

    const extractedEmail = extractEmail(captureText);
    const extractedPhone = extractPhone(captureText);
    const extractedName = extractName(captureText);
    const extractedDate = extractDate(captureText);
    const extractedTime = extractTime(captureText);
    const extractedSource = inferSource(captureText);
    const matchingCustomer = findMatchingCustomer(
      extractedName,
      extractedPhone,
      extractedEmail
    );
    const matchingService = findMatchingService(captureText);

    setCapturedCustomerName(extractedName);
    setCapturedCustomerPhone(extractedPhone);
    setCapturedCustomerEmail(extractedEmail);

    if (matchingCustomer) {
      setSelectedCustomerId(matchingCustomer.id);
    }

    if (matchingService) {
      setSelectedServiceId(matchingService.id);
    }

    if (extractedDate) {
      setBookingDate(extractedDate);
    }

    if (extractedTime) {
      setBookingTime(extractedTime);
    }

    setSource(extractedSource);

    const assistantNote = [
      "Captured from customer message:",
      captureText.trim(),
      extractedName ? `Customer name found: ${extractedName}` : "",
      extractedPhone ? `Phone found: ${extractedPhone}` : "",
      extractedEmail ? `Email found: ${extractedEmail}` : "",
      !matchingCustomer && (extractedName || extractedPhone || extractedEmail)
        ? "No matching customer was found. Create the captured customer before saving."
        : "",
      !matchingService ? "No exact service match found. Choose the service manually." : "",
      !extractedDate ? "No date found. Choose the date manually." : "",
      !extractedTime ? "No time found. Choose the time manually." : "",
    ]
      .filter(Boolean)
      .join("\n");

    setNotes(assistantNote);

    setCaptureMessage(
      [
        matchingCustomer ? "Customer matched." : "Customer needs review.",
        matchingService ? "Service matched." : "Choose service manually.",
        extractedDate ? "Date found." : "Choose date manually.",
        extractedTime ? "Time found." : "Choose time manually.",
      ].join(" ")
    );
  }

  async function createCapturedCustomer() {
    if (!businessProfile) {
      setCaptureMessage("Business profile not loaded yet.");
      return;
    }

    if (
      !capturedCustomerName.trim() &&
      !capturedCustomerPhone.trim() &&
      !capturedCustomerEmail.trim()
    ) {
      setCaptureMessage("No customer details were found to create.");
      return;
    }

    setIsCreatingCapturedCustomer(true);
    setCaptureMessage("");

    const fallbackName =
      capturedCustomerName.trim() ||
      capturedCustomerPhone.trim() ||
      capturedCustomerEmail.trim() ||
      "Customer";

    const { data, error } = await supabase
      .from("customers")
      .insert({
        business_id: businessProfile.id,
        owner_id: businessProfile.owner_id,
        full_name: fallbackName,
        name: fallbackName,
        phone: capturedCustomerPhone.trim() || null,
        email: capturedCustomerEmail.trim() || null,
      })
      .select("id, full_name, name, phone, email")
      .single();

    if (error) {
      setCaptureMessage(error.message);
      setIsCreatingCapturedCustomer(false);
      return;
    }

    const newCustomer = data as Customer;

    setCustomers((currentCustomers) => [newCustomer, ...currentCustomers]);
    setSelectedCustomerId(newCustomer.id);
    setCaptureMessage("Captured customer created and selected.");
    setIsCreatingCapturedCustomer(false);
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
  const todayCount =
    bookingSections.find((section) => section.key === "today")?.bookings
      .length || 0;
  const tomorrowCount =
    bookingSections.find((section) => section.key === "tomorrow")?.bookings
      .length || 0;
  const thisWeekCount =
    bookingSections.find((section) => section.key === "this-week")?.bookings
      .length || 0;
  const laterCount =
    bookingSections.find((section) => section.key === "later")?.bookings
      .length || 0;
  const pastCount =
    bookingSections.find((section) => section.key === "past")?.bookings
      .length || 0;

  const upcomingCount = todayCount + tomorrowCount + thisWeekCount + laterCount;
  const pendingCount = bookings.filter(
    (booking) => !booking.status || booking.status === "pending"
  ).length;
  const canCreateBooking = customers.length > 0 && services.length > 0;
  const shouldShowCreateBooking =
    isCreateBookingOpen || (!isLoading && bookings.length === 0);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Bookings
              </p>

              <h1 className="mt-3 text-4xl font-black text-white">
                Manage your schedule.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                Create manual bookings, review upcoming appointments, and keep
                your customer schedule organized from one focused page.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setIsCreateBookingOpen((currentValue) => !currentValue)
                }
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
              >
                {shouldShowCreateBooking ? "Hide booking form" : "Add booking"}
              </button>

              <Link
                href="/dashboard/requests"
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                Review requests
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Total Bookings
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {isLoading ? "..." : bookings.length}
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
              Upcoming
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {isLoading ? "..." : upcomingCount}
            </p>
          </div>

          <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-yellow-200">
              Pending
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {isLoading ? "..." : pendingCount}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-500">
              Past
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {isLoading ? "..." : pastCount}
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <button
            type="button"
            onClick={() =>
              setIsCreateBookingOpen((currentValue) => !currentValue)
            }
            className="flex w-full flex-col gap-4 p-6 text-left transition hover:bg-white/[0.03] lg:flex-row lg:items-start lg:justify-between"
          >
            <div>
              <p className="text-sm font-black text-emerald-300">
                Manual Booking
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                Create a booking
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                Add appointments manually when a customer books through text,
                phone, DM, or in person.
              </p>
            </div>

            <span className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300">
              {shouldShowCreateBooking ? "Collapse" : "Expand"}
            </span>
          </button>

          {shouldShowCreateBooking && (
            <div className="border-t border-white/10 p-6">

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-300">
                  Booking Capture Assistant
                </p>

                <h3 className="mt-3 text-xl font-black text-white">
                  Paste a DM, text, or email.
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                  SchedNest will look for the customer, service, date, time,
                  contact info, and source, then prefill the manual booking form
                  for your review.
                </p>
              </div>

              <span className="w-fit rounded-full bg-black/20 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                Review before saving
              </span>
            </div>

            <textarea
              value={captureText}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Example: Hey this is Alex, can I book the total package this Friday at 3pm? My number is 323-555-0199."
              className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500 focus:border-emerald-400"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleExtractBookingDetails}
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Extract booking details
              </button>

              {(capturedCustomerName ||
                capturedCustomerPhone ||
                capturedCustomerEmail) &&
                !selectedCustomerId && (
                  <button
                    type="button"
                    onClick={createCapturedCustomer}
                    disabled={isCreatingCapturedCustomer}
                    className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingCapturedCustomer
                      ? "Creating customer..."
                      : "Create captured customer"}
                  </button>
                )}

              <button
                type="button"
                onClick={() => {
                  setCaptureText("");
                  setCaptureMessage("");
                  setCapturedCustomerName("");
                  setCapturedCustomerPhone("");
                  setCapturedCustomerEmail("");
                }}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Clear assistant
              </button>
            </div>

            {captureMessage && (
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-gray-300">
                {captureMessage}
              </p>
            )}

            {(capturedCustomerName ||
              capturedCustomerPhone ||
              capturedCustomerEmail) && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-300 md:grid-cols-3">
                <p>
                  <span className="font-black text-white">Name:</span>{" "}
                  {capturedCustomerName || "Not found"}
                </p>
                <p>
                  <span className="font-black text-white">Phone:</span>{" "}
                  {capturedCustomerPhone || "Not found"}
                </p>
                <p>
                  <span className="font-black text-white">Email:</span>{" "}
                  {capturedCustomerEmail || "Not found"}
                </p>
              </div>
            )}
          </div>

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
                      {service.name} — {getServicePriceLabel(service)} — {formatDuration(service.duration_minutes)}
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
          )}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8">
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
        </section>
      </div>
    </DashboardShell>
  );
}