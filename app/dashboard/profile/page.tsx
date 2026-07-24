"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
  slug: string | null;
  timezone: string | null;
  business_description: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  brand_primary_color: string | null;
  brand_accent_color: string | null;
  booking_page_theme: string | null;
};

type AnyRow = Record<string, unknown>;

type ColorPreset = {
  label: string;
  value: string;
};

const timezoneOptions = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const themeOptions = [
  {
    value: "schednest_dark",
    label: "SchedNest Dark",
    description: "Default dark emerald booking page style.",
  },
  {
    value: "brand_dark",
    label: "Brand Dark",
    description: "Dark page with your business brand colors.",
  },
  {
    value: "brand_clean",
    label: "Brand Clean",
    description: "Cleaner branded layout for service businesses.",
  },
];

const colorPresets: ColorPreset[] = [
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

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not set";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getString(row: AnyRow | null, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return fallback;
}

function isValidHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function sanitizeHexColor(value: string, fallback: string) {
  const cleanValue = value.trim();

  if (isValidHexColor(cleanValue)) {
    return cleanValue;
  }

  return fallback;
}

function getPlanAccess(subscription: AnyRow | null, plan: AnyRow | null) {
  const status = getString(subscription, ["status"], "").toLowerCase();
  const planName = getString(plan, ["name", "plan_name", "title"], "")
    .toLowerCase()
    .trim();

  const isActive =
    status === "active" ||
    status === "trialing" ||
    status === "trial" ||
    status === "past_due";

  const hasGrowthAccess =
    isActive &&
    (planName.includes("growth") || planName.includes("complete"));

  const hasCompleteAccess = isActive && planName.includes("complete");

  return {
    isActive,
    planName: planName ? formatLabel(planName) : "No plan assigned",
    hasGrowthAccess,
    hasCompleteAccess,
  };
}

