"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
};

type BirdyCard = {
  title: string;
  description: string;
  status: "ready" | "watching" | "coming_soon" | "needs_attention";
  actionLabel?: string;
  href?: string;
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

function getNextSevenDaysRange() {
  const start = new Date();

  const end = new Date();
  end.setDate(end.getDate() + 7);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function getStatusClass(status: BirdyCard["status"]) {
  if (status === "needs_attention") {
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
  }

  if (status === "ready") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (status === "watching") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  }

  return "border-white/10 bg-white/10 text-gray-300";
}

function formatStatus(status: BirdyCard["status"]) {
  if (status === "needs_attention") return "Needs attention";
  if (status === "ready") return "Ready";
  if (status === "watching") return "Watching";
  return "Coming soon";
}

export default function BirdyPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [activeServicesCount, setActiveServicesCount] = useState(0);
  const [noShowCount, setNoShowCount] = useState(0);

  const birdyCards: BirdyCard[] = [
    {
      title: "Booking request review",
      description:
        pendingRequestsCount > 0
          ? `You have ${pendingRequestsCount} pending booking request${
              pendingRequestsCount === 1 ? "" : "s"
            } waiting for a decision.`
          : "No pending booking requests right now.",
      status: pendingRequestsCount > 0 ? "needs_attention" : "ready",
      actionLabel: pendingRequestsCount > 0 ? "Review requests" : "Open requests",
      href: "/dashboard/requests",
    },
    {
      title: "Today’s schedule",
      description:
        todayBookingsCount > 0
          ? `You have ${todayBookingsCount} booking${
              todayBookingsCount === 1 ? "" : "s"
            } scheduled for today.`
          : "No bookings scheduled for today.",
      status: todayBookingsCount > 0 ? "watching" : "ready",
      actionLabel: "View bookings",
      href: "/dashboard/bookings",
    },
    {
      title: "Upcoming appointments",
      description:
        upcomingBookingsCount > 0
          ? `There are ${upcomingBookingsCount} booking${
              upcomingBookingsCount === 1 ? "" : "s"
            } coming up in the next 7 days.`
          : "No upcoming bookings in the next 7 days.",
      status: upcomingBookingsCount > 0 ? "watching" : "ready",
      actionLabel: "View calendar",
      href: "/dashboard/bookings",
    },
    {
      title: "Service menu readiness",
      description:
        activeServicesCount > 0
          ? `${activeServicesCount} active service${
              activeServicesCount === 1 ? "" : "s"
            } can be requested from your booking page.`
          : "You need at least one active service so customers can request appointments.",
      status: activeServicesCount > 0 ? "ready" : "needs_attention",
      actionLabel: activeServicesCount > 0 ? "Manage services" : "Add service",
      href: "/dashboard/services",
    },
    {
      title: "Customer activity",
      description:
        customersCount > 0
          ? `SchedNest is tracking ${customersCount} customer${
              customersCount === 1 ? "" : "s"
            } for this business.`
          : "Customers will appear here after bookings are created.",
      status: customersCount > 0 ? "watching" : "coming_soon",
      actionLabel: "View customers",
      href: "/dashboard/customers",
    },
    {
      title: "No-show recovery",
      description:
        noShowCount > 0
          ? `Birdy found ${noShowCount} no-show record${
              noShowCount === 1 ? "" : "s"
            } that could be followed up with later.`
          : "Later, Birdy can help recover no-shows with suggested follow-up messages.",
      status: noShowCount > 0 ? "needs_attention" : "coming_soon",
      actionLabel: "View bookings",
      href: "/dashboard/bookings",
    },
  ];

  async function loadBirdy() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to view Birdy.");
      setIsLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("business_profiles")
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message);
      setIsLoading(false);
      return;
    }

    if (!profile) {
      setMessage("Create your business profile before using Birdy.");
      setIsLoading(false);
      return;
    }

    const safeProfile = profile as BusinessProfile;
    setBusiness(safeProfile);

    const todayRange = getTodayRange();
    const sevenDayRange = getNextSevenDaysRange();

    const [
      pendingRequestsResult,
      todayBookingsResult,
      upcomingBookingsResult,
      customersResult,
      servicesResult,
      activeServicesResult,
      noShowResult,
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id)
        .eq("status", "pending"),

      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id)
        .gte("start_time", todayRange.start)
        .lt("start_time", todayRange.end),

      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id)
        .gte("start_time", sevenDayRange.start)
        .lt("start_time", sevenDayRange.end),

      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id),

      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id),

      supabase
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id)
        .eq("is_active", true),

      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", safeProfile.id)
        .eq("status", "no_show"),
    ]);

    setPendingRequestsCount(pendingRequestsResult.count || 0);
    setTodayBookingsCount(todayBookingsResult.count || 0);
    setUpcomingBookingsCount(upcomingBookingsResult.count || 0);
    setCustomersCount(customersResult.count || 0);
    setServicesCount(servicesResult.count || 0);
    setActiveServicesCount(activeServicesResult.count || 0);
    setNoShowCount(noShowResult.count || 0);

    setIsLoading(false);
  }

  useEffect(() => {
    loadBirdy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Birdy
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Your business assistant is standing by.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Birdy will help business owners notice missed follow-ups, pending
            requests, no-shows, open time slots, and revenue opportunities. For
            now, Birdy is starting with simple business signals. Later, this
            becomes the AI operations assistant.
          </p>

          {business && (
            <p className="mt-3 text-xs text-gray-500">
              Watching activity for{" "}
              {business.business_name || "your business"}.
            </p>
          )}

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
              {message}
            </p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-5">
            <p className="text-sm font-bold text-yellow-200">
              Pending Requests
            </p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : pendingRequestsCount}
            </p>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5">
            <p className="text-sm font-bold text-emerald-300">Today</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : todayBookingsCount}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Customers</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : customersCount}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm font-bold text-gray-400">Active Services</p>
            <p className="mt-4 text-4xl font-black text-white">
              {isLoading ? "..." : activeServicesCount}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Birdy Signals
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              What Birdy is watching
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              These cards are the early foundation. Soon, Birdy can turn these
              signals into suggested actions and customer-ready messages.
            </p>

            <div className="mt-6 grid gap-4">
              {birdyCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[2rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-black text-white">
                          {card.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${getStatusClass(
                            card.status
                          )}`}
                        >
                          {formatStatus(card.status)}
                        </span>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-gray-400">
                        {card.description}
                      </p>
                    </div>

                    {card.href && card.actionLabel && (
                      <Link
                        href={card.href}
                        className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                      >
                        {card.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                AI Foundation
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                Birdy is being prepared for real AI.
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-300">
                This page creates the home for Birdy’s future AI suggestions.
                The next phase is generating smart recommendations based on
                bookings, customers, no-shows, and open opportunities.
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Phase 1
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    Rule-based business signals
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Phase 2
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    Suggested actions and reminders
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Phase 3
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    AI-generated messages and priorities
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <p className="text-sm font-black text-emerald-300">
                Future Birdy Actions
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">
                    Follow-up reminders
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Suggest customers to follow up with after completed service.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">
                    No-show recovery
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Help recover missed appointments with suggested wording.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">
                    Daily priorities
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Show the owner what needs attention today.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-black text-white">
                    Revenue opportunities
                  </p>
                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Point out inactive customers or underused services.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}