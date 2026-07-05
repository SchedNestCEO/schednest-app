import { NextResponse } from "next/server";
import { stripe } from "../../../lib/stripe/billing";
import {
  createAdminClient,
  createAuthenticatedRouteClient,
} from "../../../lib/supabase/admin";

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

    const userClient = createAuthenticatedRouteClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to manage billing." },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    const { data: business, error: businessError } = await adminClient
      .from("business_profiles")
      .select("id, owner_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Create a business profile before opening billing." },
        { status: 400 }
      );
    }

    const { data: subscription, error: subscriptionError } = await adminClient
      .from("business_subscriptions")
      .select("stripe_customer_id")
      .eq("business_id", business.id)
      .maybeSingle();

    if (subscriptionError || !subscription?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No Stripe customer found for this business yet." },
        { status: 400 }
      );
    }

    const siteUrl = getSiteUrl();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/dashboard/account`,
    });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not create billing portal session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}