export default function BusinessProfilePage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<AnyRow | null>(null);
  const [plan, setPlan] = useState<AnyRow | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [businessDescription, setBusinessDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#34d399");
  const [brandAccentColor, setBrandAccentColor] = useState("#34d399");
  const [bookingPageTheme, setBookingPageTheme] = useState("schednest_dark");

  const cleanSlug = createSlug(slug);
  const publicBookingPath = cleanSlug ? `/book/${cleanSlug}` : "";

  const planAccess = getPlanAccess(subscription, plan);

  const previewPrimaryColor = planAccess.hasGrowthAccess
    ? sanitizeHexColor(brandPrimaryColor, "#34d399")
    : "#34d399";

  const previewAccentColor = planAccess.hasGrowthAccess
    ? sanitizeHexColor(brandAccentColor, "#34d399")
    : "#34d399";

  const setupItems = [
    {
      label: "Business name",
      ready: businessName.trim().length > 0,
      description: "Shown on your dashboard, booking page, and emails.",
    },
    {
      label: "Public booking link",
      ready: cleanSlug.length > 0,
      description: "Customers need this link to request appointments.",
    },
    {
      label: "Contact info",
      ready: contactEmail.trim().length > 0 || contactPhone.trim().length > 0,
      description: "Helps customers know how to reach your business.",
    },
    {
      label: "Business description",
      ready: businessDescription.trim().length > 0,
      description: "Gives customers context before they book.",
    },
    {
      label: "Timezone",
      ready: timezone.trim().length > 0,
      description: "Keeps booking times accurate.",
    },
  ];

  const completedSetupItems = setupItems.filter((item) => item.ready).length;

  async function loadProfile() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to view your business profile.");
      setIsLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("business_profiles")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (profileError) {
      setMessage(profileError.message);
      setIsLoading(false);
      return;
    }

    if (!profileData) {
      setMessage("Business profile not found.");
      setIsLoading(false);
      return;
    }

    const safeProfile = profileData as BusinessProfile;
    setProfile(safeProfile);

    setBusinessName(safeProfile.business_name || "");
    setSlug(safeProfile.slug || "");
    setTimezone(safeProfile.timezone || "America/Los_Angeles");
    setBusinessDescription(safeProfile.business_description || "");
    setContactEmail(safeProfile.contact_email || "");
    setContactPhone(safeProfile.contact_phone || "");
    setBrandPrimaryColor(safeProfile.brand_primary_color || "#34d399");
    setBrandAccentColor(safeProfile.brand_accent_color || "#34d399");
    setBookingPageTheme(safeProfile.booking_page_theme || "schednest_dark");

    const { data: subscriptionData } = await supabase
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", safeProfile.id)
      .maybeSingle();

    const safeSubscription = (subscriptionData || null) as AnyRow | null;
    setSubscription(safeSubscription);

    const planId = safeSubscription?.plan_id;

    if (typeof planId === "string" && planId) {
      const { data: planData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("id", planId)
        .maybeSingle();

      setPlan((planData || null) as AnyRow | null);
    } else {
      setPlan(null);
    }

    setIsLoading(false);
  }

  async function saveProfile() {
    if (!businessName.trim()) {
      setMessage("Business name is required.");
      return;
    }

    if (!cleanSlug) {
      setMessage("Public booking slug is required.");
      return;
    }

    if (planAccess.hasGrowthAccess && !isValidHexColor(brandPrimaryColor)) {
      setMessage("Primary brand color must be a valid color.");
      return;
    }

    if (planAccess.hasGrowthAccess && !isValidHexColor(brandAccentColor)) {
      setMessage("Accent color must be a valid color.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to save a business profile.");
      setIsSaving(false);
      return;
    }

    const profilePayload = {
      business_name: businessName.trim(),
      slug: cleanSlug,
      timezone,
      business_description: businessDescription.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      brand_primary_color: planAccess.hasGrowthAccess
        ? sanitizeHexColor(brandPrimaryColor, "#34d399")
        : profile?.brand_primary_color || "#34d399",
      brand_accent_color: planAccess.hasGrowthAccess
        ? sanitizeHexColor(brandAccentColor, "#34d399")
        : profile?.brand_accent_color || "#34d399",
      booking_page_theme: planAccess.hasGrowthAccess
        ? bookingPageTheme
        : profile?.booking_page_theme || "schednest_dark",
    };

    if (!profile) {
      const { data: createdProfile, error: createError } = await supabase
        .from("business_profiles")
        .insert({
          ...profilePayload,
          owner_id: user.id,
        })
        .select("*")
        .single();

      if (createError || !createdProfile) {
        setMessage(
          createError?.message || "Unable to create the business profile.",
        );
        setIsSaving(false);
        return;
      }

      setProfile(createdProfile as BusinessProfile);
      setMessage("Business profile created.");
      await loadProfile();
      setIsSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("business_profiles")
      .update(profilePayload)
      .eq("id", profile.id)
      .eq("owner_id", user.id);

    if (updateError) {
      setMessage(updateError.message);
      setIsSaving(false);
      return;
    }

    setMessage("Business profile saved.");
    await loadProfile();
    setIsSaving(false);
  }

  async function copyBookingLink() {
    if (!publicBookingPath) return;

    await navigator.clipboard.writeText(
      `${window.location.origin}${publicBookingPath}`,
    );
    setMessage("Public booking link copied.");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="torogoz-dashboard-hero relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="torogoz-dashboard-hero-streaks" aria-hidden="true">
            <span />
            <span />
          </div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-edition-primary">
            Business Profile
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Manage your business identity.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Control how your business appears across SchedNest, your public
            booking page, and customer-facing communication.
          </p>

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
              {message}
            </p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-edition-primary">
              Business Details
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Core profile
            </h2>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-300">
                  Business name
                </label>
                <input
                  value={businessName}
                  onChange={(event) => {
                    setBusinessName(event.target.value);

                    if (!slug.trim()) {
                      setSlug(createSlug(event.target.value));
                    }
                  }}
                  placeholder="Example: SchedNest Studio"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/60"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Public booking slug
                </label>
                <input
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder="schednest"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/60"
                />

                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Clean URL preview:{" "}
                  <span className="font-bold text-edition-primary">
                    {cleanSlug || "your-business"}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-edition-primary/60"
                >
                  {timezoneOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Business description
                </label>
                <textarea
                  value={businessDescription}
                  onChange={(event) =>
                    setBusinessDescription(event.target.value)
                  }
                  placeholder="Tell customers what your business does, what you specialize in, or what they should expect."
                  className="mt-2 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/60"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-edition-primary/20 bg-edition-primary/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-edition-primary">
              Setup Readiness
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              {isLoading
                ? "Loading setup..."
                : `${completedSetupItems}/${setupItems.length} complete`}
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              Complete these items so your business looks ready when customers
              visit your booking page.
            </p>

            <div className="mt-5 grid gap-3">
              {setupItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div>
                    <p className="text-sm font-black text-white">
                      {item.label}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {item.description}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      item.ready
                        ? "bg-edition-primary/10 text-edition-primary"
                        : "bg-yellow-400/10 text-yellow-200"
                    }`}
                  >
                    {item.ready ? "Ready" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-edition-primary">
              Contact Info
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Customer-facing contact details
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              These details can be used on your public booking page and customer
              communication.
            </p>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-bold text-gray-300">
                  Contact email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="business@example.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/60"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Contact phone
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  placeholder="(555) 555-5555"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-edition-primary/60"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-edition-primary">
              Public URL Preview
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Your booking link
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              This is what customers will use to access your public booking
              page.
            </p>

            <div className="mt-5 rounded-2xl border border-edition-primary/20 bg-edition-primary/10 p-4">
              <p className="break-all text-sm font-black text-edition-primary-soft">
                {publicBookingPath || "Your booking link will appear here."}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={copyBookingLink}
                disabled={!publicBookingPath}
                className="rounded-2xl bg-edition-primary px-5 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                Copy Link
              </button>

              {publicBookingPath && (
                <a
                  href={publicBookingPath}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                >
                  Open Booking Page
                </a>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black text-edition-primary">
                Booking Page Design
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                Brand your customer booking experience.
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                Growth and Complete businesses can customize booking page colors
                so the page matches their brand.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                planAccess.hasGrowthAccess
                  ? "bg-edition-primary/10 text-edition-primary"
                  : "bg-yellow-400/10 text-yellow-200"
              }`}
            >
              {planAccess.hasGrowthAccess
                ? `${planAccess.planName} unlocked`
                : "Growth feature"}
            </span>
          </div>

          {!planAccess.hasGrowthAccess && (
            <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-5">
              <p className="text-sm font-black text-yellow-200">
                Upgrade required
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Essentials uses the default SchedNest booking page design.
                Growth and Complete can customize brand colors and page style.
              </p>
            </div>
          )}

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div
              className={`grid gap-5 ${
                !planAccess.hasGrowthAccess ? "opacity-50" : ""
              }`}
            >
              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <label className="text-sm font-black text-white">
                      Primary brand color
                    </label>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      Use the color picker for any custom color, or choose a
                      preset below.
                    </p>
                  </div>

                  <div
                    className="h-12 w-12 shrink-0 rounded-2xl border border-white/20"
                    style={{ background: previewPrimaryColor }}
                  />
                </div>

                <div className="mt-4">
                  <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10">
                    <input
                      type="color"
                      value={previewPrimaryColor}
                      disabled={!planAccess.hasGrowthAccess}
                      onChange={(event) =>
                        setBrandPrimaryColor(event.target.value)
                      }
                      className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-black/30 disabled:cursor-not-allowed"
                    />
                    Choose color
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={`primary-${preset.value}`}
                      type="button"
                      disabled={!planAccess.hasGrowthAccess}
                      onClick={() => setBrandPrimaryColor(preset.value)}
                      className={`rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed ${
                        sanitizeHexColor(brandPrimaryColor, "#34d399") ===
                        preset.value
                          ? "border-white/30 bg-white/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ background: preset.value }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <label className="text-sm font-black text-white">
                      Accent color
                    </label>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      This is used for buttons, highlights, and call-to-action
                      areas.
                    </p>
                  </div>

                  <div
                    className="h-12 w-12 shrink-0 rounded-2xl border border-white/20"
                    style={{ background: previewAccentColor }}
                  />
                </div>

                <div className="mt-4">
                  <label className="flex w-fit cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10">
                    <input
                      type="color"
                      value={previewAccentColor}
                      disabled={!planAccess.hasGrowthAccess}
                      onChange={(event) =>
                        setBrandAccentColor(event.target.value)
                      }
                      className="h-10 w-12 cursor-pointer rounded-xl border border-white/10 bg-black/30 disabled:cursor-not-allowed"
                    />
                    Choose color
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={`accent-${preset.value}`}
                      type="button"
                      disabled={!planAccess.hasGrowthAccess}
                      onClick={() => setBrandAccentColor(preset.value)}
                      className={`rounded-full border px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed ${
                        sanitizeHexColor(brandAccentColor, "#34d399") ===
                        preset.value
                          ? "border-white/30 bg-white/15 text-white"
                          : "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      <span
                        className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{ background: preset.value }}
                      />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-300">
                  Booking page theme
                </label>

                <select
                  value={bookingPageTheme}
                  disabled={!planAccess.hasGrowthAccess}
                  onChange={(event) => setBookingPageTheme(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-edition-primary/60 disabled:cursor-not-allowed"
                >
                  {themeOptions.map((theme) => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/20 p-5">
              <p className="text-sm font-black text-edition-primary">
                Live style preview
              </p>

              <div
                className="mt-5 rounded-[2rem] border border-white/10 p-5"
                style={{
                  background:
                    bookingPageTheme === "brand_clean" ? "#f8fafc" : "#050807",
                }}
              >
                <div
                  className="h-2 w-24 rounded-full"
                  style={{
                    background: previewPrimaryColor,
                  }}
                />

                <h3
                  className={`mt-5 text-2xl font-black ${
                    bookingPageTheme === "brand_clean"
                      ? "text-slate-950"
                      : "text-white"
                  }`}
                >
                  {businessName || "Your Business"}
                </h3>

                <p
                  className={`mt-2 text-sm leading-6 ${
                    bookingPageTheme === "brand_clean"
                      ? "text-slate-600"
                      : "text-gray-400"
                  }`}
                >
                  {businessDescription ||
                    "Your business description will appear here."}
                </p>

                <div className="mt-5 grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p
                    className={`text-xs font-black uppercase tracking-[0.2em] ${
                      bookingPageTheme === "brand_clean"
                        ? "text-slate-500"
                        : "text-gray-500"
                    }`}
                  >
                    Sample service
                  </p>

                  <p
                    className={`text-sm font-black ${
                      bookingPageTheme === "brand_clean"
                        ? "text-slate-950"
                        : "text-white"
                    }`}
                  >
                    Consultation · 60 min
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-5 rounded-2xl px-5 py-3 text-sm font-black text-black"
                  style={{
                    background: previewAccentColor,
                  }}
                >
                  Request Booking
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  Service samples
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Complete tier can later show service examples, sample images,
                  before/after photos, or featured work on the booking page.
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                  planAccess.hasCompleteAccess
                    ? "bg-edition-primary/10 text-edition-primary"
                    : "bg-white/10 text-gray-300"
                }`}
              >
                {planAccess.hasCompleteAccess ? "Unlocked" : "Complete"}
              </span>
            </div>
          </div>
        </section>

        <section className="sticky bottom-4 z-20 rounded-[2rem] border border-white/10 bg-[#07100d]/95 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-gray-400">
              Save changes to update your business profile and booking page
              details.
            </p>

            <button
              type="button"
              onClick={saveProfile}
              disabled={isSaving || isLoading}
              className="rounded-2xl bg-edition-primary px-6 py-3 text-sm font-black text-black transition hover:bg-edition-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Business Profile"}
            </button>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}