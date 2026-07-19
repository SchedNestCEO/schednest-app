"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";

type CountQueryResult = {
  count: number | null;
  error: { message: string } | null;
};

type CountQuery = PromiseLike<CountQueryResult> & {
  eq: (column: string, value: string) => CountQuery;
  is: (column: string, value: null) => CountQuery;
};

type DashboardMetrics = {
  businessProfiles: number;
  services: number;
  businessHours: number;
  bookings: number;
  pendingRequests: number;
  customers: number;
  unreadNotifications: number;
};

const defaultMetrics: DashboardMetrics = {
  businessProfiles: 0,
  services: 0,
  businessHours: 0,
  bookings: 0,
  pendingRequests: 0,
  customers: 0,
  unreadNotifications: 0,
};

export default function DashboardActionCenter() {
  const supabase = useMemo(() => createClient(), []);
  const [metrics, setMetrics] = useState<DashboardMetrics>(defaultMetrics);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCount = useCallback(
    async (
      tableName: string,
      applyFilters?: (query: CountQuery) => CountQuery
    ): Promise<number> => {
      let query = supabase
        .from(tableName)
        .select("*", { count: "exact", head: true }) as unknown as CountQuery;

      if (applyFilters) {
        query = applyFilters(query);
      }

      const { count, error } = await query;

      if (error) {
        throw error;
      }

      return count || 0;
    },
    [supabase]
  );

  const loadDashboardUx = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        businessProfiles,
        services,
        businessHours,
        bookings,
        pendingRequests,
        customers,
        unreadNotifications,
      ] = await Promise.all([
        loadCount("business_profiles"),
        loadCount("services"),
        loadCount("business_hours"),
        loadCount("bookings"),
        loadCount("bookings", (query) => query.eq("status", "pending")),
        loadCount("customers"),
        loadCount("booking_notifications", (query) =>
          query.is("read_at", null)
        ),
      ]);

      setMetrics({
        businessProfiles,
        services,
        businessHours,
        bookings,
        pendingRequests,
        customers,
        unreadNotifications,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard action center."
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadCount]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboardUx();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadDashboardUx]);

  const setupItems = [
    {
      label: "Create business profile",
      description: "Your business identity is connected to your Nest.",
      completed: metrics.businessProfiles > 0,
      href: "/dashboard/booking-page",
      action: "Review",
    },
    {
      label: "Add your first service",
      description: "Services let clients know what they can book.",
      completed: metrics.services > 0,
      href: "/dashboard/services",
      action: "Add service",
    },
    {
      label: "Set business hours",
      description: "Hours control when clients can request appointments.",
      completed: metrics.businessHours > 0,
      href: "/dashboard/booking-page",
      action: "Set hours",
    },
    {
      label: "Share your booking page",
      description: "Send your public booking link to your first client.",
      completed:
        metrics.businessProfiles > 0 &&
        metrics.services > 0 &&
        metrics.businessHours > 0,
      href: "/dashboard/booking-page",
      action: "Copy link",
    },
    {
      label: "Receive your first booking",
      description: "New requests will appear in notifications and requests.",
      completed: metrics.bookings > 0,
      href: "/dashboard/requests",
      action: "View requests",
    },
  ];

  const completedSetupCount = setupItems.filter((item) => item.completed).length;
  const setupProgress = Math.round(
    (completedSetupCount / setupItems.length) * 100
  );

  const needsAttention = [
    {
      title: "Pending booking requests",
      description:
        metrics.pendingRequests > 0
          ? `${metrics.pendingRequests} request${
              metrics.pendingRequests === 1 ? "" : "s"
            } waiting for approval.`
          : "No pending booking requests right now.",
      count: metrics.pendingRequests,
      href: "/dashboard/requests",
      action: "Review requests",
      urgent: metrics.pendingRequests > 0,
    },
    {
      title: "Unread notifications",
      description:
        metrics.unreadNotifications > 0
          ? `${metrics.unreadNotifications} unread notification${
              metrics.unreadNotifications === 1 ? "" : "s"
            }.`
          : "You are caught up on notifications.",
      count: metrics.unreadNotifications,
      href: "/dashboard",
      action: "Open notifications",
      urgent: metrics.unreadNotifications > 0,
    },
    {
      title: "Services",
      description:
        metrics.services === 0
          ? "Add at least one service so clients can book you."
          : `${metrics.services} service${
              metrics.services === 1 ? "" : "s"
            } ready.`,
      count: metrics.services === 0 ? 1 : 0,
      href: "/dashboard/services",
      action: "Manage services",
      urgent: metrics.services === 0,
    },
    {
      title: "Business hours",
      description:
        metrics.businessHours === 0
          ? "Set your business hours before sharing your booking page."
          : "Business hours are set.",
      count: metrics.businessHours === 0 ? 1 : 0,
      href: "/dashboard/booking-page",
      action: "Manage hours",
      urgent: metrics.businessHours === 0,
    },
  ];

  const activeNeedsAttention = needsAttention.filter((item) => item.urgent);

  return (
    <section className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
              Setup Checklist
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Finish setting up your Nest
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Complete these steps so your booking flow is ready for real
              clients.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-left sm:text-right">
            <p className="text-xs font-bold text-emerald-300">Progress</p>
            <p className="mt-1 text-2xl font-black text-white">
              {setupProgress}%
            </p>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all"
            style={{ width: `${setupProgress}%` }}
          />
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-400">
              Loading setup checklist...
            </div>
          ) : (
            setupItems.map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <div
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      item.completed
                        ? "bg-emerald-400 text-black"
                        : "border border-white/20 text-gray-500"
                    }`}
                  >
                    {item.completed ? "✓" : ""}
                  </div>

                  <div>
                    <p className="text-sm font-black text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </div>

                <Link
                  href={item.href}
                  className={`w-full rounded-2xl px-4 py-3 text-center text-xs font-black transition sm:w-auto ${
                    item.completed
                      ? "border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                      : "bg-emerald-400 text-black hover:bg-emerald-300"
                  }`}
                >
                  {item.action}
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
            Needs Attention
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            What needs action?
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Quick shortcuts for the items that matter most right now.
          </p>
        </div>

        <div className="mt-5 grid gap-3">
          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-400">
              Checking your Nest...
            </div>
          ) : activeNeedsAttention.length === 0 ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
              <p className="text-sm font-black text-emerald-300">
                Your Nest is calm.
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                No urgent booking requests, setup issues, or unread alerts need
                attention right now.
              </p>
            </div>
          ) : (
            activeNeedsAttention.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-white">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-300">
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
                  {item.action}
                </Link>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-gray-500">Bookings</p>
            <p className="mt-1 text-2xl font-black text-white">
              {metrics.bookings}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-gray-500">Customers</p>
            <p className="mt-1 text-2xl font-black text-white">
              {metrics.customers}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-gray-500">Services</p>
            <p className="mt-1 text-2xl font-black text-white">
              {metrics.services}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}