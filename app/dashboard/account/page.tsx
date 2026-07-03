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

export default function AccountPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
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

  return (
    <DashboardShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Account
          </p>

          <h1 className="mt-3 text-4xl font-black text-white">
            Manage your account and billing.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-400">
            Review your subscription status, plan details, billing interval, and
            support options for your SchedNest account.
          </p>

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
                    ? "Your current subscription information is shown below."
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

        {!isLoading && !subscription && (
          <section className="rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-6">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-yellow-200">
              No Plan Assigned
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              This business does not have an active subscription yet.
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-300">
              Since billing is still being managed manually, the account can be
              assigned a plan from the admin subscriptions page.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/subscriptions"
                className="rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
              >
                Open admin subscriptions
              </Link>

              <a
                href="mailto:billing@schednest.com"
                className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
              >
                Contact billing
              </a>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">
              Billing Help
            </p>

            <h3 className="mt-3 text-xl font-black text-white">
              Questions about payment?
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Use billing support for payment questions, invoices, plan changes,
              refunds, or cancellation help.
            </p>

            <a
              href="mailto:billing@schednest.com"
              className="mt-5 block rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-emerald-300"
            >
              Email billing
            </a>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">Support</p>

            <h3 className="mt-3 text-xl font-black text-white">
              Need account help?
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Contact support for login issues, setup questions, booking page
              problems, or customer notification issues.
            </p>

            <a
              href="mailto:support@schednest.com"
              className="mt-5 block rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              Email support
            </a>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-sm font-black text-emerald-300">Legal</p>

            <h3 className="mt-3 text-xl font-black text-white">
              Terms and policies
            </h3>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Review the terms for billing, cancellations, refunds, and account
              responsibilities.
            </p>

            <Link
              href="/terms"
              className="mt-5 block rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
            >
              View terms
            </Link>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}