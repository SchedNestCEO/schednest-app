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

type AnyRow = Record<string, unknown>;

type PlanKey = "essentials" | "growth" | "complete";
type BillingInterval = "monthly" | "annual";

type PlanOption = {
  key: PlanKey;
  name: string;
  founderMonthly: string;
  founderAnnual: string;
  standardMonthly: string;
  standardAnnual: string;
  description: string;
  features: string[];
};

type StripeRouteResponse = {
  url?: string;
  error?: string;
};

const ADMIN_EMAIL = "hello@schednest.com";

const planOptions: PlanOption[] = [
  {
    key: "essentials",
    name: "Essentials",
    founderMonthly: "$4.99/mo",
    founderAnnual: "$49.99/year",
    standardMonthly: "$9.99/mo",
    standardAnnual: "$99.99/year",
    description: "For solo providers who need a clean booking system.",
    features: [
      "Booking page",
      "Services",
      "Bookings",
      "Customers",
      "Requests",
      "Basic notifications",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    founderMonthly: "$14.99/mo",
    founderAnnual: "$149.99/year",
    standardMonthly: "$19.99/mo",
    standardAnnual: "$199.99/year",
    description: "For businesses that want stronger branding and presentation.",
    features: [
      "Everything in Essentials",
      "Custom booking page colors",
      "Business description and contact info",
      "Service samples",
      "Featured services foundation",
    ],
  },
  {
    key: "complete",
    name: "Complete",
    founderMonthly: "$34.99/mo",
    founderAnnual: "$349.99/year",
    standardMonthly: "$39.99/mo",
    standardAnnual: "$399.99/year",
    description: "For businesses building a more complete customer experience.",
    features: [
      "Everything in Growth",
      "Before/after gallery foundation",
      "Portfolio-style booking page foundation",
      "Advanced customer features later",
      "Priority product updates",
    ],
  },
];

function getString(row: AnyRow | null, keys: string[], fallback = "Not set") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
  }

  return fallback;
}

function getBoolean(row: AnyRow | null, keys: string[]) {
  if (!row) return false;

  for (const key of keys) {
    const value = row[key];

    if (typeof value === "boolean") return value;
  }

  return false;
}

