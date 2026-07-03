"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { createClient } from "../../lib/supabase/client";

type BusinessProfile = {
  id: string;
  owner_id: string;
  business_name: string | null;
  slug: string | null;
  email: string | null;
  created_at: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  founder_monthly_cents: number;
  founder_yearly_cents: number;
  standard_monthly_cents: number;
  standard_yearly_cents: number;
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
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type EditableSubscription = {
  plan_id: string;
  pricing_tier: string;
  billing_interval: string;
  status: string;
  founder_beta_spot_number: string;
  notes: string;
};

const ADMIN_EMAIL = "hello@schednest.com";

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getSubscriptionPrice(
  plan: SubscriptionPlan | undefined,
  pricingTier: string,
  billingInterval: string
) {
  if (!plan) return 0;

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

export default function DashboardSubscriptionsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<BusinessSubscription[]>(
    []
  );

  const [editedSubscriptions, setEditedSubscriptions] = useState<
    Record<string, EditableSubscription>
  >({});

  const planById = useMemo(() => {
    return plans.reduce<Record<string, SubscriptionPlan>>((acc, plan) => {
      acc[plan.id] = plan;
      return acc;
    }, {});
  }, [plans]);

  const subscriptionByBusinessId = useMemo(() => {
    return subscriptions.reduce<Record<string, BusinessSubscription>>(
      (acc, subscription) => {
        acc[subscription.business_id] = subscription;
        return acc;
      },
      {}
    );
  }, [subscriptions]);

  const founderSpotsUsed = subscriptions.filter(
    (subscription) =>
      subscription.pricing_tier === "founder_beta" &&
      subscription.founder_beta_spot_number
  ).length;

  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.status === "active"
  ).length;

  const estimatedMonthlyRevenueCents = subscriptions
    .filter((subscription) => subscription.status === "active")
    .reduce((total, subscription) => {
      const plan = planById[subscription.plan_id];
      const price = getSubscriptionPrice(
        plan,
        subscription.pricing_tier,
        subscription.billing_interval
      );

      if (subscription.billing_interval === "yearly") {
        return total + Math.round(price / 12);
      }

      return total + price;
    }, 0);

  function getNextFounderSpot() {
    const usedSpots = subscriptions
      .map((subscription) => subscription.founder_beta_spot_number)
      .filter((spot): spot is number => Boolean(spot));

    for (let spot = 1; spot <= 25; spot += 1) {
      if (!usedSpots.includes(spot)) return spot;
    }

    return null;
  }

  function getInitialEditState(
    business: BusinessProfile,
    subscription?: BusinessSubscription
  ): EditableSubscription {
    if (subscription) {
      return {
        plan_id: subscription.plan_id,
        pricing_tier: subscription.pricing_tier,
        billing_interval: subscription.billing_interval,
        status: subscription.status,
        founder_beta_spot_number:
          subscription.founder_beta_spot_number?.toString() || "",
        notes: subscription.notes || "",
      };
    }

    return {
      plan_id: "essentials",
      pricing_tier: "founder_beta",
      billing_interval: "monthly",
      status: "active",
      founder_beta_spot_number: "",
      notes: "",
    };
  }

  async function loadData() {
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You must be logged in to view this page.");
      setIsLoading(false);
      return;
    }

    const userEmail = user.email?.toLowerCase();

    if (userEmail !== ADMIN_EMAIL) {
      setIsAdmin(false);
      setMessage("This page is only available to the SchedNest admin account.");
      setIsLoading(false);
      return;
    }

    setIsAdmin(true);

    const [plansResult, businessesResult, subscriptionsResult] =
      await Promise.all([
        supabase
          .from("subscription_plans")
          .select(
            "id, name, founder_monthly_cents, founder_yearly_cents, standard_monthly_cents, standard_yearly_cents"
          )
          .order("standard_monthly_cents", { ascending: true }),

        supabase
          .from("business_profiles")
          .select("id, owner_id, business_name, slug, email, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("business_subscriptions")
          .select(
            "id, business_id, owner_id, plan_id, pricing_tier, billing_interval, status, founder_beta_spot_number, current_period_start, current_period_end, canceled_at, notes, created_at, updated_at"
          )
          .order("created_at", { ascending: false }),
      ]);

    if (plansResult.error) {
      setMessage(plansResult.error.message);
      setIsLoading(false);
      return;
    }

    if (businessesResult.error) {
      setMessage(businessesResult.error.message);
      setIsLoading(false);
      return;
    }

    if (subscriptionsResult.error) {
      setMessage(subscriptionsResult.error.message);
      setIsLoading(false);
      return;
    }

    const safePlans = (plansResult.data || []) as SubscriptionPlan[];
    const safeBusinesses = (businessesResult.data || []) as BusinessProfile[];
    const safeSubscriptions =
      (subscriptionsResult.data || []) as BusinessSubscription[];

    setPlans(safePlans);
    setBusinesses(safeBusinesses);
    setSubscriptions(safeSubscriptions);

    const edits: Record<string, EditableSubscription> = {};

    safeBusinesses.forEach((business) => {
      const existingSubscription = safeSubscriptions.find(
        (subscription) => subscription.business_id === business.id
      );

      edits[business.id] = getInitialEditState(business, existingSubscription);
    });

    setEditedSubscriptions(edits);
    setIsLoading(false);
  }

  function updateEdit(
    businessId: string,
    field: keyof EditableSubscription,
    value: string
  ) {
    setEditedSubscriptions((current) => ({
      ...current,
      [businessId]: {
        ...current[businessId],
        [field]: value,
      },
    }));
  }

  async function saveSubscription(business: BusinessProfile) {
    const edit = editedSubscriptions[business.id];

    if (!edit) return;

    setMessage("");

    let founderSpotNumber: number | null = null;

    if (edit.pricing_tier === "founder_beta") {
      if (edit.founder_beta_spot_number.trim()) {
        founderSpotNumber = Number(edit.founder_beta_spot_number);
      } else {
        founderSpotNumber = getNextFounderSpot();
      }

      if (!founderSpotNumber || founderSpotNumber < 1 || founderSpotNumber > 25) {
        setMessage("Founder Beta spots must be between 1 and 25.");
        return;
      }
    }

    const currentSubscription = subscriptionByBusinessId[business.id];

    const payload = {
      business_id: business.id,
      owner_id: business.owner_id,
      plan_id: edit.plan_id,
      pricing_tier: edit.pricing_tier,
      billing_interval: edit.billing_interval,
      status: edit.status,
      founder_beta_spot_number: founderSpotNumber,
      notes: edit.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("business_subscriptions")
      .upsert(payload, {
        onConflict: "business_id",
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      currentSubscription
        ? "Subscription updated."
        : "Subscription created."
    );

    await loadData();
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm font-black uppercase tracking-[0.3em] text-emerald-300">
            CEO Admin
          </p>

          <h1 className="mt-3 text-3xl font-black text-white">
            Subscription Foundation
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            Internal SchedNest page for manually tracking Founder Beta spots,
            customer plans, billing status, and early subscription records before
            Stripe is connected.
          </p>

          {message && (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-gray-300">
              {message}
            </div>
          )}
        </div>

        {!isLoading && isAdmin && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-bold text-gray-400">
                  Founder Beta Spots
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {founderSpotsUsed}/25
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-bold text-gray-400">
                  Active Subscriptions
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {activeSubscriptions}
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-sm font-bold text-gray-400">
                  Estimated MRR
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {formatMoney(estimatedMonthlyRevenueCents)}
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black text-white">
                Business Subscriptions
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-400">
                Assign a plan and subscription status to each business. This is
                manual for now and will later connect to Stripe.
              </p>

              <div className="mt-6 grid gap-4">
                {businesses.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No business profiles found yet.
                  </p>
                ) : (
                  businesses.map((business) => {
                    const edit = editedSubscriptions[business.id];

                    if (!edit) return null;

                    const plan = planById[edit.plan_id];
                    const price = getSubscriptionPrice(
                      plan,
                      edit.pricing_tier,
                      edit.billing_interval
                    );

                    return (
                      <div
                        key={business.id}
                        className="rounded-[2rem] border border-white/10 bg-black/20 p-5"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="text-lg font-black text-white">
                              {business.business_name || "Unnamed business"}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              {business.email || "No business email"} ·{" "}
                              {business.slug || "No slug"}
                            </p>
                          </div>

                          <div className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                            {edit.status}
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-5">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              Plan
                            </label>
                            <select
                              value={edit.plan_id}
                              onChange={(event) =>
                                updateEdit(
                                  business.id,
                                  "plan_id",
                                  event.target.value
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
                            >
                              {plans.map((planOption) => (
                                <option key={planOption.id} value={planOption.id}>
                                  {planOption.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              Pricing
                            </label>
                            <select
                              value={edit.pricing_tier}
                              onChange={(event) =>
                                updateEdit(
                                  business.id,
                                  "pricing_tier",
                                  event.target.value
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
                            >
                              <option value="founder_beta">Founder Beta</option>
                              <option value="standard">Standard</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              Billing
                            </label>
                            <select
                              value={edit.billing_interval}
                              onChange={(event) =>
                                updateEdit(
                                  business.id,
                                  "billing_interval",
                                  event.target.value
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              Status
                            </label>
                            <select
                              value={edit.status}
                              onChange={(event) =>
                                updateEdit(
                                  business.id,
                                  "status",
                                  event.target.value
                                )
                              }
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none"
                            >
                              <option value="trial">Trial</option>
                              <option value="active">Active</option>
                              <option value="past_due">Past due</option>
                              <option value="canceled">Canceled</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              Founder Spot
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="25"
                              value={edit.founder_beta_spot_number}
                              onChange={(event) =>
                                updateEdit(
                                  business.id,
                                  "founder_beta_spot_number",
                                  event.target.value
                                )
                              }
                              placeholder="Auto"
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-gray-600"
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                          <div>
                            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                              Notes
                            </label>
                            <input
                              type="text"
                              value={edit.notes}
                              onChange={(event) =>
                                updateEdit(
                                  business.id,
                                  "notes",
                                  event.target.value
                                )
                              }
                              placeholder="Manual invoice, PayPal, Square, ACH, refund note..."
                              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none placeholder:text-gray-600"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => saveSubscription(business)}
                            className="rounded-2xl bg-emerald-400 px-5 py-3 text-sm font-black text-black transition hover:bg-emerald-300"
                          >
                            Save
                          </button>
                        </div>

                        <p className="mt-4 text-sm text-gray-500">
                          Current selected price:{" "}
                          <span className="font-bold text-white">
                            {formatMoney(price)}
                          </span>{" "}
                          / {edit.billing_interval}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {isLoading && (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 text-sm text-gray-400">
            Loading subscription foundation...
          </div>
        )}
      </div>
    </DashboardShell>
  );
}