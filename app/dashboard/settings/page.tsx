"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
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
  reminder_emails_enabled: boolean | null;
  reminder_hours_before: number | null;
  deposit_reminder_enabled: boolean | null;
  owner_reminder_enabled: boolean | null;
};

type Subscription = {
  plan_id: string | null;
  status: string | null;
  billing_interval: string | null;
  pricing_tier: string | null;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

type BookingTimeMode = "fixed_hours" | "flexible_requests";

type SectionKey =
  | "businessInfo"
  | "bookingSettings"
  | "notificationControls"
  | "brandingControls"
  | "setupHealth"
  | "quickLinks"
  | "nextSteps";

type CollapsiblePanelProps = {
  title: string;
  eyebrow: string;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  rightContent?: ReactNode;
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
      "Manage booking request alerts, customer emails, appointment reminders, and no-show protection.",
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

const colorPresets = [
  { label: "Emerald", value: "#34d399" },
  { label: "Blue", value: "#60a5fa" },
  { label: "Purple", value: "#a78bfa" },
  { label: "Pink", value: "#f472b6" },
  { label: "Gold", value: "#fbbf24" },
  { label: "Orange", value: "#fb923c" },
  { label: "Red", value: "#f87171" },
  { label: "Black", value: "#111827" },
  { label: "White", value: "#f8fafc" },
];

const bookingThemeOptions = [
  { label: "SchedNest Dark", value: "schednest_dark" },
  { label: "Clean Light", value: "clean_light" },
  { label: "Premium Dark", value: "premium_dark" },
];

function formatLabel(value: string | null | undefined, fallback = "Not set") {
  if (!value) return fallback;

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getStatusClass(isGood: boolean) {
  return isGood
    ? "border-edition-primary/20 bg-edition-primary/10 text-edition-primary"
    : "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
}

function getCompletionLabel(completed: number, total: number) {
  if (total === 0) return "0%";

  return `${Math.round((completed / total) * 100)}%`;
}

function getNullableFormValue(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function getSafeColorValue(value: string, fallback = "#34d399") {
  const trimmedValue = value.trim();

  return trimmedValue || fallback;
}

function getColorInputValue(value: string, fallback = "#34d399") {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;

  return fallback;
}

function getSafeBookingMode(value: string | null | undefined): BookingTimeMode {
  if (value === "flexible_requests") return "flexible_requests";

  return "fixed_hours";
}

function CollapsiblePanel({
  title,
  eyebrow,
  description,
  isOpen,
  onToggle,
  children,
  rightContent,
}: CollapsiblePanelProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full flex-col gap-4 p-6 text-left transition hover:bg-white/[0.03] lg:flex-row lg:items-start lg:justify-between"
      >
        <div>
          <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
            {eyebrow}
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">{title}</h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {rightContent}

          <span className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300">
            {isOpen ? "Collapse" : "Expand"}
          </span>
        </div>
      </button>

      {isOpen && <div className="border-t border-white/10 p-6">{children}</div>}
    </section>
  );
}

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingBusinessInfo, setIsSavingBusinessInfo] = useState(false);
  const [isSavingBookingSettings, setIsSavingBookingSettings] = useState(false);
  const [isSavingReminderSettings, setIsSavingReminderSettings] = useState(false);
  const [isSavingBrandingSettings, setIsSavingBrandingSettings] = useState(false);
  const [message, setMessage] = useState("");
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [servicesCount, setServicesCount] = useState(0);
  const [openHoursCount, setOpenHoursCount] = useState(0);

  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [timezone, setTimezone] = useState("");

  const [bookingTimeMode, setBookingTimeMode] =
    useState<BookingTimeMode>("fixed_hours");
  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(true);
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#34d399");
  const [brandAccentColor, setBrandAccentColor] = useState("#34d399");
  const [bookingPageTheme, setBookingPageTheme] = useState("schednest_dark");
  const [reminderEmailsEnabled, setReminderEmailsEnabled] = useState(true);
  const [reminderHoursBefore, setReminderHoursBefore] = useState(24);
  const [depositReminderEnabled, setDepositReminderEnabled] = useState(true);
  const [ownerReminderEnabled, setOwnerReminderEnabled] = useState(true);

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    businessInfo: true,
    bookingSettings: true,
    notificationControls: true,
    brandingControls: false,
    setupHealth: false,
    quickLinks: false,
    nextSteps: false,
  });

  function toggleSection(section: SectionKey) {
    setOpenSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }));
  }

  function expandAllSections() {
    setOpenSections({
      businessInfo: true,
      bookingSettings: true,
      notificationControls: true,
      brandingControls: true,
      setupHealth: true,
      quickLinks: true,
      nextSteps: true,
    });
  }

  function collapseAllSections() {
    setOpenSections({
      businessInfo: false,
      bookingSettings: false,
      notificationControls: false,
      brandingControls: false,
      setupHealth: false,
      quickLinks: false,
      nextSteps: false,
    });
  }

  function syncBusinessForm(profile: BusinessProfile | null) {
    setBusinessName(profile?.business_name || "");
    setBusinessDescription(profile?.business_description || "");
    setContactEmail(profile?.contact_email || "");
    setContactPhone(profile?.contact_phone || "");
    setTimezone(profile?.timezone || "");
    setBookingTimeMode(getSafeBookingMode(profile?.booking_time_mode));
    setBusinessHoursEnabled(profile?.business_hours_enabled ?? true);
    setBrandPrimaryColor(profile?.brand_primary_color || "#34d399");
    setBrandAccentColor(profile?.brand_accent_color || "#34d399");
    setBookingPageTheme(profile?.booking_page_theme || "schednest_dark");
    setReminderEmailsEnabled(profile?.reminder_emails_enabled ?? true);
    setReminderHoursBefore(profile?.reminder_hours_before || 24);
    setDepositReminderEnabled(profile?.deposit_reminder_enabled ?? true);
    setOwnerReminderEnabled(profile?.owner_reminder_enabled ?? true);
  }

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
        "id, business_name, slug, timezone, business_description, contact_email, contact_phone, booking_time_mode, business_hours_enabled, brand_primary_color, brand_accent_color, booking_page_theme, reminder_emails_enabled, reminder_hours_before, deposit_reminder_enabled, owner_reminder_enabled"
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
      syncBusinessForm(null);
      setMessage("Create your business profile to unlock all settings.");
      setIsLoading(false);
      return;
    }

    const safeBusiness = businessData as BusinessProfile;
    setBusiness(safeBusiness);
    syncBusinessForm(safeBusiness);

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

  async function saveBusinessInfo() {
    if (!business) {
      setMessage("Create your business profile before saving settings.");
      return;
    }

    setIsSavingBusinessInfo(true);
    setMessage("");

    const { data, error } = await supabase
      .from("business_profiles")
      .update({
        business_name: getNullableFormValue(businessName),
        business_description: getNullableFormValue(businessDescription),
        contact_email: getNullableFormValue(contactEmail),
        contact_phone: getNullableFormValue(contactPhone),
        timezone: getNullableFormValue(timezone),
      })
      .eq("id", business.id)
      .select(
        "id, business_name, slug, timezone, business_description, contact_email, contact_phone, booking_time_mode, business_hours_enabled, brand_primary_color, brand_accent_color, booking_page_theme, reminder_emails_enabled, reminder_hours_before, deposit_reminder_enabled, owner_reminder_enabled"
      )
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setIsSavingBusinessInfo(false);
      return;
    }

    const updatedBusiness = (data || null) as BusinessProfile | null;

    if (updatedBusiness) {
      setBusiness(updatedBusiness);
      syncBusinessForm(updatedBusiness);
    }

    setMessage("Business settings saved.");
    setIsSavingBusinessInfo(false);
  }

  async function saveBookingSettings() {
    if (!business) {
      setMessage("Create your business profile before saving booking settings.");
      return;
    }

    setIsSavingBookingSettings(true);
    setMessage("");

    const { data, error } = await supabase
      .from("business_profiles")
      .update({
        booking_time_mode: bookingTimeMode,
        business_hours_enabled: businessHoursEnabled,
      })
      .eq("id", business.id)
      .select(
        "id, business_name, slug, timezone, business_description, contact_email, contact_phone, booking_time_mode, business_hours_enabled, brand_primary_color, brand_accent_color, booking_page_theme, reminder_emails_enabled, reminder_hours_before, deposit_reminder_enabled, owner_reminder_enabled"
      )
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setIsSavingBookingSettings(false);
      return;
    }

    const updatedBusiness = (data || null) as BusinessProfile | null;

    if (updatedBusiness) {
      setBusiness(updatedBusiness);
      syncBusinessForm(updatedBusiness);
    }

    setMessage("Booking settings saved.");
    setIsSavingBookingSettings(false);
  }


  async function saveReminderSettings() {
    if (!business) {
      setMessage("Create your business profile before saving reminder settings.");
      return;
    }

    setIsSavingReminderSettings(true);
    setMessage("");

    const safeReminderHours = Math.max(1, Math.min(49, Number(reminderHoursBefore || 24)));

    const { data, error } = await supabase
      .from("business_profiles")
      .update({
        reminder_emails_enabled: reminderEmailsEnabled,
        reminder_hours_before: safeReminderHours,
        deposit_reminder_enabled: depositReminderEnabled,
        owner_reminder_enabled: ownerReminderEnabled,
      })
      .eq("id", business.id)
      .select(
        "id, business_name, slug, timezone, business_description, contact_email, contact_phone, booking_time_mode, business_hours_enabled, brand_primary_color, brand_accent_color, booking_page_theme, reminder_emails_enabled, reminder_hours_before, deposit_reminder_enabled, owner_reminder_enabled"
      )
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setIsSavingReminderSettings(false);
      return;
    }

    const updatedBusiness = (data || null) as BusinessProfile | null;

    if (updatedBusiness) {
      setBusiness(updatedBusiness);
      syncBusinessForm(updatedBusiness);
    }

    setMessage("No-show protection settings saved.");
    setIsSavingReminderSettings(false);
  }

  async function saveBrandingSettings() {
    if (!business) {
      setMessage("Create your business profile before saving branding settings.");
      return;
    }

    setIsSavingBrandingSettings(true);
    setMessage("");

    const { data, error } = await supabase
      .from("business_profiles")
      .update({
        brand_primary_color: getSafeColorValue(brandPrimaryColor),
        brand_accent_color: getSafeColorValue(brandAccentColor),
        booking_page_theme: bookingPageTheme || "schednest_dark",
      })
      .eq("id", business.id)
      .select(
        "id, business_name, slug, timezone, business_description, contact_email, contact_phone, booking_time_mode, business_hours_enabled, brand_primary_color, brand_accent_color, booking_page_theme, reminder_emails_enabled, reminder_hours_before, deposit_reminder_enabled, owner_reminder_enabled"
      )
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setIsSavingBrandingSettings(false);
      return;
    }

    const updatedBusiness = (data || null) as BusinessProfile | null;

    if (updatedBusiness) {
      setBusiness(updatedBusiness);
      syncBusinessForm(updatedBusiness);
    }

    setMessage("Branding settings saved.");
    setIsSavingBrandingSettings(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSettings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
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

  const setupHealthItems: Array<{ label: string; complete: boolean }> = [
    {
      label: "Business name",
      complete: Boolean(business?.business_name),
    },
    {
      label: "Public slug",
      complete: Boolean(business?.slug),
    },
    {
      label: "Timezone",
      complete: Boolean(business?.timezone),
    },
    {
      label: "Business description",
      complete: Boolean(business?.business_description),
    },
    {
      label: "Contact info",
      complete: Boolean(business?.contact_email || business?.contact_phone),
    },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="torogoz-dashboard-hero relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="torogoz-dashboard-hero-streaks" aria-hidden="true">
            <span />
            <span />
          </div>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
                Settings
              </p>

              <h1 className="mt-3 text-4xl font-black text-white">
                Manage your SchedNest settings.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                Use this control center to check your setup status, update
                business details, and adjust booking settings from one page.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={expandAllSections}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Expand all
              </button>

              <button
                type="button"
                onClick={collapseAllSections}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Collapse all
              </button>

              <button
                type="button"
                onClick={loadSettings}
                disabled={isLoading}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Refreshing..." : "Refresh settings"}
              </button>
            </div>
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

        <CollapsiblePanel
          eyebrow="Business Info"
          title="Edit your main business details."
          description="These details help customers understand who they are booking with and how to contact the business."
          isOpen={openSections.businessInfo}
          onToggle={() => toggleSection("businessInfo")}
          rightContent={
            <Link
              href="/dashboard/profile"
              onClick={(event) => event.stopPropagation()}
              className="hidden rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 sm:inline-flex"
            >
              Full profile
            </Link>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Business name
              </span>
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                disabled={!business || isSavingBusinessInfo}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none transition placeholder:text-gray-600 focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="SchedNest LLC"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Timezone
              </span>
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                disabled={!business || isSavingBusinessInfo}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none transition placeholder:text-gray-600 focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="America/Los_Angeles"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Contact email
              </span>
              <input
                value={contactEmail}
                onChange={(event) => setContactEmail(event.target.value)}
                disabled={!business || isSavingBusinessInfo}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none transition placeholder:text-gray-600 focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="hello@schednest.com"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Contact phone
              </span>
              <input
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                disabled={!business || isSavingBusinessInfo}
                className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none transition placeholder:text-gray-600 focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="(555) 555-5555"
              />
            </label>

            <label className="grid gap-2 lg:col-span-2">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Business description
              </span>
              <textarea
                value={businessDescription}
                onChange={(event) =>
                  setBusinessDescription(event.target.value)
                }
                disabled={!business || isSavingBusinessInfo}
                rows={5}
                className="resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black leading-6 text-white outline-none transition placeholder:text-gray-600 focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Describe what your business offers and who you help."
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveBusinessInfo}
              disabled={!business || isSavingBusinessInfo}
              className="rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingBusinessInfo ? "Saving..." : "Save business info"}
            </button>

            <Link
              href="/dashboard/profile"
              className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10 sm:hidden"
            >
              Full profile page
            </Link>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          eyebrow="Booking Settings"
          title="Control how customers request appointments."
          description="Choose whether customers must select from fixed available hours or can submit flexible time requests."
          isOpen={openSections.bookingSettings}
          onToggle={() => toggleSection("bookingSettings")}
          rightContent={
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300 sm:inline-flex">
              {bookingMode}
            </span>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <button
              type="button"
              onClick={() => setBookingTimeMode("fixed_hours")}
              disabled={!business || isSavingBookingSettings}
              className={`rounded-[2rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                bookingTimeMode === "fixed_hours"
                  ? "border-edition-primary/30 bg-edition-primary/10"
                  : "border-white/10 bg-black/20 hover:bg-white/[0.03]"
              }`}
            >
              <p className="text-lg font-black text-white">Fixed hours</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Customers choose from available time slots based on your
                configured business hours.
              </p>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                  bookingTimeMode === "fixed_hours"
                    ? "bg-edition-primary text-black"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {bookingTimeMode === "fixed_hours" ? "Selected" : "Choose"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setBookingTimeMode("flexible_requests")}
              disabled={!business || isSavingBookingSettings}
              className={`rounded-[2rem] border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                bookingTimeMode === "flexible_requests"
                  ? "border-edition-primary/30 bg-edition-primary/10"
                  : "border-white/10 bg-black/20 hover:bg-white/[0.03]"
              }`}
            >
              <p className="text-lg font-black text-white">
                Flexible requests
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Customers request their preferred time, and you can approve it
                or confirm a different time.
              </p>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                  bookingTimeMode === "flexible_requests"
                    ? "bg-edition-primary text-black"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {bookingTimeMode === "flexible_requests"
                  ? "Selected"
                  : "Choose"}
              </span>
            </button>
          </div>

          <div className="mt-4 rounded-[2rem] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-black text-white">
                  Show business hours
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Display your configured hours on the public booking page.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setBusinessHoursEnabled(
                    (currentValue) => !currentValue
                  )
                }
                disabled={!business || isSavingBookingSettings}
                className={`w-fit rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  businessHoursEnabled
                    ? "bg-edition-primary text-black hover:bg-edition-primary-hover"
                    : "border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {businessHoursEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
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
                Open days
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {hasOpenHours
                  ? `${openHoursCount} open day(s)`
                  : "No open hours"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Branding
              </p>
              <p className="mt-2 text-sm font-black text-white">
                {hasBranding ? "Custom branding" : "Default branding"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveBookingSettings}
              disabled={!business || isSavingBookingSettings}
              className="rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingBookingSettings
                ? "Saving..."
                : "Save booking settings"}
            </button>

            <Link
              href="/dashboard/booking-page"
              className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              Edit business hours
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
        </CollapsiblePanel>


        <CollapsiblePanel
          eyebrow="No-show Protection"
          title="Control appointment reminder emails."
          description="Reduce missed appointments by sending customer reminders, owner reminders, and deposit reminder notes before confirmed bookings."
          isOpen={openSections.notificationControls}
          onToggle={() => toggleSection("notificationControls")}
          rightContent={
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300 sm:inline-flex">
              {reminderEmailsEnabled ? "Reminders on" : "Reminders off"}
            </span>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-white">
                    Customer reminder emails
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Send customers an appointment reminder before confirmed bookings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setReminderEmailsEnabled((currentValue) => !currentValue)
                  }
                  disabled={!business || isSavingReminderSettings}
                  className={`w-fit rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    reminderEmailsEnabled
                      ? "bg-edition-primary text-black hover:bg-edition-primary-hover"
                      : "border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {reminderEmailsEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <label className="grid gap-2">
                <span className="text-lg font-black text-white">
                  Reminder timing
                </span>
                <span className="text-sm leading-6 text-gray-400">
                  Choose when SchedNest should start sending reminders before the appointment.
                </span>

                <select
                  value={reminderHoursBefore}
                  onChange={(event) =>
                    setReminderHoursBefore(Number(event.target.value))
                  }
                  disabled={!business || isSavingReminderSettings || !reminderEmailsEnabled}
                  className="mt-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value={1}>1 hour before</option>
                  <option value={3}>3 hours before</option>
                  <option value={6}>6 hours before</option>
                  <option value={12}>12 hours before</option>
                  <option value={24}>24 hours before</option>
                  <option value={48}>48 hours before</option>
                </select>
              </label>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-white">
                    Owner reminder emails
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Send the business an appointment reminder so upcoming bookings are not missed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setOwnerReminderEnabled((currentValue) => !currentValue)
                  }
                  disabled={!business || isSavingReminderSettings || !reminderEmailsEnabled}
                  className={`w-fit rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    ownerReminderEnabled
                      ? "bg-edition-primary text-black hover:bg-edition-primary-hover"
                      : "border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {ownerReminderEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-white">
                    Deposit reminder notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Include pending deposit details and manual payment instructions in reminder emails.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setDepositReminderEnabled((currentValue) => !currentValue)
                  }
                  disabled={!business || isSavingReminderSettings || !reminderEmailsEnabled}
                  className={`w-fit rounded-2xl px-5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    depositReminderEnabled
                      ? "bg-edition-primary text-black hover:bg-edition-primary-hover"
                      : "border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {depositReminderEnabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4">
            <p className="text-sm font-black text-yellow-200">
              Daily reminder engine
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              Your current Vercel Hobby setup runs reminders once daily, so the timing works as a reminder window instead of an exact minute-by-minute send time.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveReminderSettings}
              disabled={!business || isSavingReminderSettings}
              className="rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingReminderSettings
                ? "Saving..."
                : "Save no-show protection"}
            </button>

            <Link
              href="/dashboard/bookings"
              className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              View bookings
            </Link>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          eyebrow="Branding Controls"
          title="Customize your public booking page style."
          description="Update the colors and theme customers see when they visit your booking page."
          isOpen={openSections.brandingControls}
          onToggle={() => toggleSection("brandingControls")}
          rightContent={
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300 sm:inline-flex">
              {formatLabel(bookingPageTheme, "Theme")}
            </span>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                    Primary color
                  </span>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <input
                      type="color"
                      value={getColorInputValue(brandPrimaryColor)}
                      onChange={(event) =>
                        setBrandPrimaryColor(event.target.value)
                      }
                      disabled={!business || isSavingBrandingSettings}
                      className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <input
                      value={brandPrimaryColor}
                      onChange={(event) =>
                        setBrandPrimaryColor(event.target.value)
                      }
                      disabled={!business || isSavingBrandingSettings}
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="#34d399"
                    />
                  </div>
                </label>

                <label className="grid gap-2">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                    Accent color
                  </span>

                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                    <input
                      type="color"
                      value={getColorInputValue(brandAccentColor)}
                      onChange={(event) =>
                        setBrandAccentColor(event.target.value)
                      }
                      disabled={!business || isSavingBrandingSettings}
                      className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <input
                      value={brandAccentColor}
                      onChange={(event) =>
                        setBrandAccentColor(event.target.value)
                      }
                      disabled={!business || isSavingBrandingSettings}
                      className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none placeholder:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="#34d399"
                    />
                  </div>
                </label>
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Quick presets
                </span>

                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => {
                        setBrandPrimaryColor(color.value);
                        setBrandAccentColor(color.value);
                      }}
                      disabled={!business || isSavingBrandingSettings}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-white/20"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Booking page theme
                </span>

                <select
                  value={bookingPageTheme}
                  onChange={(event) => setBookingPageTheme(event.target.value)}
                  disabled={!business || isSavingBrandingSettings}
                  className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none transition focus:border-edition-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bookingThemeOptions.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={saveBrandingSettings}
                  disabled={!business || isSavingBrandingSettings}
                  className="rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingBrandingSettings
                    ? "Saving..."
                    : "Save branding settings"}
                </button>

                <Link
                  href="/dashboard/profile"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                >
                  Open full profile
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

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Live Preview
              </p>

              <div
                className="mt-4 rounded-[2rem] border border-white/10 p-5"
                style={{
                  background: `linear-gradient(135deg, ${getColorInputValue(
                    brandPrimaryColor
                  )}22, ${getColorInputValue(brandAccentColor)}11)`,
                }}
              >
                <div
                  className="h-12 w-12 rounded-2xl"
                  style={{
                    backgroundColor: getColorInputValue(brandPrimaryColor),
                  }}
                />

                <h3 className="mt-5 text-2xl font-black text-white">
                  {businessName || "Your Business"}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-300">
                  {businessDescription ||
                    "A quick preview of how your brand colors can feel on the public booking page."}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span
                    className="rounded-2xl px-4 py-3 text-sm font-black text-black"
                    style={{
                      backgroundColor: getColorInputValue(brandPrimaryColor),
                    }}
                  >
                    Book now
                  </span>

                  <span
                    className="rounded-2xl border px-4 py-3 text-sm font-black text-white"
                    style={{
                      borderColor: getColorInputValue(brandAccentColor),
                    }}
                  >
                    {formatLabel(bookingPageTheme, "Theme")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          eyebrow="Setup Health"
          title={`Profile completion: ${getCompletionLabel(
            profileCompleted,
            profileTotal
          )}`}
          description="Review what is complete and what still needs attention before customers book."
          isOpen={openSections.setupHealth}
          onToggle={() => toggleSection("setupHealth")}
        >
          <div className="grid gap-3">
            {setupHealthItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <p className="text-sm font-black text-white">{item.label}</p>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    item.complete
                      ? "bg-edition-primary text-black"
                      : "bg-yellow-400/10 text-yellow-200"
                  }`}
                >
                  {item.complete ? "Done" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/profile"
            className="mt-5 inline-flex rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover"
          >
            Improve profile
          </Link>
        </CollapsiblePanel>

        <CollapsiblePanel
          eyebrow="Quick Links"
          title="Jump to the full settings pages."
          description="Use these cards when you need the full workflow for services, billing, customers, requests, or profile setup."
          isOpen={openSections.quickLinks}
          onToggle={() => toggleSection("quickLinks")}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {settingSections.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="group rounded-[2rem] border border-white/10 bg-black/20 p-6 transition hover:border-edition-primary/30 hover:bg-edition-primary/10"
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

                  <span className="w-fit rounded-2xl border border-white/10 px-4 py-3 text-sm font-black text-gray-300 transition group-hover:border-edition-primary/30 group-hover:bg-edition-primary group-hover:text-black">
                    {section.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CollapsiblePanel>

        <CollapsiblePanel
          eyebrow="Coming Next"
          title="More direct settings."
          description="Business info, booking mode, branding, and no-show protection can now be edited here. Next, we can add deeper notification templates and billing shortcuts directly into this dashboard."
          isOpen={openSections.nextSteps}
          onToggle={() => toggleSection("nextSteps")}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-lg font-black text-white">
                Notification preferences
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Control owner alerts, customer emails, and future reminders.
              </p>
            </div>

            <div className="rounded-2xl border border-edition-primary/20 bg-edition-primary/10 p-5">
              <p className="text-lg font-black text-white">
                Customer reminders
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Live. Businesses can now control appointment reminders and no-show protection.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-lg font-black text-white">
                Billing shortcuts
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                Surface plan changes and portal access inside Settings.
              </p>
            </div>
          </div>
        </CollapsiblePanel>
      </div>
    </DashboardShell>
  );
}