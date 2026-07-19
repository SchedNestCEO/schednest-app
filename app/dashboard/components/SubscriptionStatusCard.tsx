"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
};

type BusinessSubscription = {
  id: string;
  business_id: string;
  owner_id: string;
  plan_id: string;
  pricing_tier: string;
  billing_interval: string;
  status: string;
  founder_beta_spot_number: number | null;
  current_period_end: string | null;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  founder_monthly_cents: number;
  founder_yearly_cents: number;
  standard_monthly_cents: number;
  standard_yearly_cents: number;
};

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getPlanPrice(
  plan: SubscriptionPlan,
  pricingTier: string,
  billingInterval: string
) {
  if (pricingTier === "founder_beta" && billingInterval === "yearly") {
    return plan.founder_yearly_cents;
  }

  if (pricingTier === "founder_beta") {
    return plan.founder_monthly_cents;
  }

  if (billingInterval === "yearly") {
    return plan.standard_yearly_cents;
  }

  return plan.standard_monthly_cents;
}

export default function SubscriptionStatusCard() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [subscription, setSubscription] =
    useState<BusinessSubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);

  async function loadSubscriptionStatus() {
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
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !businessData) {
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
      .select(
        "id, business_id, owner_id, plan_id, pricing_tier, billing_interval, status, founder_beta_spot_number, current_period_end"
      )
      .eq("business_id", safeBusiness.id)
      .maybeSingle();

    if (subscriptionError || !subscriptionData) {
      setSubscription(null);
      setPlan(null);
      setIsLoading(false);
      return;
    }

    const safeSubscription = subscriptionData as BusinessSubscription;
    setSubscription(safeSubscription);

    const { data: planData, error: planError } = await supabase
      .from("subscription_plans")
      .select(
        "id, name, founder_monthly_cents, founder_yearly_cents, standard_monthly_cents, standard_yearly_cents"
      )
      .eq("id", safeSubscription.plan_id)
      .maybeSingle();

    if (planError || !planData) {
      setPlan(null);
      setIsLoading(false);
      return;
    }

    setPlan(planData as SubscriptionPlan);
    setIsLoading(false);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSubscriptionStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
          Subscription
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Loading subscription status...
        </p>
      </section>
    );
  }

  if (!business) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
          Subscription
        </p>

        <h2 className="mt-3 text-2xl font-black text-white">
          Business profile needed
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Create your business profile before your subscription status can be
          shown.
        </p>
      </section>
    );
  }

  if (!subscription || !plan) {
    return (
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
              Subscription
            </p>

            <h2 className="mt-3 text-2xl font-black text-white">
              Plan activation pending
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Your SchedNest account is active, but a paid plan has not been
              assigned yet. If you already paid or requested Founder Beta access,
              contact support.
            </p>
          </div>

          <Link
            href="/contact"
            className="rounded-2xl border border-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Contact Support
          </Link>
        </div>
      </section>
    );
  }

  const price = getPlanPrice(
    plan,
    subscription.pricing_tier,
    subscription.billing_interval
  );

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            Subscription
          </p>

          <h2 className="mt-3 text-2xl font-black text-white">
            {plan.name} Plan
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Your current SchedNest plan and billing status.
          </p>
        </div>

        <div className="rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
          {formatLabel(subscription.status)}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Pricing
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {formatLabel(subscription.pricing_tier)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Billing
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {formatLabel(subscription.billing_interval)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Price
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {formatMoney(price)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Founder Spot
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {subscription.founder_beta_spot_number
              ? `#${subscription.founder_beta_spot_number}/25`
              : "Not assigned"}
          </p>
        </div>
      </div>

      {subscription.current_period_end && (
        <p className="mt-5 text-sm leading-6 text-gray-500">
          Current billing period ends{" "}
          <span className="font-bold text-white">
            {new Date(subscription.current_period_end).toLocaleDateString()}
          </span>
          .
        </p>
      )}

      <p className="mt-5 text-sm leading-6 text-gray-500">
        Billing, refund, invoice, or cancellation questions can be sent to{" "}
        <span className="font-bold text-white">billing@schednest.com</span>.
      </p>
    </section>
  );
}