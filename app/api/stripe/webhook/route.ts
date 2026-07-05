import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPriceMetadata, stripe } from "../../../lib/stripe/billing";
import { createAdminClient } from "../../../lib/supabase/admin";

export const runtime = "nodejs";

function unixToIso(value: unknown) {
  if (typeof value !== "number") return null;

  return new Date(value * 1000).toISOString();
}

function getStripeCustomerId(subscription: Stripe.Subscription) {
  if (typeof subscription.customer === "string") {
    return subscription.customer;
  }

  return subscription.customer?.id || null;
}

function getStripePriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price?.id || null;
}

async function findPlanId(planKey: string) {
  const adminClient = createAdminClient();

  const { data: plan } = await adminClient
    .from("subscription_plans")
    .select("id, name")
    .ilike("name", planKey)
    .maybeSingle();

  return plan?.id || null;
}

async function findBusinessIdFromStripe(
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
) {
  if (!stripeCustomerId && !stripeSubscriptionId) return null;

  const adminClient = createAdminClient();

  let query = adminClient
    .from("business_subscriptions")
    .select("business_id")
    .limit(1);

  if (stripeSubscriptionId) {
    query = query.eq("stripe_subscription_id", stripeSubscriptionId);
  } else if (stripeCustomerId) {
    query = query.eq("stripe_customer_id", stripeCustomerId);
  }

  const { data } = await query.maybeSingle();

  return data?.business_id || null;
}

async function syncSubscriptionToSupabase(
  subscription: Stripe.Subscription,
  fallbackMetadata?: Stripe.Metadata | null
) {
  const adminClient = createAdminClient();

  const stripeCustomerId = getStripeCustomerId(subscription);
  const stripeSubscriptionId = subscription.id;
  const stripePriceId = getStripePriceId(subscription);

  const stripePriceMetadata = stripePriceId
    ? getPriceMetadata(stripePriceId)
    : null;

  const businessId =
    subscription.metadata.business_id ||
    fallbackMetadata?.business_id ||
    (await findBusinessIdFromStripe(stripeCustomerId, stripeSubscriptionId));

  if (!businessId) {
    console.warn("Stripe webhook ignored: missing business_id.");
    return;
  }

  const planKey =
    stripePriceMetadata?.planKey ||
    subscription.metadata.plan_key ||
    fallbackMetadata?.plan_key ||
    null;

  const billingInterval =
    stripePriceMetadata?.billingInterval ||
    subscription.metadata.billing_interval ||
    fallbackMetadata?.billing_interval ||
    null;

  const pricingTier =
    stripePriceMetadata?.pricingTier ||
    subscription.metadata.pricing_tier ||
    fallbackMetadata?.pricing_tier ||
    "standard";

  const planId = planKey ? await findPlanId(planKey) : null;

  const subscriptionWithPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number;
  };

  const payload: Record<string, unknown> = {
    business_id: businessId,
    status: subscription.status,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: stripePriceId,
    billing_interval: billingInterval,
    pricing_tier: pricingTier === "founder" ? "founder_beta" : "standard",
    founder_beta_spot: pricingTier === "founder",
    current_period_end: unixToIso(subscriptionWithPeriod.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  if (planId) {
    payload.plan_id = planId;
  }

  const { error } = await adminClient
    .from("business_subscriptions")
    .upsert(payload, {
      onConflict: "business_id",
    });

  if (error) {
    console.error("Failed to sync Stripe subscription:", error.message);
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook verification failed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (
        session.mode === "subscription" &&
        typeof session.subscription === "string"
      ) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );

        await syncSubscriptionToSupabase(subscription, session.metadata);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      await syncSubscriptionToSupabase(subscription);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}