function formatLabel(value: string) {
  if (!value || value === "Not set") return value;

  return value
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString([], {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMoney(value: unknown) {
  if (typeof value !== "number") return "Not set";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getStatusClass(status: string) {
  const cleanStatus = status.toLowerCase();

  if (cleanStatus.includes("active")) {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (cleanStatus.includes("past") || cleanStatus.includes("overdue")) {
    return "border-red-400/20 bg-red-400/10 text-red-300";
  }

  if (cleanStatus.includes("trial")) {
    return "border-yellow-400/20 bg-yellow-400/10 text-yellow-200";
  }

  return "border-white/10 bg-white/10 text-gray-300";
}

function normalizePlanName(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

function getCheckoutLoadingKey(
  planKey: PlanKey,
  billingInterval: BillingInterval
) {
  return `${planKey}:${billingInterval}`;
}

function isSubscriptionActive(status: string) {
  const cleanStatus = status.toLowerCase();

  return (
    cleanStatus.includes("active") ||
    cleanStatus.includes("trial") ||
    cleanStatus.includes("past due") ||
    cleanStatus.includes("past_due")
  );
}

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoadingKey, setCheckoutLoadingKey] = useState<string | null>(
    null
  );
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] = useState<AnyRow | null>(null);
  const [plan, setPlan] = useState<AnyRow | null>(null);

  async function loadAccount() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to view account details.");
      setIsLoading(false);
      return;
    }

    setUserEmail(user.email || null);

    const { data: businessData, error: businessError } = await supabase
      .from("business_profiles")
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError) {
      setMessage(businessError.message);
      setIsLoading(false);
      return;
    }

    if (!businessData) {
      setMessage("Create your business profile before managing billing.");
      setBusiness(null);
      setSubscription(null);
      setPlan(null);
      setIsLoading(false);
      return;
    }

    const safeBusiness = businessData as BusinessProfile;
    setBusiness(safeBusiness);

    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", safeBusiness.id)
      .maybeSingle();

    if (subscriptionError) {
      setMessage(
        "Account page loaded, but subscription details could not be found yet."
      );
      setSubscription(null);
      setPlan(null);
      setIsLoading(false);
      return;
    }

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

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error("You must be logged in to manage billing.");
    }

    return session.access_token;
  }

  async function startCheckout(
    planKey: PlanKey,
    billingInterval: BillingInterval
  ) {
    try {
      setMessage("");
      setCheckoutLoadingKey(getCheckoutLoadingKey(planKey, billingInterval));

      const accessToken = await getAccessToken();

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          planKey,
          billingInterval,
        }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as StripeRouteResponse | null;

      if (!response.ok || !payload?.url) {
        throw new Error(
          payload?.error || "Could not open Stripe checkout session."
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not start Stripe checkout.";

      setMessage(errorMessage);
      setCheckoutLoadingKey(null);
    }
  }

  async function openBillingPortal() {
    try {
      setMessage("");
      setIsPortalLoading(true);

      const accessToken = await getAccessToken();

      const response = await fetch(
        "/api/stripe/create-billing-portal-session",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const payload = (await response
        .json()
        .catch(() => null)) as StripeRouteResponse | null;

      if (!response.ok || !payload?.url) {
        throw new Error(
          payload?.error || "Could not open Stripe billing portal."
        );
      }

      window.location.href = payload.url;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not open Stripe billing portal.";

      setMessage(errorMessage);
      setIsPortalLoading(false);
    }
  }

  useEffect(() => {
    loadAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = formatLabel(
    getString(subscription, ["status", "subscription_status"], "No plan")
  );

  const planName = formatLabel(
    getString(plan, ["name", "plan_name", "title"], "No plan assigned")
  );

  const normalizedCurrentPlan = normalizePlanName(planName);

  const pricingTier = formatLabel(
    getString(subscription, ["pricing_tier", "tier"], "Not set")
  );

  const billingInterval = formatLabel(
    getString(subscription, ["billing_interval", "interval"], "Not set")
  );

  const founderBetaSpot = getBoolean(subscription, [
    "founder_beta_spot",
    "founder_spot",
    "is_founder_beta",
  ]);

  const nextDueDate = formatDate(
    subscription?.next_due_date ||
      subscription?.next_payment_due_date ||
      subscription?.current_period_end ||
      subscription?.period_end
  );

  const monthlyPrice =
    plan?.monthly_price ??
    plan?.monthly_amount ??
    plan?.price_monthly ??
    subscription?.monthly_price;

  const annualPrice =
    plan?.annual_price ??
    plan?.yearly_price ??
    plan?.price_annual ??
    subscription?.annual_price;

  const stripeCustomerId = getString(
    subscription,
    ["stripe_customer_id", "customer_id"],
    "Not connected"
  );

  const stripeSubscriptionId = getString(
    subscription,
    ["stripe_subscription_id", "subscription_id"],
    "Not connected"
  );

  const isAdmin = userEmail === ADMIN_EMAIL;
  const hasSubscription = Boolean(subscription);
  const hasStripeCustomer = stripeCustomerId !== "Not connected";
  const hasStripeSubscription = stripeSubscriptionId !== "Not connected";
  const hasActiveStripeSubscription =
    hasSubscription &&
    hasStripeCustomer &&
    hasStripeSubscription &&
    isSubscriptionActive(status);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
                Account
              </p>

              <h1 className="mt-3 text-4xl font-black text-white">
                Manage your account and billing.
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
                Review your subscription, compare plans, start Stripe checkout,
                and manage billing from one place.
              </p>
            </div>

            <button
              type="button"
              onClick={loadAccount}
              disabled={isLoading}
              className="w-fit rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Refreshing..." : "Refresh account"}
            </button>
          </div>

          {message && (
            <p className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-300">
              {message}
            </p>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-[0_0_40px_rgba(52,211,153,0.08)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                  Subscription
                </p>

                <h2 className="mt-3 text-3xl font-black text-white">
                  {isLoading ? "Loading..." : status}
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-300">
                  {subscription
                    ? hasActiveStripeSubscription
                      ? "Your active Stripe subscription is synced and can be managed through the billing portal."
                      : "Your current subscription information is shown below."
                    : "No subscription has been assigned to this business yet."}
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${getStatusClass(
                  status
                )}`}
              >
                {isLoading ? "Loading" : status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Plan
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {isLoading ? "..." : planName}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Pricing Tier
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {isLoading ? "..." : pricingTier}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Billing Interval
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {isLoading ? "..." : billingInterval}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Next Due Date
                </p>
                <p className="mt-2 text-lg font-black text-white">
                  {isLoading ? "..." : nextDueDate}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {hasActiveStripeSubscription ? (
                <>
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={isPortalLoading}
                    className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPortalLoading ? "Opening portal..." : "Manage billing"}
                  </button>

                  <a
                    href="#plans"
                    className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Compare plans
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="#plans"
                    className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
                  >
                    Choose plan
                  </a>

                  <button
                    type="button"
                    onClick={openBillingPortal}
                    disabled={isPortalLoading || !hasStripeCustomer}
                    className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPortalLoading
                      ? "Opening portal..."
                      : hasStripeCustomer
                        ? "Manage billing"
                        : "Billing portal after checkout"}
                  </button>
                </>
              )}
            </div>

            <p className="mt-3 text-xs leading-5 text-gray-400">
              {hasActiveStripeSubscription
                ? "Active subscriptions should be changed through the Stripe billing portal to avoid duplicate subscriptions."
                : "New subscriptions start through Stripe checkout. After checkout, the billing portal becomes available."}
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Billing Summary
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Account details
            </h2>

            <div className="mt-6 grid gap-3">
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">Business</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Active business profile
                  </p>
                </div>

                <p className="max-w-[180px] truncate text-right text-sm font-black text-gray-300">
                  {business?.business_name || "Not set"}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">Founder Beta</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Early account pricing status
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    founderBetaSpot
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-white/10 text-gray-300"
                  }`}
                >
                  {founderBetaSpot ? "Yes" : "No"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">
                    Monthly Price
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    If billed monthly
                  </p>
                </div>

                <p className="text-sm font-black text-gray-300">
                  {formatMoney(monthlyPrice)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="text-sm font-black text-white">Annual Price</p>
                  <p className="mt-1 text-xs text-gray-500">
                    If billed yearly
                  </p>
                </div>

                <p className="text-sm font-black text-gray-300">
                  {formatMoney(annualPrice)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {!isLoading && !hasSubscription && (
          <section className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-200">
              No Plan Assigned
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              This business does not have an active subscription yet.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              You can start a Stripe checkout from the plan cards below. If this
              is a founder beta account, assign founder beta status before
              checkout.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {isAdmin && (
                <Link
                  href="/dashboard/subscriptions"
                  className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
                >
                  Open admin subscriptions
                </Link>
              )}

              <a
                href="#plans"
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                View plans
              </a>

              <a
                href="mailto:billing@schednest.com"
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                Contact billing
              </a>
            </div>
          </section>
        )}

        {hasActiveStripeSubscription && (
          <section className="rounded-[2rem] border border-blue-400/20 bg-blue-400/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-blue-200">
              Active Subscription
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Plan changes are handled in Stripe.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              To upgrade, downgrade, change billing interval, update payment
              method, or cancel, open the billing portal. This prevents
              duplicate subscriptions.
            </p>

            <button
              type="button"
              onClick={openBillingPortal}
              disabled={isPortalLoading}
              className="mt-5 rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPortalLoading ? "Opening portal..." : "Open billing portal"}
            </button>
          </section>
        )}

        <section
          id="plans"
          className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-emerald-300">
                Plans
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                Choose the level that fits the business.
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                {hasActiveStripeSubscription
                  ? "You can compare plan levels here. Existing subscriptions should be changed through the Stripe billing portal."
                  : "These buttons create Stripe checkout sessions for new subscriptions."}
              </p>
            </div>

            <span className="w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
              Stripe connected
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {planOptions.map((option) => {
              const isCurrentPlan =
                normalizedCurrentPlan === option.key ||
                normalizedCurrentPlan.includes(option.key);

              const monthlyLoading =
                checkoutLoadingKey ===
                getCheckoutLoadingKey(option.key, "monthly");

              const annualLoading =
                checkoutLoadingKey ===
                getCheckoutLoadingKey(option.key, "annual");

              return (
                <div
                  key={option.key}
                  className={`rounded-[2rem] border p-5 ${
                    isCurrentPlan
                      ? "border-emerald-400/30 bg-emerald-400/10"
                      : "border-white/10 bg-black/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-black text-white">
                        {option.name}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-gray-400">
                        {option.description}
                      </p>
                    </div>

                    {isCurrentPlan && (
                      <span className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-black text-black">
                        Current
                      </span>
                    )}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                      Founder beta
                    </p>

                    <p className="mt-2 text-lg font-black text-white">
                      {option.founderMonthly}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {option.founderAnnual}
                    </p>
                  </div>

                  <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                      Standard
                    </p>

                    <p className="mt-2 text-lg font-black text-white">
                      {option.standardMonthly}
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      {option.standardAnnual}
                    </p>
                  </div>

                  <div className="mt-5 space-y-3">
                    {option.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
                        <p className="text-sm leading-5 text-gray-300">
                          {feature}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 grid gap-2">
                    {hasActiveStripeSubscription ? (
                      <>
                        <button
                          type="button"
                          onClick={openBillingPortal}
                          disabled={isPortalLoading}
                          className={`w-full rounded-2xl px-5 py-3 text-center text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isCurrentPlan
                              ? "border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/15"
                              : "bg-emerald-400 text-black hover:bg-emerald-300"
                          }`}
                        >
                          {isPortalLoading
                            ? "Opening portal..."
                            : isCurrentPlan
                              ? "Manage current plan"
                              : `Change to ${option.name}`}
                        </button>

                        <p className="text-center text-xs leading-5 text-gray-500">
                          Existing subscriptions are changed safely through
                          Stripe billing portal.
                        </p>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startCheckout(option.key, "monthly")}
                          disabled={Boolean(checkoutLoadingKey)}
                          className="w-full rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {monthlyLoading
                            ? "Opening checkout..."
                            : "Choose monthly"}
                        </button>

                        <button
                          type="button"
                          onClick={() => startCheckout(option.key, "annual")}
                          disabled={Boolean(checkoutLoadingKey)}
                          className="w-full rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {annualLoading
                            ? "Opening checkout..."
                            : "Choose annual"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Stripe Readiness
            </p>

            <h3 className="mt-3 text-xl font-black text-white">
              Billing automation status
            </h3>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-black text-emerald-300">
                  Checkout route ready
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-300">
                  New subscriptions can start through the Stripe checkout route.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-black text-emerald-300">
                  Billing portal route ready
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-300">
                  Businesses with a Stripe customer ID can open the billing
                  portal.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                <p className="text-sm font-black text-emerald-300">
                  Webhook sync ready
                </p>
                <p className="mt-1 text-xs leading-5 text-gray-300">
                  Stripe subscription changes are syncing back to Supabase.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Stripe Records
            </p>

            <h3 className="mt-3 text-xl font-black text-white">
              Connected billing IDs
            </h3>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Customer ID
                </p>
                <p className="mt-2 break-all text-sm font-black text-gray-300">
                  {stripeCustomerId}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Subscription ID
                </p>
                <p className="mt-2 break-all text-sm font-black text-gray-300">
                  {stripeSubscriptionId}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">Support</p>

            <h3 className="mt-3 text-xl font-black text-white">Need help?</h3>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Contact support for login issues, setup questions, booking page
              problems, billing questions, or notification issues.
            </p>

            <div className="mt-5 grid gap-3">
              <a
                href="mailto:billing@schednest.com"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Email billing
              </a>

              <a
                href="mailto:support@schednest.com"
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                Email support
              </a>

              <Link
                href="/terms"
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                View terms
              </Link>
            </div>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}