import { NextResponse } from "next/server";
import {
  BillingInterval,
  PlanKey,
  getStripePriceId,
  isBillingInterval,
  isPlanKey,
  stripe,
} from "../../../lib/stripe/billing";
import {
  createAdminClient,
  createAuthenticatedRouteClient,
} from "../../../lib/supabase/admin";

type CheckoutBody = {
  planKey?: unknown;
  billingInterval?: unknown;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";

  return authHeader.replace("Bearer ", "").trim();
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing authorization token." },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as CheckoutBody | null;

    if (!body || !isPlanKey(body.planKey)) {
      return NextResponse.json(
        { error: "Invalid or missing planKey." },
        { status: 400 }
      );
    }

    if (!isBillingInterval(body.billingInterval)) {
      return NextResponse.json(
        { error: "Invalid or missing billingInterval." },
        { status: 400 }
      );
    }

    const planKey: PlanKey = body.planKey;
    const billingInterval: BillingInterval = body.billingInterval;

    const userClient = createAuthenticatedRouteClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to start checkout." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const { data: business, error: businessError } = await adminClient
      .from("business_profiles")
      .select("id, owner_id, business_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Create a business profile before starting checkout." },
        { status: 400 }
      );
    }

    const { data: subscription } = await adminClient
      .from("business_subscriptions")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle();

    const hasFounderBeta =
      subscription?.founder_beta_spot === true ||
      subscription?.pricing_tier === "founder" ||
      subscription?.pricing_tier === "founder_beta";

    const pricingTier = hasFounderBeta ? "founder" : "standard";
    const priceId = getStripePriceId(planKey, billingInterval, pricingTier);

    const existingCustomerId =
      typeof subscription?.stripe_customer_id === "string"
        ? subscription.stripe_customer_id
        : null;

    const siteUrl = getSiteUrl();

    const metadata = {
      business_id: business.id,
      user_id: user.id,
      plan_key: planKey,
      billing_interval: billingInterval,
      pricing_tier: pricingTier,
    };

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: existingCustomerId || undefined,
      customer_email: existingCustomerId ? undefined : user.email || undefined,
      client_reference_id: business.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      success_url: `${siteUrl}/dashboard/account?checkout=success`,
      cancel_url: `${siteUrl}/dashboard/account?checkout=cancelled`,
      metadata,
      subscription_data: {
        metadata,
      },
    });

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not create checkout.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}