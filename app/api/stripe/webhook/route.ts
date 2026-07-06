import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getPriceMetadata, stripe } from "../../../lib/stripe/billing";
import { createAdminClient } from "../../../lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeSubscriptionWithPeriod = Stripe.Subscription & {
  current_period_end?: number;
  current_period?: {
    end?: number;
  };
  latest_invoice?: string | Stripe.Invoice | null;
};

type StripeSubscriptionItemWithPeriod = Stripe.SubscriptionItem & {
  current_period_end?: number;
  current_period?: {
    end?: number;
  };
};

type StripeInvoiceWithLines = Stripe.Invoice & {
  lines?: {
    data?: Array<
      Stripe.InvoiceLineItem & {
        period?: {
          end?: number | null;
        };
      }
    >;
  };
};

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

function getPeriodEndFromInvoice(invoice: Stripe.Invoice | null | undefined) {
  const invoiceWithLines = invoice as StripeInvoiceWithLines | null | undefined;
  const firstLinePeriodEnd = invoiceWithLines?.lines?.data?.[0]?.period?.end;

  return typeof firstLinePeriodEnd === "number" ? firstLinePeriodEnd : null;
}

async function getCurrentPeriodEnd(subscription: Stripe.Subscription) {
  const subscriptionWithPeriod = subscription as StripeSubscriptionWithPeriod;

  const firstItem = subscription.items
    .data[0] as StripeSubscriptionItemWithPeriod | undefined;

  const directPeriodEnd =
    subscriptionWithPeriod.current_period_end ||
    subscriptionWithPeriod.current_period?.end ||
    firstItem?.current_period_end ||
    firstItem?.current_period?.end ||
    null;

  if (typeof directPeriodEnd === "number") {
    return directPeriodEnd;
  }

  const latestInvoice = subscriptionWithPeriod.latest_invoice;

  if (latestInvoice && typeof latestInvoice !== "string") {
    const invoicePeriodEnd = getPeriodEndFromInvoice(latestInvoice);

    if (typeof invoicePeriodEnd === "number") {
      return invoicePeriodEnd;
    }
  }

  if (typeof latestInvoice === "string") {
    const invoice = await stripe.invoices.retrieve(latestInvoice, {
      expand: ["lines"],
    });

    const invoicePeriodEnd = getPeriodEndFromInvoice(invoice);

    if (typeof invoicePeriodEnd === "number") {
      return invoicePeriodEnd;
    }
  }

  return null;
}

async function retrieveExpandedSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice.lines"],
  });
}

async function findPlanId(planKey: string) {
  const adminClient = createAdminClient();

  const { data: planById, error: planByIdError } = await adminClient
    .from("subscription_plans")
    .select("id, name")
    .eq("id", planKey)
    .maybeSingle();

  if (planByIdError) {
    throw new Error(`Could not look up plan by id: ${planByIdError.message}`);
  }

  if (planById?.id) {
    return planById.id;
  }

  const { data: planByName, error: planByNameError } = await adminClient
    .from("subscription_plans")
    .select("id, name")
    .ilike("name", planKey)
    .maybeSingle();

  if (planByNameError) {
    throw new Error(
      `Could not look up plan by name: ${planByNameError.message}`
    );
  }

  return planByName?.id || null;
}

async function findBusinessIdFromStripe(
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
) {
  if (!stripeCustomerId && !stripeSubscriptionId) return null;

  const adminClient = createAdminClient();

  if (stripeSubscriptionId) {
    const { data, error } = await adminClient
      .from("business_subscriptions")
      .select("business_id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Could not find business by Stripe subscription: ${error.message}`
      );
    }

    if (data?.business_id) {
      return data.business_id;
    }
  }

  if (stripeCustomerId) {
    const { data, error } = await adminClient
      .from("business_subscriptions")
      .select("business_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Could not find business by Stripe customer: ${error.message}`
      );
    }

    if (data?.business_id) {
      return data.business_id;
    }
  }

  return null;
}

