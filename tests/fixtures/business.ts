import {
  SYNTHETIC_MARKER,
  type SyntheticIdentity,
} from "./identities";

export type SyntheticBusinessDefinition = {
  owner: SyntheticIdentity;
  profile: {
    business_name: string;
    role: "business_owner";
    plan: "complete";
    subscription_status: "active";
    booking_slug: string;
    slug: string;
    email: string;
    contact_email: string;
    timezone: "America/Los_Angeles";
    currency: "USD";
    booking_time_mode: "fixed_hours";
    business_hours_enabled: true;
    onboarding_completed: true;
    business_description: string;
  };
  service: {
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    pricing_type: "fixed";
    is_active: true;
    deposits_enabled: false;
    deposit_required: false;
    deposit_type: "fixed";
    deposit_amount: number;
    deposit_collection_method: "manual";
  };
  hours: Array<{
    day_of_week: number;
    is_open: boolean;
    is_closed: boolean;
    open_time: string | null;
    close_time: string | null;
    opens_at: string | null;
    closes_at: string | null;
  }>;
};

export function createSyntheticBusinessDefinition(
  owner: SyntheticIdentity,
  label: "a" | "b",
): SyntheticBusinessDefinition {
  const slug = `${SYNTHETIC_MARKER}-${label}-${owner.deterministicKey}`;

  return {
    owner,
    profile: {
      business_name: `SchedNest Synthetic Business ${label.toUpperCase()}`,
      role: "business_owner",
      plan: "complete",
      subscription_status: "active",
      booking_slug: slug,
      slug,
      email: owner.email,
      contact_email: owner.email,
      timezone: "America/Los_Angeles",
      currency: "USD",
      booking_time_mode: "fixed_hours",
      business_hours_enabled: true,
      onboarding_completed: true,
      business_description: SYNTHETIC_MARKER,
    },
    service: {
      name: `Synthetic Consultation ${label.toUpperCase()}`,
      description: SYNTHETIC_MARKER,
      duration_minutes: 60,
      price: 125,
      pricing_type: "fixed",
      is_active: true,
      deposits_enabled: false,
      deposit_required: false,
      deposit_type: "fixed",
      deposit_amount: 0,
      deposit_collection_method: "manual",
    },
    hours: Array.from({ length: 7 }, (_, dayOfWeek) => {
      const weekday = dayOfWeek >= 1 && dayOfWeek <= 5;

      return {
        day_of_week: dayOfWeek,
        is_open: weekday,
        is_closed: !weekday,
        open_time: weekday ? "09:00:00" : null,
        close_time: weekday ? "17:00:00" : null,
        opens_at: weekday ? "09:00:00" : null,
        closes_at: weekday ? "17:00:00" : null,
      };
    }),
  };
}
