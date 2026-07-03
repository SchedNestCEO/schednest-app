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
};

type DashboardStats = {
  todaysBookings: number;
  pendingRequests: number;
  customers: number;
  followUps: number;
  services: number;
  businessHours: number;
  unreadNotifications: number;
};

function getTodayDateValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatLabel(value?: string | null) {
  if (!value) return "Pending";

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(
    null
  );
  const [stats, setStats] = useState<DashboardStats>({
    todaysBookings: 0,
    pendingRequests: 0,
    customers: 0,
    followUps: 0,
    services: 0,
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
      .select("id, owner_id, business_name, slug")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !businessData) {
      setBusiness(null);
      setIsLoading(false);
      return;
    }

    const safeBusiness = businessData as BusinessProfile;
    setBusiness(safeBusiness);

    const today = getTodayDateValue();

    const [
      todaysBookingsResult,
      pendingRequestsResult,
      customersResult,
      servicesResult,
      businessHoursResult,
      followUpsResult,
      unreadNotificationsResult,
      subscriptionResult,
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .eq("booking_date", today)
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
        .from("business_hours")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id),

      supabase
        .from("birdy_suggestions")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id),

      supabase
        .from("booking_notifications")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeBusiness.id)
        .is("read_at", null),

      supabase
        .from("business_subscriptions")
        .select("status")
        .eq("business_id", safeBusiness.id)
        .maybeSingle(),
    ]);

    setStats({
      todaysBookings: todaysBookingsResult.count || 0,
      pendingRequests: pendingRequestsResult.count || 0,
      customers: customersResult.count || 0,
      services: servicesResult.count || 0,
      businessHours: businessHoursResult.count || 0,
      followUps: followUpsResult.count || 0,
      unreadNotifications: unreadNotificationsResult.count || 0,
    });

    setSubscriptionStatus(subscriptionResult.data?.status || null);
    setIsLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupItems = [
    {
      title: "Create your business profile",
      isComplete: Boolean(business),
    },
    {
      title: "Add your services",
      isComplete: stats.services > 0,
    },
    {
      title: "Set your working hours",
      isComplete: stats.businessHours > 0,
    },
    {
      title: "Turn on customer booking requests",
      isComplete: Boolean(business?.slug),
    },
    {
      title: "Review follow-ups with Birdy",
      isComplete: stats.followUps > 0,
    },
  ];

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
      title: "Unread notifications",
      description:
        stats.unreadNotifications > 0
          ? `${stats.unreadNotifications} unread notification${
              stats.unreadNotifications === 1 ? "" : "s"
            } waiting.`
          : "You are caught up on notifications.",
      count: stats.unreadNotifications,
      href: "/dashboard",
      actionLabel: "Check notifications",
      isUrgent: stats.unreadNotifications > 0,
    },
    {
      title: "Services not ready",
      description: "Add at least one service before sharing your booking page.",
      count: stats.services === 0 ? 1 : 0,
      href: "/dashboard/services",
      actionLabel: "Add service",
      isUrgent: stats.services === 0,
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

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Owner Dashboard
              </p>

              <h1 className="mt-3 text-4xl font-black text-white">
                Manage your Nest.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                Manage bookings, customers, follow-ups, and open time from one
                place.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/bookings"
                  className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
                >
                  View bookings
                </Link>

                <Link
                  href="/dashboard/requests"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Review requests
                </Link>

                <Link
                  href="/dashboard/booking-page"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  Share booking link
                </Link>
              </div>
            </div>

            <Link
              href="/dashboard/account"
              className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-5 shadow-[0_0_35px_rgba(52,211,153,0.08)] transition hover:border-emerald-400/40 hover:bg-emerald-400/15"
            >
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                Subscription
              </p>

              <p className="mt-3 text-sm font-bold text-gray-400">Status</p>

              <h2 className="mt-1 text-2xl font-black text-white">
                {isLoading ? "..." : formatLabel(subscriptionStatus)}
              </h2>

              <p className="mt-3 text-xs font-bold text-emerald-300">
                Manage account →
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-emerald-300">
                Needs Attention
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                What needs action?
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                SchedNest surfaces urgent setup items, pending requests, and
                unread alerts here so you always know what to do next.
              </p>
            </div>

            <Link
              href="/dashboard/requests"
              className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
            >
              Open requests
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-400 md:col-span-2 xl:col-span-4">
                Checking your Nest...
              </div>
            ) : activeNeedsAttentionItems.length === 0 ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5 md:col-span-2 xl:col-span-4">
                <p className="text-sm font-black text-emerald-300">
                  Your Nest is calm.
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-300">
                  No urgent booking requests, setup issues, or unread alerts
                  need attention right now.
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
            href="/dashboard/birdy"
            className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
          >
            <p className="text-sm font-bold text-gray-400">Follow-ups</p>

            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : stats.followUps}
            </p>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {stats.followUps > 0
                ? "Birdy has follow-up suggestions ready."
                : "Birdy will help surface people who need attention."}
            </p>
          </Link>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Today&apos;s Focus
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Keep the business moving
            </h2>

            <div className="mt-6 grid gap-4">
              <Link
                href="/dashboard/bookings"
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-black">
                    1
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">
                      Review today&apos;s schedule
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      See what is booked, what is open, and what needs attention
                      before the day gets busy.
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/requests"
                className={`rounded-2xl border p-4 transition ${
                  stats.pendingRequests > 0
                    ? "border-yellow-400/30 bg-yellow-400/10 hover:bg-yellow-400/15"
                    : "border-white/10 bg-black/20 hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-black">
                    2
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">
                      Respond to pending requests
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Keep customers from waiting too long and reduce missed
                      revenue opportunities.
                    </p>
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/booking-page"
                className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-emerald-400/30 hover:bg-emerald-400/[0.06]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-black">
                    3
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-white">
                      Protect open time slots
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Spot gaps in the schedule that could be filled with new
                      appointments.
                    </p>
                  </div>
                </div>
              </Link>
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
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div
                    className={`h-3 w-3 shrink-0 rounded-full border ${
                      item.isComplete
                        ? "border-emerald-400 bg-emerald-400"
                        : "border-emerald-400"
                    }`}
                  />

                  <p className="text-sm font-bold text-white">{item.title}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}