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

type BirdySuggestionPriority = "high" | "normal" | "low";

type BirdySuggestion = {
  id: string;
  business_id: string;
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

type NewBirdySuggestion = {
  business_id: string;
  suggestion_type: string;
  title: string;
  description: string;
  action_label: string | null;
  action_href: string | null;
  priority: BirdySuggestionPriority;
  status: "active";
  source: "rule_based";
  metadata: Record<string, string | number | boolean | null>;
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

function getPriorityClass(priority: BirdySuggestionPriority) {
  if (priority === "high") {
    return "border-red-400/20 bg-red-400/10 text-red-200";
  }

  if (priority === "normal") {
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
  }

  return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
}

function formatStatus(status: BirdyCard["status"]) {
  if (status === "needs_attention") return "Needs attention";
  if (status === "ready") return "Ready";
  if (status === "watching") return "Watching";
  return "Coming soon";
}

function formatPriority(priority: BirdySuggestionPriority) {
  if (priority === "high") return "High priority";
  if (priority === "normal") return "Normal";
  return "Low priority";
}

export default function BirdyPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [business, setBusiness] = useState<BusinessProfile | null>(null);

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [todayBookingsCount, setTodayBookingsCount] = useState(0);
  const [upcomingBookingsCount, setUpcomingBookingsCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [activeServicesCount, setActiveServicesCount] = useState(0);
  const [noShowCount, setNoShowCount] = useState(0);
  const [suggestions, setSuggestions] = useState<BirdySuggestion[]>([]);

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
      actionLabel:
        pendingRequestsCount > 0 ? "Review requests" : "Open requests",
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
          ? `${activeServicesCount} of ${servicesCount} service${
              servicesCount === 1 ? "" : "s"
            } are active and can be requested from your booking page.`
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

  async function loadSavedSuggestions(businessId: string) {
    const { data, error } = await supabase
      .from("birdy_suggestions")
      .select(
        "id, business_id, suggestion_type, title, description, action_label, action_href, priority, status, source, created_at"
      )
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSuggestions((data || []) as BirdySuggestion[]);
  }

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

    await loadSavedSuggestions(safeProfile.id);

    setIsLoading(false);
  }

  function buildRuleBasedSuggestions() {
    if (!business) return [];

    const generatedSuggestions: NewBirdySuggestion[] = [];

    if (pendingRequestsCount > 0) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "pending_requests",
        title: "Review pending booking requests",
        description: `You have ${pendingRequestsCount} pending booking request${
          pendingRequestsCount === 1 ? "" : "s"
        }. Approving or declining quickly helps customers know what to expect.`,
        action_label: "Review requests",
        action_href: "/dashboard/requests",
        priority: "high",
        status: "active",
        source: "rule_based",
        metadata: {
          pending_requests_count: pendingRequestsCount,
        },
      });
    }

    if (activeServicesCount === 0) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "no_active_services",
        title: "Add an active service",
        description:
          "Your booking page needs at least one active service before customers can request appointments.",
        action_label: "Add service",
        action_href: "/dashboard/services",
        priority: "high",
        status: "active",
        source: "rule_based",
        metadata: {
          services_count: servicesCount,
          active_services_count: activeServicesCount,
        },
      });
    }

    if (todayBookingsCount > 0) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "today_schedule",
        title: "Check today’s schedule",
        description: `You have ${todayBookingsCount} booking${
          todayBookingsCount === 1 ? "" : "s"
        } today. Review your day before customers arrive.`,
        action_label: "View bookings",
        action_href: "/dashboard/bookings",
        priority: "normal",
        status: "active",
        source: "rule_based",
        metadata: {
          today_bookings_count: todayBookingsCount,
        },
      });
    }

    if (upcomingBookingsCount > 0) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "upcoming_week",
        title: "Prepare for upcoming appointments",
        description: `You have ${upcomingBookingsCount} booking${
          upcomingBookingsCount === 1 ? "" : "s"
        } in the next 7 days. This is a good time to confirm details and prepare.`,
        action_label: "View bookings",
        action_href: "/dashboard/bookings",
        priority: "normal",
        status: "active",
        source: "rule_based",
        metadata: {
          upcoming_bookings_count: upcomingBookingsCount,
        },
      });
    }

    if (noShowCount > 0) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "no_show_recovery",
        title: "Follow up with no-shows",
        description: `Birdy found ${noShowCount} no-show record${
          noShowCount === 1 ? "" : "s"
        }. Later, Birdy can help write recovery messages for these customers.`,
        action_label: "View bookings",
        action_href: "/dashboard/bookings",
        priority: "high",
        status: "active",
        source: "rule_based",
        metadata: {
          no_show_count: noShowCount,
        },
      });
    }

    if (
      pendingRequestsCount === 0 &&
      todayBookingsCount === 0 &&
      upcomingBookingsCount === 0 &&
      activeServicesCount > 0
    ) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "booking_page_ready",
        title: "Your booking setup is ready",
        description:
          "You have active services and no urgent booking issues right now. Keep sharing your booking page to bring in more customers.",
        action_label: "Manage booking page",
        action_href: "/dashboard/booking-page",
        priority: "low",
        status: "active",
        source: "rule_based",
        metadata: {
          active_services_count: activeServicesCount,
        },
      });
    }

    if (customersCount === 0 && activeServicesCount > 0) {
      generatedSuggestions.push({
        business_id: business.id,
        suggestion_type: "first_customer",
        title: "Get your first customer into SchedNest",
        description:
          "You have services set up, but no customers yet. Share your booking page or create a manual booking to start building your customer list.",
        action_label: "Open booking page settings",
        action_href: "/dashboard/booking-page",
        priority: "normal",
        status: "active",
        source: "rule_based",
        metadata: {
          customers_count: customersCount,
        },
      });
    }

    return generatedSuggestions;
  }

  async function generateSuggestions() {
    if (!business) {
      setMessage("Create your business profile before generating suggestions.");
      return;
    }

    setIsGenerating(true);
    setMessage("");

    const generatedSuggestions = buildRuleBasedSuggestions();

    if (generatedSuggestions.length === 0) {
      setMessage("Birdy did not find any suggestions to create right now.");
      setIsGenerating(false);
      return;
    }

    const existingTypes = new Set(
      suggestions.map((suggestion) => suggestion.suggestion_type)
    );

    const newSuggestions = generatedSuggestions.filter(
      (suggestion) => !existingTypes.has(suggestion.suggestion_type)
    );

    if (newSuggestions.length === 0) {
      setMessage("Birdy already has active suggestions for the current signals.");
      setIsGenerating(false);
      return;
    }

    const { error } = await supabase
      .from("birdy_suggestions")
      .insert(newSuggestions);

    if (error) {
      setMessage(error.message);
      setIsGenerating(false);
      return;
    }

    await loadSavedSuggestions(business.id);

    setMessage(
      `Birdy created ${newSuggestions.length} suggestion${
        newSuggestions.length === 1 ? "" : "s"
      }.`
    );

    setIsGenerating(false);
  }

  async function updateSuggestionStatus(
    suggestionId: string,
    nextStatus: "dismissed" | "completed"
  ) {
    setMessage("");

    const now = new Date().toISOString();

    const updatePayload =
      nextStatus === "completed"
        ? {
            status: "completed",
            completed_at: now,
            updated_at: now,
          }
        : {
            status: "dismissed",
            dismissed_at: now,
            updated_at: now,
          };

    if (!business) {
      setMessage("Create your business profile before updating suggestions.");
      return;
    }

    const { error } = await supabase
      .from("birdy_suggestions")
      .update(updatePayload)
      .eq("id", suggestionId)
      .eq("business_id", business.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSuggestions((currentSuggestions) =>
      currentSuggestions.filter((suggestion) => suggestion.id !== suggestionId)
    );
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBirdy();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Birdy
              </p>

              <h1 className="mt-3 text-4xl font-black text-white">
                Your business assistant is standing by.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                Birdy watches business activity and turns it into suggested
                actions. This is the first real Birdy foundation: saved
                suggestions, priorities, actions, and completion tracking.
              </p>

              {business && (
                <p className="mt-3 text-xs text-gray-500">
                  Watching activity for{" "}
                  {business.business_name || "your business"}.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={generateSuggestions}
              disabled={isLoading || isGenerating || !business}
              className="w-fit rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate suggestions"}
            </button>
          </div>

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

        <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                Birdy Suggestions
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                Saved recommendations
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300">
                These are saved Birdy suggestions generated from your current
                business activity. Later, this same system can store true
                AI-generated recommendations and customer messages.
              </p>
            </div>

            <span className="w-fit rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-300">
              {suggestions.length} active
            </span>
          </div>

          <div className="mt-6 grid gap-4">
            {isLoading && (
              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-gray-400">
                  Loading Birdy suggestions...
                </p>
              </div>
            )}

            {!isLoading && suggestions.length === 0 && (
              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                <p className="text-sm font-black text-white">
                  No active suggestions yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Click Generate suggestions so Birdy can create saved
                  recommendations from your current business signals.
                </p>
              </div>
            )}

            {!isLoading &&
              suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-[2rem] border border-white/10 bg-black/20 p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-black text-white">
                          {suggestion.title}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${getPriorityClass(
                            suggestion.priority
                          )}`}
                        >
                          {formatPriority(suggestion.priority)}
                        </span>

                        <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-gray-300">
                          {suggestion.source === "rule_based"
                            ? "Rule based"
                            : "AI"}
                        </span>
                      </div>

                      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
                        {suggestion.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {suggestion.action_href && suggestion.action_label && (
                        <Link
                          href={suggestion.action_href}
                          className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                        >
                          {suggestion.action_label}
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          updateSuggestionStatus(suggestion.id, "completed")
                        }
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-black text-emerald-300 transition hover:bg-emerald-400/20"
                      >
                        Mark done
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateSuggestionStatus(suggestion.id, "dismissed")
                        }
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-400 transition hover:bg-white/10 hover:text-white"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
              These live signals feed Birdy suggestions. They are rule-based
              right now, then become AI-assisted later.
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
                Birdy now has a suggestion system.
              </h2>

              <p className="mt-3 text-sm leading-6 text-gray-300">
                This version saves recommendations to the database. The next
                phase is adding an API route that can generate smarter
                suggestions and eventually AI-written customer messages.
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                    Done
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    Rule-based business signals
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                    Done
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    Saved suggestions and actions
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Next
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    API-generated recommendations
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                    Later
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    AI-generated customer messages
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