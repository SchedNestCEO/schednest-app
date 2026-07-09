"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "./components/DashboardShell";
import { createClient } from "../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
  slug: string | null;
  booking_time_mode: string | null;
  business_hours_enabled: boolean | null;
};

type DashboardStats = {
  todaysBookings: number;
  pendingRequests: number;
  customers: number;
  birdySuggestions: number;
  services: number;
  activeServices: number;
  businessHours: number;
  unreadNotifications: number;
};

type BirdySuggestionPriority = "high" | "normal" | "low";

type BirdySuggestion = {
  id: string;
  suggestion_type: string;
  title: string;
  description: string;
  action_label: string | null;
  action_href: string | null;
  priority: BirdySuggestionPriority;
  status: string;
  source: string;
  created_at: string;
};

type SetupItem = {
  title: string;
  description: string;
  isComplete: boolean;
  href: string;
  actionLabel: string;
};

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function formatLabel(value?: string | null) {
  if (!value) return "Pending";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPriorityClass(priority: BirdySuggestionPriority) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }

  if (priority === "normal") {
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
  }

  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
}

function formatPriority(priority: BirdySuggestionPriority) {
  if (priority === "high") return "High";
  if (priority === "normal") return "Normal";
  return "Low";
}

function getCompletionPercent(completed: number, total: number) {
  if (total === 0) return 0;

  return Math.round((completed / total) * 100);
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [birdySuggestions, setBirdySuggestions] = useState<BirdySuggestion[]>(
    []
  );
  const [copyMessage, setCopyMessage] = useState("");
  const [stats, setStats] = useState<DashboardStats>({
    todaysBookings: 0,
    pendingRequests: 0,
    customers: 0,
    birdySuggestions: 0,
    services: 0,
    activeServices: 0,
    businessHours: 0,
    unreadNotifications: 0,
  });

  async function loadDashboard() {
    setIsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsLoading(false);
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from("business_profiles")
      .select("id, owner_id, business_name, slug, booking_time_mode, business_hours_enabled")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !businessData) {
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    const safeBusiness = businessData as BusinessProfile;
    setBusiness(safeBusiness);

    const todayRange = getTodayRange();

    const [
      todaysBookingsResult,
      pendingRequestsResult,
      customersResult,
      servicesResult,
      activeServicesResult,
      businessHoursResult,
      birdySuggestionsCountResult,
      birdySuggestionsResult,
      unreadNotificationsResult,
      subscriptionResult,
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .gte("start_time", todayRange.start)
        .lt("start_time", todayRange.end)
        .in("status", ["approved", "confirmed"]),

      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .eq("status", "pending"),

      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id),

      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id),

      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .eq("is_active", true),

      supabase
        .from("business_hours")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .eq("is_open", true),

      supabase
        .from("birdy_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .eq("status", "active"),

      supabase
        .from("birdy_suggestions")
        .select(
          "id, suggestion_type, title, description, action_label, action_href, priority, status, source, created_at"
        )
        .eq("business_id", safeBusiness.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(3),

      supabase
        .from("booking_notifications")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .eq("event_type", "booking.requested")
        .ilike("subject", "New booking request%")
        .is("read_at", null),

      supabase
        .from("business_subscriptions")
        .select("status")
        .eq("business_id", safeBusiness.id)
        .maybeSingle(),
    ]);

    const businessHoursAreOptional =
      safeBusiness.booking_time_mode === "flexible_requests" ||
      safeBusiness.business_hours_enabled === false;

    const businessHoursConfigured = businessHoursAreOptional
      ? 1
      : businessHoursResult.count || 0;

    setStats({
      todaysBookings: todaysBookingsResult.count || 0,
      pendingRequests: pendingRequestsResult.count || 0,
      customers: customersResult.count || 0,
      services: servicesResult.count || 0,
      activeServices: activeServicesResult.count || 0,
      businessHours: businessHoursConfigured,
      birdySuggestions: birdySuggestionsCountResult.count || 0,
      unreadNotifications: unreadNotificationsResult.count || 0,
    });

    setBirdySuggestions(
      (birdySuggestionsResult.data || []) as BirdySuggestion[]
    );
    setSubscriptionStatus(subscriptionResult.data?.status || null);
    setIsLoading(false);
  }

  async function copyBookingLink() {
    if (!business?.slug) {
      setCopyMessage("Create your booking page slug first.");
      return;
    }

    const bookingUrl = `${window.location.origin}/book/${business.slug}`;

    await navigator.clipboard.writeText(bookingUrl);
    setCopyMessage("Booking link copied.");

    window.setTimeout(() => {
      setCopyMessage("");
    }, 2500);
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bookingPageHref = business?.slug
    ? `/book/${business.slug}`
    : "/dashboard/booking-page";

  const setupItems: SetupItem[] = [
    {
      title: "Create your business profile",
      description: "Add your business name and basic booking identity.",
      isComplete: Boolean(business),
      href: "/dashboard/profile",
      actionLabel: "Edit profile",
    },
    {
      title: "Add your services",
      description: "Create the services customers can request.",
      isComplete: stats.services > 0,
      href: "/dashboard/services",
      actionLabel: "Manage services",
    },
    {
      title: "Activate at least one service",
      description: "Make sure at least one service is active and bookable.",
      isComplete: stats.activeServices > 0,
      href: "/dashboard/services",
      actionLabel: "Activate services",
    },
    {
      title: "Set your working hours",
      description: "Tell customers when your business is available.",
      isComplete: stats.businessHours > 0,
      href: "/dashboard/booking-page",
      actionLabel: "Set hours",
    },
    {
      title: "Create your public booking link",
      description: "Your booking page needs a public slug before sharing.",
      isComplete: Boolean(business?.slug),
      href: "/dashboard/booking-page",
      actionLabel: "Open booking page",
    },
  ];

  const completedSetupItems = setupItems.filter((item) => item.isComplete);
  const setupPercent = getCompletionPercent(
    completedSetupItems.length,
    setupItems.length
  );
  const nextSetupItem = setupItems.find((item) => !item.isComplete);

  const needsAttentionItems = [
    {
      title: "Pending booking requests",
      description:
        stats.pendingRequests > 0
          ? `${stats.pendingRequests} request${
              stats.pendingRequests === 1 ? "" : "s"
            } waiting for approval.`
          : "No pending booking requests right now.",
      count: stats.pendingRequests,
      href: "/dashboard/requests",
      actionLabel: "Review requests",
      isUrgent: stats.pendingRequests > 0,
    },
    {
      title: "Unread booking notifications",
      description:
        stats.unreadNotifications > 0
          ? `${stats.unreadNotifications} unread booking notification${
              stats.unreadNotifications === 1 ? "" : "s"
            } waiting.`
          : "You are caught up on booking notifications.",
      count: stats.unreadNotifications,
      href: "/dashboard/requests",
      actionLabel: "Review alerts",
      isUrgent: stats.unreadNotifications > 0,
    },
    {
      title: "No active services",
      description:
        "Activate at least one service before sharing your booking page.",
      count: stats.activeServices === 0 ? 1 : 0,
      href: "/dashboard/services",
      actionLabel: "Manage services",
      isUrgent: stats.activeServices === 0,
    },
    {
      title: "Business hours missing",
      description: "Set your available hours so clients can request valid times.",
      count: stats.businessHours === 0 ? 1 : 0,
      href: "/dashboard/booking-page",
      actionLabel: "Set hours",
      isUrgent: stats.businessHours === 0,
    },
  ];

  const activeNeedsAttentionItems = needsAttentionItems.filter(
    (item) => item.isUrgent
  );

  const mainAction =
    stats.pendingRequests > 0
      ? {
          label: `Review ${stats.pendingRequests} request${
            stats.pendingRequests === 1 ? "" : "s"
          }`,
          href: "/dashboard/requests",
        }
      : nextSetupItem
      ? {
          label: nextSetupItem.actionLabel,
          href: nextSetupItem.href,
        }
      : {
          label: "View bookings",
          href: "/dashboard/bookings",
        };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 lg:p-8">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Command Center
              </p>

              <h1 className="mt-3 text-4xl font-black text-white md:text-5xl">
                {isLoading
                  ? "Checking your Nest..."
                  : stats.pendingRequests > 0
                  ? "You have requests waiting."
                  : nextSetupItem
                  ? "Finish your setup."
                  : "Your Nest is ready."}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                {isLoading
                  ? "Loading your bookings, setup status, requests, and customer activity."
                  : stats.pendingRequests > 0
                  ? "Start by reviewing customer booking requests so no opportunity sits unanswered."
                  : nextSetupItem
                  ? `${nextSetupItem.title}: ${nextSetupItem.description}`
                  : "Manage bookings, customers, services, and booking growth from one focused dashboard."}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href={mainAction.href}
                  className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
                >
                  {mainAction.label}
                </Link>

                <button
                  type="button"
                  onClick={copyBookingLink}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Copy booking link
                </button>

                <Link
                  href={bookingPageHref}
                  className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-center text-sm font-black text-emerald-300 transition hover:bg-emerald-400/15"
                >
                  View booking page
                </Link>

                <Link
                  href="/dashboard/settings"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Open settings
                </Link>
              </div>

              {copyMessage && (
                <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300">
                  {copyMessage}
                </p>
              )}
            </div>

            <div className="border-t border-white/10 bg-black/20 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-emerald-300">
                    Setup Progress
                  </p>

                  <h2 className="mt-2 text-4xl font-black text-white">
                    {isLoading ? "..." : `${setupPercent}%`}
                  </h2>
                </div>

                <Link
                  href="/dashboard/settings"
                  className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Manage
                </Link>
              </div>

              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${setupPercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                {completedSetupItems.length} of {setupItems.length} setup steps
                complete.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Subscription
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  {isLoading ? "..." : formatLabel(subscriptionStatus)}
                </p>

                <Link
                  href="/dashboard/account"
                  className="mt-3 inline-block text-sm font-black text-emerald-300 transition hover:text-emerald-200"
                >
                  Manage account →
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/dashboard/bookings"
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
          >
            <p className="text-sm font-bold text-gray-400">
              Today&apos;s Bookings
            </p>

            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : stats.todaysBookings}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {stats.todaysBookings > 0
                ? "Appointments scheduled for today."
                : "No appointments scheduled for today yet."}
            </p>
          </Link>

          <Link
            href="/dashboard/requests"
            className={`rounded-[2rem] border p-5 transition ${
              stats.pendingRequests > 0
                ? "border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/15"
                : "border-white/10 bg-white/[0.04] hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-gray-400">
                Pending Requests
              </p>

              {stats.pendingRequests > 0 && (
                <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-black">
                  Action
                </span>
              )}
            </div>

            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : stats.pendingRequests}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {stats.pendingRequests > 0
                ? "New customer requests are waiting for review."
                : "No pending requests right now."}
            </p>
          </Link>

          <Link
            href="/dashboard/customers"
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
          >
            <p className="text-sm font-bold text-gray-400">Customers</p>

            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : stats.customers}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {stats.customers > 0
                ? "Customers saved from your booking flow."
                : "Customers will appear here after they book with you."}
            </p>
          </Link>

          <Link
            href="/dashboard/services"
            className={`rounded-[2rem] border p-5 transition ${
              stats.activeServices > 0
                ? "border-emerald-400/30 bg-emerald-400/10 hover:bg-emerald-400/15"
                : "border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/15"
            }`}
          >
            <p className="text-sm font-bold text-gray-400">Active Services</p>

            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : stats.activeServices}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {stats.activeServices > 0
                ? `${stats.services} total service${
                    stats.services === 1 ? "" : "s"
                  } created.`
                : "Activate a service before sharing your booking page."}
            </p>
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            href="/dashboard/bookings"
            className="rounded-[2rem] border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
          >
            <p className="text-sm font-black text-emerald-300">
              Quick Launch
            </p>
            <h3 className="mt-3 text-xl font-black text-white">
              Manage bookings
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              View today, upcoming appointments, and booking history.
            </p>
          </Link>

          <Link
            href="/dashboard/requests"
            className={`rounded-[2rem] border p-5 transition ${
              stats.pendingRequests > 0
                ? "border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/15"
                : "border-white/10 bg-black/20 hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
            }`}
          >
            <p className="text-sm font-black text-emerald-300">
              Requests
            </p>
            <h3 className="mt-3 text-xl font-black text-white">
              Review pending
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {stats.pendingRequests > 0
                ? `${stats.pendingRequests} request${
                    stats.pendingRequests === 1 ? "" : "s"
                  } need a decision.`
                : "No customer requests waiting right now."}
            </p>
          </Link>

          <Link
            href="/dashboard/services"
            className="rounded-[2rem] border border-white/10 bg-black/20 p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
          >
            <p className="text-sm font-black text-emerald-300">
              Services
            </p>
            <h3 className="mt-3 text-xl font-black text-white">
              Update menu
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Add services, change pricing, upload samples, or pause offers.
            </p>
          </Link>

          <Link
            href={bookingPageHref}
            className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5 transition hover:bg-emerald-400/15"
          >
            <p className="text-sm font-black text-emerald-300">
              Public Page
            </p>
            <h3 className="mt-3 text-xl font-black text-white">
              Preview booking
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              See what customers see when they open your booking link.
            </p>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-emerald-300">
                  Needs Attention
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  What needs action?
                </h2>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
                disabled={isLoading}
                className="w-fit rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {isLoading ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                  Checking your Nest...
                </div>
              ) : activeNeedsAttentionItems.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <p className="text-sm font-black text-emerald-300">
                    Your Nest is calm.
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    No urgent booking requests, setup issues, or unread booking
                    notifications need attention right now.
                  </p>
                </div>
              ) : (
                activeNeedsAttentionItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">
                          {item.title}
                        </p>

                        <p className="mt-2 text-xs leading-5 text-gray-300">
                          {item.description}
                        </p>
                      </div>

                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-yellow-300 px-2 text-xs font-black text-black">
                        {item.count}
                      </span>
                    </div>

                    <Link
                      href={item.href}
                      className="mt-4 block rounded-2xl bg-white px-4 py-3 text-center text-xs font-black text-black transition hover:bg-gray-200"
                    >
                      {item.actionLabel}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Setup Checklist
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Build your booking system
            </h2>

            <div className="mt-6 grid gap-3">
              {setupItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                        item.isComplete
                          ? "border-emerald-400 bg-emerald-400"
                          : "border-yellow-300"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-black text-white">
                          {item.title}
                        </p>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                            item.isComplete
                              ? "bg-emerald-400 text-black"
                              : "bg-yellow-300 text-black"
                          }`}
                        >
                          {item.isComplete ? "Done" : "Next"}
                        </span>
                      </div>

                      <p className="mt-2 text-xs leading-5 text-gray-400">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                Birdy Smart Suggestions
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                What Birdy recommends next
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                Birdy suggestions are saved recommendations based on your
                bookings, services, customers, and requests.
              </p>
            </div>

            <Link
              href="/dashboard/birdy"
              className="w-fit rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
            >
              Open Birdy
            </Link>
          </div>

          <div className="mt-6 grid gap-4">
            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-gray-400">
                  Loading Birdy suggestions...
                </p>
              </div>
            ) : birdySuggestions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-black text-white">
                  No active Birdy suggestions yet.
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Open Birdy and generate suggestions so they can appear here on
                  your dashboard.
                </p>

                <Link
                  href="/dashboard/birdy"
                  className="mt-4 inline-block rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
                >
                  Generate in Birdy
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {birdySuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${getPriorityClass(
                          suggestion.priority
                        )}`}
                      >
                        {formatPriority(suggestion.priority)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-gray-300">
                        Birdy
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-black text-white">
                      {suggestion.title}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-300">
                      {suggestion.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {suggestion.action_href && suggestion.action_label && (
                        <Link
                          href={suggestion.action_href}
                          className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-black transition hover:bg-gray-200"
                        >
                          {suggestion.action_label}
                        </Link>
                      )}

                      <Link
                        href="/dashboard/birdy"
                        className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                      >
                        View in Birdy
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}