"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  business_name: string | null;
  slug: string | null;
  timezone: string | null;
  business_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  booking_time_mode: string | null;
  business_hours_enabled: boolean | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  booking_page_theme: string | null;
};

type Subscription = {
  plan_id: string | null;
  status: string | null;
  billing_interval: string | null;
  pricing_tier: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

const settingSections = [
  {
    title: "Business Profile",
    description:
      "Manage your business name, public slug, description, contact email, phone, and timezone.",
    href: "/dashboard/profile",
    label: "Open profile settings",
  },
  {
    title: "Booking Page",
    description:
      "Manage your public booking link, booking mode, request flow, and business hours display.",
    href: "/dashboard/booking-page",
    label: "Open booking page settings",
  },
  {
    title: "Services",
    description:
      "Manage service names, prices, durations, active services, and service sample previews.",
    href: "/dashboard/services",
    label: "Open service settings",
  },
  {
    title: "Billing",
    description:
      "View your current plan, Stripe subscription status, next due date, and billing portal.",
    href: "/dashboard/account",
    label: "Open billing settings",
  },
  {
    title: "Notifications",
    description:
      "Review booking request notifications, owner alerts, customer emails, and future reminder settings.",
    href: "/dashboard/requests",
    label: "Open requests",
  },
  {
    title: "Customers",
    description:
      "Manage customers, customer status, notes, history, and future loyalty/rewards tools.",
    href: "/dashboard/customers",
    label: "Open customer settings",
  },
];

function formatLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusClass(isGood: boolean) {
  return isGood
    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
    : "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
}

function getCompletionLabel(completed: number, total: number) {
  if (total === 0) return "0%";

  return `${Math.round((completed / total) * 100)}%`;
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [servicesCount, setServicesCount] = useState(0);
  const [openHoursCount, setOpenHoursCount] = useState(0);

  async function loadSettings() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to view settings.");
      setIsLoading(false);
      return;
    }

    const { data: businessData, error: businessError } = await supabase
      .from("business_profiles")
      .select(
        "id, business_name, slug, timezone, business_description, contact_email, contact_phone, booking_time_mode, business_hours_enabled, brand_primary_color, brand_accent_color, booking_page_theme"
      )
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      setMessage(businessError.message);
      setIsLoading(false);
      return;
    }

    if (!businessData) {
      setBusiness(null);
      setSubscription(null);
      setServicesCount(0);
      setOpenHoursCount(0);
      setMessage("Create your business profile to unlock all settings.");
      setIsLoading(false);
      return;
    }

    const safeBusiness = businessData as BusinessProfile;
    setBusiness(safeBusiness);

    const { count: servicesTotal } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("business_id", safeBusiness.id);

    setServicesCount(servicesTotal || 0);

    const { count: openHoursTotal } = await supabase
      .from("business_hours")
      .select("id", { count: "exact", head: true })
      .eq("business_id", safeBusiness.id)
      .eq("is_open", true);

    setOpenHoursCount(openHoursTotal || 0);

    const { data: subscriptionData } = await supabase
      .from("business_subscriptions")
      .select(
        "plan_id, status, billing_interval, pricing_tier, current_period_end, stripe_customer_id"
      )
      .eq("business_id", safeBusiness.id)
      .maybeSingle();

    setSubscription((subscriptionData || null) as Subscription | null);
    setIsLoading(false);
  }

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasBusinessProfile = Boolean(business);
  const hasBookingSlug = Boolean(business?.slug);
  const hasServices = servicesCount > 0;
  const hasOpenHours = openHoursCount > 0;
  const hasBilling = Boolean(
    subscription?.status === "active" && subscription?.stripe_customer_id
  );
  const hasBranding = Boolean(
    business?.brand_primary_color || business?.brand_accent_color
  );

  const profileItems = [
    Boolean(business?.business_name),
    Boolean(business?.slug),
    Boolean(business?.timezone),
    Boolean(business?.business_description),
    Boolean(business?.contact_email || business?.contact_phone),
  ];

  const profileCompleted = profileItems.filter(Boolean).length;
  const profileTotal = profileItems.length;

  const bookingMode = formatLabel(business?.booking_time_mode, "Fixed Hours");
  const bookingPageUrl = business?.slug ? `/book/${business.slug}` : null;

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Settings
              </p>

              <h1 className="mt-3 text-4xl font-black text-white">
                Manage your SchedNest settings.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                Use this control center to check your setup status and quickly
                jump to the pages that manage your business profile, booking
                page, services, billing, customers, and notifications.
              </p>
            </div>

            <button
              type="button"
              onClick={loadSettings}
              disabled={isLoading}
              className="w-fit rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Refreshing..." : "Refresh settings"}
            </button>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
              {message}
            </p>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            className={`rounded-[2rem] border p-5 ${getStatusClass(
              hasBusinessProfile
            )}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em]">
              Business
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              {hasBusinessProfile ? "Ready" : "Missing"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              {business?.business_name || "No business profile found yet."}
            </p>
          </div>

          <div
            className={`rounded-[2rem] border p-5 ${getStatusClass(
              hasBookingSlug
            )}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em]">
              Booking Page
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              {hasBookingSlug ? "Live" : "Not ready"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              {hasBookingSlug ? `/book/${business?.slug}` : "Add a public slug."}
            </p>
          </div>

          <div
            className={`rounded-[2rem] border p-5 ${getStatusClass(
              hasServices
            )}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em]">
              Services
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              {servicesCount}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Active service setup foundation.
            </p>
          </div>

          <div
            className={`rounded-[2rem] border p-5 ${getStatusClass(
              hasBilling
            )}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.22em]">
              Billing
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              {hasBilling ? "Active" : "Needs setup"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              {formatLabel(subscription?.plan_id, "No plan")}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
              Setup Health
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Profile completion: {getCompletionLabel(profileCompleted, profileTotal)}
            </h2>

            <div className="mt-6 grid gap-3">
              {[
                ["Business name", Boolean(business?.business_name)],
                ["Public slug", Boolean(business?.slug)],
                ["Timezone", Boolean(business?.timezone)],
                ["Business description", Boolean(business?.business_description)],
                [
                  "Contact info",
                  Boolean(business?.contact_email || business?.contact_phone),
                ],
              ].map(([label, complete]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="text-sm font-black text-white">{label}</p>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      complete
                        ? "bg-emerald-400 text-black"
                        : "bg-yellow-400/10 text-yellow-200"
                    }`}
                  >
                    {complete ? "Done" : "Missing"}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/profile"
              className="mt-5 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
            >
              Improve profile
            </Link>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
              Booking Setup
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Current booking mode: {bookingMode}
            </h2>

            <div className="mt-6 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Public link
                </p>
                <p className="mt-2 break-all text-sm font-black text-white">
                  {bookingPageUrl || "Not ready"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Business hours
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {hasOpenHours
                    ? `${openHoursCount} open day(s) configured`
                    : "No open hours configured"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Branding
                </p>
                <p className="mt-2 text-sm font-black text-white">
                  {hasBranding ? "Custom branding started" : "Default branding"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/booking-page"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Edit booking page
              </Link>

              {bookingPageUrl && (
                <Link
                  href={bookingPageUrl}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                >
                  View public page
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settingSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
            >
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <p className="text-xl font-black text-white">
                    {section.title}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-gray-400">
                    {section.description}
                  </p>
                </div>

                <span className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition group-hover:border-emerald-400/30 group-hover:bg-emerald-400 group-hover:text-black">
                  {section.label}
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
            Coming Next
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            Centralized editing.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
            This settings dashboard now shows setup status. Next, we can make
            these sections editable directly from this page.
          </p>
        </section>
      </div>
    </DashboardShell>
  );
}