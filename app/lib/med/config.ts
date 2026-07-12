export const medProductConfig = {
  publicLaunch: false,
  name: "SchedNest Med",
  audience: "patients-and-caregivers",
  pricing: {
    currency: "USD",
    monthly: 2.99,
    annual: 29.99,
  },
} as const;

export type MedBillingInterval = "monthly" | "annual";
