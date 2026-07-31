import { stripe } from "./billing";
import { createAdminClient } from "../supabase/admin";

type CreateDepositCheckoutParams = {
  businessId: string;
  serviceId: string;
  bookingId?: string;
  customerEmail?: string;
  depositAmountCents: number;
  successUrl: string;
  cancelUrl: string;
};

export async function createDepositCheckoutSession({
  businessId,
  serviceId,
  bookingId,
  customerEmail,
  depositAmountCents,
  successUrl,
  cancelUrl,
}: CreateDepositCheckoutParams) {
  const supabase = createAdminClient();

  // Get business Stripe account
  const { data: business } = await supabase
    .from("business_profiles")
    .select("stripe_account_id, business_name")
    .eq("id", businessId)
    .single();

  if (!business?.stripe_account_id) {
    throw new Error("Business has not connected a Stripe account yet.");
  }

  const { data: service } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .single();

  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Deposit for ${service?.name || "Service"}`,
              metadata: {
                service_id: serviceId,
              },
            },
            unit_amount: depositAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        business_id: businessId,
        booking_id: bookingId || "",
        type: "deposit",
      },
      payment_intent_data: {
        application_fee_amount: Math.round(depositAmountCents * 0.05),
        metadata: {
          business_id: businessId,
          booking_id: bookingId || "",
          service_id: serviceId,
          type: "deposit",
        },
      },
    },
    {
      stripeAccount: business.stripe_account_id,
    },
  );

  return session;
}