function getMetadataValue(
  primary: Stripe.Metadata | undefined,
  fallback: Stripe.Metadata | null | undefined,
  key: string
) {
  return primary?.[key] || fallback?.[key] || null;
}

async function findOwnerIdForBusiness(businessId: string) {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("business_profiles")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not look up business owner: ${error.message}`);
  }

  return data?.owner_id || null;
}

async function syncSubscriptionToSupabase(
  subscription: Stripe.Subscription,
  fallbackMetadata?: Stripe.Metadata | null
) {
  const adminClient = createAdminClient();

  const stripeCustomerId = getStripeCustomerId(subscription);
  const stripeSubscriptionId = subscription.id;
  const stripePriceId = getStripePriceId(subscription);

  if (!stripePriceId) {
    throw new Error("Stripe subscription is missing a price ID.");
  }

  const stripePriceMetadata = getPriceMetadata(stripePriceId);

  const businessId =
    getMetadataValue(subscription.metadata, fallbackMetadata, "business_id") ||
    (await findBusinessIdFromStripe(stripeCustomerId, stripeSubscriptionId));

  if (!businessId) {
    throw new Error(
      `Missing business_id. Subscription=${stripeSubscriptionId}, Customer=${stripeCustomerId}, Price=${stripePriceId}`
    );
  }

  const ownerId =
    getMetadataValue(subscription.metadata, fallbackMetadata, "user_id") ||
    (await findOwnerIdForBusiness(businessId));

  if (!ownerId) {
    throw new Error(`Missing owner_id for business ${businessId}`);
  }

  const planKey =
    stripePriceMetadata?.planKey ||
    getMetadataValue(subscription.metadata, fallbackMetadata, "plan_key");

  if (!planKey) {
    throw new Error(`Could not determine plan for Stripe price ${stripePriceId}`);
  }

  const billingInterval =
    stripePriceMetadata?.billingInterval ||
    getMetadataValue(
      subscription.metadata,
      fallbackMetadata,
      "billing_interval"
    );

  if (!billingInterval) {
    throw new Error(
      `Could not determine billing interval for Stripe price ${stripePriceId}`
    );
  }

  const pricingTier =
    stripePriceMetadata?.pricingTier ||
    getMetadataValue(subscription.metadata, fallbackMetadata, "pricing_tier") ||
    "standard";

  const planId = await findPlanId(planKey);

  if (!planId) {
    throw new Error(`No matching subscription plan found for ${planKey}`);
  }

  const currentPeriodEnd = await getCurrentPeriodEnd(subscription);

  const payload = {
    business_id: businessId,
    owner_id: ownerId,
    plan_id: planId,
    status: subscription.status,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_price_id: stripePriceId,
    billing_interval: billingInterval,
    pricing_tier: pricingTier === "founder" ? "founder_beta" : "standard",
    founder_beta_spot: pricingTier === "founder",
    current_period_end: unixToIso(currentPeriodEnd),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error } = await adminClient
    .from("business_subscriptions")
    .upsert(payload, {
      onConflict: "business_id",
    });

  if (error) {
    throw new Error(`Failed to sync Stripe subscription: ${error.message}`);
  }
}

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "subscription") {
    return;
  }

  if (typeof session.subscription !== "string") {
    throw new Error("Checkout session is missing subscription ID.");
  }

  const subscription = await retrieveExpandedSubscription(session.subscription);

  const fallbackMetadata: Stripe.Metadata = {
    ...(session.metadata || {}),
  };

  if (!fallbackMetadata.business_id && session.client_reference_id) {
    fallbackMetadata.business_id = session.client_reference_id;
  }

  await syncSubscriptionToSupabase(subscription, fallbackMetadata);
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
      await handleCheckoutSessionCompleted(session);
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscriptionEvent = event.data.object as Stripe.Subscription;
      const subscription = await retrieveExpandedSubscription(
        subscriptionEvent.id
      );

      await syncSubscriptionToSupabase(subscription);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}