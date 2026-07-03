"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type CustomerStatus = "active" | "archived" | "blocked";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
};

type Customer = {
  id: string;
  business_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: CustomerStatus | null;
  internal_flag_note: string | null;
  flagged_at: string | null;
  blocked_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type CustomerBooking = {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: string | null;
  start_time: string;
  end_time: string | null;
};

type CustomerBookingSummary = {
  totalBookings: number;
  completedVisits: number;
  upcomingBookings: number;
  lastBookingAt: string | null;
  nextBookingAt: string | null;
};

const CUSTOMER_LIST_OPEN_KEY = "schednest_customer_list_open";

function getCustomerStatus(customer: Customer): CustomerStatus {
  return customer.status || "active";
}

function formatStatus(value: string | null) {
  if (!value) return "Active";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "Not set";

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusClass(status: CustomerStatus) {
  if (status === "blocked") {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (status === "archived") {
    return "border-white/10 bg-white/10 text-gray-300";
  }

  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
}

function isCompletedVisit(status: string | null) {
  return status === "completed";
}

function isUpcomingBooking(status: string | null, startTime: string) {
  const appointmentTime = new Date(startTime).getTime();
  const now = Date.now();

  return (
    appointmentTime >= now &&
    ["pending", "confirmed", "approved"].includes(status || "")
  );
}

export default function CustomersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "archived" | "blocked"
  >("active");

  const [isCustomerListOpen, setIsCustomerListOpen] = useState(true);
  const [flagNoteEdits, setFlagNoteEdits] = useState<Record<string, string>>(
    {}
  );

  const activeCustomers = customers.filter(
    (customer) => getCustomerStatus(customer) === "active"
  );

  const archivedCustomers = customers.filter(
    (customer) => getCustomerStatus(customer) === "archived"
  );

  const blockedCustomers = customers.filter(
    (customer) => getCustomerStatus(customer) === "blocked"
  );

  const totalCompletedVisits = bookings.filter((booking) =>
    isCompletedVisit(booking.status)
  ).length;

  const upcomingBookingCount = bookings.filter((booking) =>
    isUpcomingBooking(booking.status, booking.start_time)
  ).length;

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.trim().toLowerCase();
    const customerStatus = getCustomerStatus(customer);

    const matchesStatus =
      statusFilter === "all" || customerStatus === statusFilter;

    const searchableText = [
      customer.name,
      customer.email,
      customer.phone,
      customer.notes,
      customer.internal_flag_note,
      customerStatus,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = !query || searchableText.includes(query);

    return matchesStatus && matchesSearch;
  });

  const shouldShowCustomerList =
    isCustomerListOpen || searchQuery.trim().length > 0;

  function loadCustomerListPreference(customerCount: number) {
    const savedValue = window.localStorage.getItem(CUSTOMER_LIST_OPEN_KEY);

    if (savedValue === "true" || savedValue === "false") {
      setIsCustomerListOpen(savedValue === "true");
      return;
    }

    if (customerCount > 50) {
      setIsCustomerListOpen(false);
      window.localStorage.setItem(CUSTOMER_LIST_OPEN_KEY, "false");
    }
  }

  function toggleCustomerList() {
    setIsCustomerListOpen((currentValue) => {
      const nextValue = !currentValue;
      window.localStorage.setItem(CUSTOMER_LIST_OPEN_KEY, String(nextValue));
      return nextValue;
    });
  }

  function getBookingsForCustomer(customer: Customer) {
    const customerEmail = customer.email?.trim().toLowerCase() || "";
    const customerPhone = customer.phone?.trim() || "";
    const customerName = customer.name?.trim().toLowerCase() || "";

    return bookings.filter((booking) => {
      if (booking.customer_id === customer.id) return true;

      const bookingEmail = booking.customer_email?.trim().toLowerCase() || "";
      const bookingPhone = booking.customer_phone?.trim() || "";
      const bookingName = booking.customer_name?.trim().toLowerCase() || "";

      if (customerEmail && bookingEmail && customerEmail === bookingEmail) {
        return true;
      }

      if (customerPhone && bookingPhone && customerPhone === bookingPhone) {
        return true;
      }

      if (customerName && bookingName && customerName === bookingName) {
        return true;
      }

      return false;
    });
  }

  function getCustomerBookingSummary(customer: Customer): CustomerBookingSummary {
    const customerBookings = getBookingsForCustomer(customer);
    const sortedBookings = [...customerBookings].sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const completedVisits = customerBookings.filter((booking) =>
      isCompletedVisit(booking.status)
    ).length;

    const upcomingBookings = customerBookings.filter((booking) =>
      isUpcomingBooking(booking.status, booking.start_time)
    ).length;

    const pastBookings = sortedBookings.filter(
      (booking) => new Date(booking.start_time).getTime() < Date.now()
    );

    const futureBookings = sortedBookings.filter(
      (booking) => new Date(booking.start_time).getTime() >= Date.now()
    );

    return {
      totalBookings: customerBookings.length,
      completedVisits,
      upcomingBookings,
      lastBookingAt:
        pastBookings.length > 0
          ? pastBookings[pastBookings.length - 1].start_time
          : null,
      nextBookingAt:
        futureBookings.length > 0 ? futureBookings[0].start_time : null,
    };
  }

  async function loadCustomers() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to view customers.");
      setIsLoading(false);
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from("business_profiles")
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      setMessage(businessError.message);
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    if (!businessData) {
      setMessage("Create your business profile before adding customers.");
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    const safeBusiness = businessData as BusinessProfile;
    setBusiness(safeBusiness);

    const { data: customersData, error: customersError } = await supabase
      .from("customers")
      .select(
        "id, business_id, name, email, phone, notes, status, internal_flag_note, flagged_at, blocked_at, archived_at, created_at, updated_at"
      )
      .eq("business_id", safeBusiness.id)
      .order("created_at", { ascending: false });

    if (customersError) {
      setMessage(customersError.message);
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select(
        "id, customer_id, customer_name, customer_phone, customer_email, status, start_time, end_time"
      )
      .eq("business_id", safeBusiness.id)
      .order("start_time", { ascending: false });

    if (bookingsError) {
      setMessage(bookingsError.message);
      setBookings([]);
      setIsLoading(false);
      return;
    }

    const safeCustomers = (customersData || []) as Customer[];

    setCustomers(safeCustomers);
    setBookings((bookingsData || []) as CustomerBooking[]);

    const initialFlagNotes: Record<string, string> = {};

    safeCustomers.forEach((customer) => {
      initialFlagNotes[customer.id] = customer.internal_flag_note || "";
    });

    setFlagNoteEdits(initialFlagNotes);
    loadCustomerListPreference(safeCustomers.length);
    setIsLoading(false);
  }

  async function handleAddCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!business) {
      setMessage("Create your business profile before adding customers.");
      return;
    }

    if (!name.trim()) {
      setMessage("Please enter a customer name.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.from("customers").insert({
      business_id: business.id,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      status: "active",
      updated_at: new Date().toISOString(),
    });

    if (error) {
      setMessage(error.message);
      setIsSaving(false);
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setMessage("Customer added.");

    await loadCustomers();
    setIsSaving(false);
  }

  async function updateCustomerStatus(
    customer: Customer,
    nextStatus: CustomerStatus
  ) {
    setMessage("");

    const now = new Date().toISOString();

    const updatePayload: Partial<Customer> = {
      status: nextStatus,
      updated_at: now,
    };

    if (nextStatus === "active") {
      updatePayload.archived_at = null;
      updatePayload.blocked_at = null;
    }

    if (nextStatus === "archived") {
      updatePayload.archived_at = now;
      updatePayload.blocked_at = null;
    }

    if (nextStatus === "blocked") {
      updatePayload.blocked_at = now;
      updatePayload.archived_at = null;
      updatePayload.flagged_at = customer.flagged_at || now;
    }

    const { error } = await supabase
      .from("customers")
      .update(updatePayload)
      .eq("id", customer.id)
      .eq("business_id", customer.business_id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (nextStatus === "blocked") {
      setMessage("Customer blocked internally. They will not be notified.");
    } else if (nextStatus === "archived") {
      setMessage("Customer archived.");
    } else {
      setMessage("Customer restored to active.");
    }

    await loadCustomers();
  }

  async function saveInternalFlagNote(customer: Customer) {
    setMessage("");

    const note = flagNoteEdits[customer.id]?.trim() || null;
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("customers")
      .update({
        internal_flag_note: note,
        flagged_at: note ? customer.flagged_at || now : null,
        updated_at: now,
      })
      .eq("id", customer.id)
      .eq("business_id", customer.business_id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Private customer note saved.");
    await loadCustomers();
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Customers
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Manage your customer base.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Search customers, review booking history, add private notes, and
            keep your customer list organized as your business grows.
          </p>

          {message && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
              {message}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Total Customers</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : customers.length}
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-bold text-emerald-300">Active</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : activeCustomers.length}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Completed Visits</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : totalCompletedVisits}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Upcoming</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : upcomingBookingCount}
            </p>
          </div>

          <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-bold text-red-300">Blocked</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : blockedCustomers.length}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-2xl font-black text-white">Add Customer</h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Add customers manually or let SchedNest build this list
              automatically from booking requests.
            </p>

            <form
              onSubmit={handleAddCustomer}
              className="mt-6 grid gap-4 lg:grid-cols-2"
            >
              <div>
                <label className="text-sm font-bold text-gray-300">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Customer name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/60"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="customer@example.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Phone number"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/60"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional note"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/60"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-2xl bg-emerald-400 px-5 py-4 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 lg:col-span-2"
              >
                {isSaving ? "Adding customer..." : "Add Customer"}
              </button>
            </form>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
              Rewards Ready
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Loyalty tracking foundation
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              SchedNest is already tracking completed visits by customer. Later,
              the rewards program can use these visit counts for offers like
              “5 visits = 20% off” or “10 visits = free add-on.”
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Completed Visits
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {isLoading ? "..." : totalCompletedVisits}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Future Feature
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  Rewards Program
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              Only completed bookings count as visits. Pending, declined,
              canceled, or no-show bookings should not count toward rewards.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black text-white">
                Customer List
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Search your customers, review visit activity, save private
                notes, and protect your business when needed.
              </p>
            </div>

            <button
              type="button"
              onClick={toggleCustomerList}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
            >
              {isCustomerListOpen ? "Hide List" : "Show List"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, phone, notes, or status..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/60"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    | "all"
                    | "active"
                    | "archived"
                    | "blocked"
                )
              }
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-400/60"
            >
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="archived">Archived</option>
              <option value="all">All Customers</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["active", "blocked", "archived", "all"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                  statusFilter === filter
                    ? "bg-emerald-400 text-black"
                    : "border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {filter === "all" ? "All" : formatStatus(filter)}
              </button>
            ))}
          </div>

          {!shouldShowCustomerList ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm leading-6 text-gray-400">
                Customer list minimized. Use search to quickly find a customer
                or show the list when you need to review everyone.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-gray-400">
                  Loading customers...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="rounded-[2rem] border border-white/10 bg-black/20 p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-2xl">
                    ✦
                  </div>

                  <h3 className="mt-4 text-xl font-black text-white">
                    No customers found.
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-400">
                    Try changing your search or filter. Customers will also be
                    saved automatically when they book through your public
                    booking page.
                  </p>

                  <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                    <Link
                      href="/dashboard/booking-page"
                      className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                    >
                      Share booking page
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("active");
                      }}
                      className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Reset filters
                    </button>
                  </div>
                </div>
              ) : (
                filteredCustomers.map((customer) => {
                  const status = getCustomerStatus(customer);
                  const summary = getCustomerBookingSummary(customer);

                  return (
                    <div
                      key={customer.id}
                      className="rounded-[2rem] border border-white/10 bg-black/20 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-black text-white">
                              {customer.name || "Unnamed customer"}
                            </h3>

                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${getStatusClass(
                                status
                              )}`}
                            >
                              {formatStatus(status)}
                            </span>
                          </div>

                          <div className="mt-3 grid gap-1 text-sm leading-6 text-gray-400">
                            <p>Email: {customer.email || "Not provided"}</p>
                            <p>Phone: {customer.phone || "Not provided"}</p>
                            <p>Added: {formatDate(customer.created_at)}</p>
                          </div>

                          {customer.notes && (
                            <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-6 text-gray-400">
                              {customer.notes}
                            </p>
                          )}

                          {status === "blocked" && (
                            <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                              <p className="text-sm font-black text-red-300">
                                Internal warning
                              </p>
                              <p className="mt-2 text-sm leading-6 text-red-100/80">
                                This customer is blocked internally. They will
                                not be notified. Future booking attempts should
                                be reviewed carefully.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 lg:justify-end">
                          {status !== "active" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateCustomerStatus(customer, "active")
                              }
                              className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                            >
                              Restore
                            </button>
                          )}

                          {status !== "archived" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateCustomerStatus(customer, "archived")
                              }
                              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/10"
                            >
                              Archive
                            </button>
                          )}

                          {status !== "blocked" && (
                            <button
                              type="button"
                              onClick={() =>
                                updateCustomerStatus(customer, "blocked")
                              }
                              className="rounded-2xl border border-red-400/30 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/10"
                            >
                              Block
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Total Bookings
                          </p>
                          <p className="mt-2 text-2xl font-black text-white">
                            {summary.totalBookings}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                            Completed Visits
                          </p>
                          <p className="mt-2 text-2xl font-black text-white">
                            {summary.completedVisits}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Upcoming
                          </p>
                          <p className="mt-2 text-2xl font-black text-white">
                            {summary.upcomingBookings}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Last Visit
                          </p>
                          <p className="mt-2 text-sm font-black text-white">
                            {formatDate(summary.lastBookingAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-black text-emerald-300">
                              Rewards-ready visit count
                            </p>
                            <p className="mt-1 text-sm leading-6 text-gray-400">
                              This customer has {summary.completedVisits}{" "}
                              completed visit
                              {summary.completedVisits === 1 ? "" : "s"}.
                              Future rewards can use this number.
                            </p>
                          </div>

                          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black text-emerald-300">
                            {summary.completedVisits} visits
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <label className="text-sm font-black text-white">
                          Private internal note
                        </label>

                        <p className="mt-2 text-xs leading-5 text-gray-500">
                          Only the business can see this. Customers are not told
                          they are flagged, blocked, or noted.
                        </p>

                        <textarea
                          value={flagNoteEdits[customer.id] || ""}
                          onChange={(event) =>
                            setFlagNoteEdits((current) => ({
                              ...current,
                              [customer.id]: event.target.value,
                            }))
                          }
                          placeholder="Add private context, behavior concerns, refund issues, no-show history, rude behavior, etc."
                          className="mt-3 min-h-24 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-emerald-400/60"
                        />

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-xs text-gray-500">
                            Last flagged: {formatDate(customer.flagged_at)}
                          </p>

                          <button
                            type="button"
                            onClick={() => saveInternalFlagNote(customer)}
                            className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/20"
                          >
                            Save Private Note
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}