import Stripe from "stripe";

export type PlanKey = "essentials" | "growth" | "complete";
export type BillingInterval = "monthly" | "annual";
export type PricingTier = "founder" | "standard";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY.");
}

export const stripe = new Stripe(stripeSecretKey);

type PriceMap = Record<
  PricingTier,
  Record<PlanKey, Record<BillingInterval, string | undefined>>
>;

const stripePriceMap: PriceMap = {
  founder: {
    essentials: {
      monthly: process.env.STRIPE_FOUNDER_ESSENTIALS_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_FOUNDER_ESSENTIALS_ANNUAL_PRICE_ID,
    },
    growth: {
      monthly: process.env.STRIPE_FOUNDER_GROWTH_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_FOUNDER_GROWTH_ANNUAL_PRICE_ID,
    },
    complete: {
      monthly: process.env.STRIPE_FOUNDER_COMPLETE_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_FOUNDER_COMPLETE_ANNUAL_PRICE_ID,
    },
  },
  standard: {
    essentials: {
      monthly: process.env.STRIPE_STANDARD_ESSENTIALS_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_STANDARD_ESSENTIALS_ANNUAL_PRICE_ID,
    },
    growth: {
      monthly: process.env.STRIPE_STANDARD_GROWTH_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_STANDARD_GROWTH_ANNUAL_PRICE_ID,
    },
    complete: {
      monthly: process.env.STRIPE_STANDARD_COMPLETE_MONTHLY_PRICE_ID,
      annual: process.env.STRIPE_STANDARD_COMPLETE_ANNUAL_PRICE_ID,
    },
  },
};

export function isPlanKey(value: unknown): value is PlanKey {
  return value === "essentials" || value === "growth" || value === "complete";
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "annual";
}

export function getStripePriceId(
  planKey: PlanKey,
  billingInterval: BillingInterval,
  pricingTier: PricingTier
) {
  const priceId = stripePriceMap[pricingTier][planKey][billingInterval];

  if (!priceId) {
    throw new Error(
      `Missing Stripe price ID for ${pricingTier} ${planKey} ${billingInterval}.`
    );
  }

  return priceId;
}

export function getPriceMetadata(priceId: string) {
  const tiers: PricingTier[] = ["founder", "standard"];
  const plans: PlanKey[] = ["essentials", "growth", "complete"];
  const intervals: BillingInterval[] = ["monthly", "annual"];

  for (const pricingTier of tiers) {
    for (const planKey of plans) {
      for (const billingInterval of intervals) {
        if (stripePriceMap[pricingTier][planKey][billingInterval] === priceId) {
          return {
            pricingTier,
            planKey,
            billingInterval,
          };
        }
      }
    }
  }

  return null;
}