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
    return "border-brand-orange/20 bg-brand-orange/10 text-brand-orange";
  }

  return "border-edition-primary/20 bg-edition-primary/10 text-edition-primary";
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
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState(false);
  const [hasCheckedSetupGuide, setHasCheckedSetupGuide] = useState(false);
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
    const timeoutId = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  function closeSetupGuide({ dismiss = false }: { dismiss?: boolean } = {}) {
    if (dismiss) {
      window.localStorage.setItem("schednest-setup-guide-dismissed", "true");
    }

    setIsSetupGuideOpen(false);
  }

  function reopenSetupGuide() {
    window.localStorage.removeItem("schednest-setup-guide-dismissed");
    setIsSetupGuideOpen(true);
  }

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
  const currentSetupStepIndex = setupItems.findIndex((item) => !item.isComplete);
  const isSetupComplete = completedSetupItems.length === setupItems.length;
  useEffect(() => {
    if (isLoading || hasCheckedSetupGuide) return;

    const dismissedSetupGuide =
      window.localStorage.getItem("schednest-setup-guide-dismissed") === "true";

    const timeoutId = window.setTimeout(() => {
      if (!isSetupComplete && !dismissedSetupGuide) {
        setIsSetupGuideOpen(true);
      }

      setHasCheckedSetupGuide(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isLoading, isSetupComplete, hasCheckedSetupGuide]);


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
        {isSetupGuideOpen && !isSetupComplete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-md">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-edition-primary/20 bg-surface-dark-raised p-5 shadow-[0_30px_120px_rgba(0,0,0,0.75)] sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
                    Setup Guide
                  </p>

                  <h2 className="mt-3 text-3xl font-black text-white">
                    Let’s set up your business.
                  </h2>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                    Follow these steps in order so your booking page is ready
                    for real customers. SchedNest will highlight the next thing
                    that needs your attention.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => closeSetupGuide()}
                  className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-white">
                      Setup progress
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {completedSetupItems.length} of {setupItems.length} steps
                      complete.
                    </p>
                  </div>

                  <span className="rounded-full bg-edition-primary px-3 py-1 text-sm font-black text-black">
                    {setupPercent}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-edition-primary transition-all"
                    style={{ width: `${setupPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                {setupItems.map((item, index) => {
                  const isCurrentStep =
                    !item.isComplete && index === currentSetupStepIndex;

                  return (
                    <Link
                      key={item.title}
                      href={item.href}
                      onClick={() => closeSetupGuide()}
                      className={`rounded-2xl border p-4 transition ${
                        item.isComplete
                          ? "border-edition-primary/20 bg-edition-primary/10"
                          : isCurrentStep
                            ? "border-brand-orange/40 bg-brand-orange/10 shadow-[0_0_35px_rgba(250,204,21,0.08)]"
                            : "border-white/10 bg-black/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3">
                          <div
                            className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
                              item.isComplete
                                ? "bg-edition-primary text-black"
                                : isCurrentStep
                                  ? "bg-brand-orange text-black"
                                  : "bg-white/10 text-gray-300"
                            }`}
                          >
                            {item.isComplete ? "✓" : index + 1}
                          </div>

                          <div>
                            <p className="text-sm font-black text-white">
                              {item.title}
                            </p>

                            <p className="mt-2 text-xs leading-5 text-gray-400">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                            item.isComplete
                              ? "bg-edition-primary text-black"
                              : isCurrentStep
                                ? "bg-brand-orange text-black"
                                : "bg-white/10 text-gray-300"
                          }`}
                        >
                          {item.isComplete
                            ? "Done"
                            : isCurrentStep
                              ? "Start here"
                              : "Upcoming"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
                {nextSetupItem && (
                  <Link
                    href={nextSetupItem.href}
                    onClick={() => closeSetupGuide()}
                    className="rounded-2xl bg-edition-primary px-5 py-4 text-center text-sm font-black text-black transition hover:bg-edition-primary-hover"
                  >
                    Continue: {nextSetupItem.actionLabel}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => closeSetupGuide({ dismiss: true })}
                  className="rounded-2xl border border-white/10 px-5 py-4 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Don’t show again
                </button>
              </div>
            </div>
          </div>
        )}
        <section className="torogoz-panel overflow-hidden rounded-[2rem]">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 lg:p-8">
              <p className="text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
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
                  className="rounded-2xl bg-edition-primary px-5 py-3 text-center text-sm font-black text-black transition hover:bg-edition-primary-hover"
                >
                  {mainAction.label}
                </Link>

                {!isSetupComplete && (
                  <button
                    type="button"
                    onClick={reopenSetupGuide}
                    className="rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-center text-sm font-black text-edition-primary transition hover:bg-edition-primary/15"
                  >
                    Open setup guide
                  </button>
                )}

                <button
                  type="button"
                  onClick={copyBookingLink}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Copy booking link
                </button>

                <Link
                  href={bookingPageHref}
                  className="rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-center text-sm font-black text-edition-primary transition hover:bg-edition-primary/15"
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
                <p className="mt-4 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-4 py-3 text-sm font-black text-edition-primary">
                  {copyMessage}
                </p>
              )}
            </div>

            <div className="border-t border-white/10 bg-black/20 p-6 lg:border-l lg:border-t-0 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-edition-primary">
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
                  className="h-full rounded-full bg-edition-primary transition-all"
                  style={{ width: `${setupPercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-400">
                {completedSetupItems.length} of {setupItems.length} setup steps
                complete.
              </p>

              <div className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-edition-primary">
                  Subscription
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  {isLoading ? "..." : formatLabel(subscriptionStatus)}
                </p>

                <Link
                  href="/dashboard/account"
                  className="mt-3 inline-block text-sm font-black text-edition-primary transition hover:text-edition-primary"
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
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
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
                ? "border-brand-orange/30 bg-brand-orange/10 hover:bg-brand-orange/15"
                : "border-white/10 bg-white/[0.04] hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-gray-400">
                Pending Requests
              </p>

              {stats.pendingRequests > 0 && (
                <span className="rounded-full bg-brand-orange px-3 py-1 text-xs font-black text-black">
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
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
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
                ? "border-edition-primary/30 bg-edition-primary/10 hover:bg-edition-primary/15"
                : "border-brand-orange/30 bg-brand-orange/10 hover:bg-brand-orange/15"
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
            className="rounded-[2rem] border border-white/10 bg-black/20 p-5 transition hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
          >
            <p className="text-sm font-black text-edition-primary">
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
                ? "border-brand-orange/30 bg-brand-orange/10 hover:bg-brand-orange/15"
                : "border-white/10 bg-black/20 hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
            }`}
          >
            <p className="text-sm font-black text-edition-primary">
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
            className="rounded-[2rem] border border-white/10 bg-black/20 p-5 transition hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
          >
            <p className="text-sm font-black text-edition-primary">
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
            className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-5 transition hover:bg-edition-primary/15"
          >
            <p className="text-sm font-black text-edition-primary">
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
                <p className="text-sm font-black text-edition-primary">
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
                <div className="rounded-2xl border border-edition-primary/20 bg-edition-primary/10 p-5">
                  <p className="text-sm font-black text-edition-primary">
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
                    className="rounded-2xl border border-brand-orange/20 bg-brand-orange/10 p-4"
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

                      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-brand-orange px-2 text-xs font-black text-black">
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
            <p className="text-sm font-black text-edition-primary">
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
                  className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-edition-primary/30 hover:bg-edition-primary/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                        item.isComplete
                          ? "border-edition-primary bg-edition-primary"
                          : "border-brand-orange"
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
                              ? "bg-edition-primary text-black"
                              : "bg-brand-orange text-black"
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

        <section className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
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
              className="w-fit rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover"
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
                  className="mt-4 inline-block rounded-2xl border border-edition-primary/20 bg-edition-primary/10 px-5 py-3 text-sm font-black text-edition-primary transition hover:bg-edition-primary/20"
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