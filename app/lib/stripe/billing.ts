import Stripe from "stripe";

export type PlanKey = "essentials" | "growth" | "complete";
export type BillingInterval = "monthly" | "annual";
export type PricingTier = "founder" | "standard";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY.");
}

export const stripe = new Stripe(stripeSecretKey);

type PriceEnvMap = Record<
  PricingTier,
  Record<PlanKey, Record<BillingInterval, string>>
>;

const priceEnvMap: PriceEnvMap = {
  founder: {
    essentials: {
      monthly: "STRIPE_FOUNDER_ESSENTIALS_MONTHLY_PRICE_ID",
      annual: "STRIPE_FOUNDER_ESSENTIALS_ANNUAL_PRICE_ID",
    },
    growth: {
      monthly: "STRIPE_FOUNDER_GROWTH_MONTHLY_PRICE_ID",
      annual: "STRIPE_FOUNDER_GROWTH_ANNUAL_PRICE_ID",
    },
    complete: {
      monthly: "STRIPE_FOUNDER_COMPLETE_MONTHLY_PRICE_ID",
      annual: "STRIPE_FOUNDER_COMPLETE_ANNUAL_PRICE_ID",
    },
  },
  standard: {
    essentials: {
      monthly: "STRIPE_STANDARD_ESSENTIALS_MONTHLY_PRICE_ID",
      annual: "STRIPE_STANDARD_ESSENTIALS_ANNUAL_PRICE_ID",
    },
    growth: {
      monthly: "STRIPE_STANDARD_GROWTH_MONTHLY_PRICE_ID",
      annual: "STRIPE_STANDARD_GROWTH_ANNUAL_PRICE_ID",
    },
    complete: {
      monthly: "STRIPE_STANDARD_COMPLETE_MONTHLY_PRICE_ID",
      annual: "STRIPE_STANDARD_COMPLETE_ANNUAL_PRICE_ID",
    },
  },
};

function readPriceEnv(
  pricingTier: PricingTier,
  planKey: PlanKey,
  billingInterval: BillingInterval
) {
  const envName = priceEnvMap[pricingTier][planKey][billingInterval];
  const value = process.env[envName];

  if (!value) {
    throw new Error(`Missing Stripe price ID env variable: ${envName}`);
  }

  if (value === "price_REPLACE_ME" || value.includes("REPLACE_ME")) {
    throw new Error(`Stripe price ID still has placeholder value: ${envName}`);
  }

  if (!value.startsWith("price_")) {
    throw new Error(
      `Invalid Stripe price ID for ${envName}. Expected value to start with price_.`
    );
  }

  return value;
}

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
  return readPriceEnv(pricingTier, planKey, billingInterval);
}

export function getPriceMetadata(priceId: string) {
  const tiers: PricingTier[] = ["founder", "standard"];
  const plans: PlanKey[] = ["essentials", "growth", "complete"];
  const intervals: BillingInterval[] = ["monthly", "annual"];

  for (const pricingTier of tiers) {
    for (const planKey of plans) {
      for (const billingInterval of intervals) {
        const envName = priceEnvMap[pricingTier][planKey][billingInterval];

        if (process.env[envName] === priceId) {
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