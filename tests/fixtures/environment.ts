const REQUIRED_TEST_FLAG = "SCHEDNEST_ALLOW_SYNTHETIC_TEST_DATA";
const REQUIRED_TEST_FLAG_VALUE = "true";

export type SyntheticTestEnvironment = {
  supabaseUrl: string;
  publicKey: string;
  serviceRoleKey: string;
  syntheticEmailDomain: string;
  stripeSecretKey: string | null;
};

function requireEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Synthetic test environment is missing ${name}.`);
  }

  return value;
}

function isLocalSupabaseUrl(url: URL): boolean {
  return (
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "host.docker.internal"
  );
}

function isExplicitlyApprovedRemoteProject(url: URL): boolean {
  const approvedProject = process.env.SCHEDNEST_TEST_SUPABASE_PROJECT?.trim();

  if (!approvedProject) {
    return false;
  }

  return (
    url.hostname === `${approvedProject}.supabase.co` &&
    process.env.SCHEDNEST_TEST_ENVIRONMENT === "true"
  );
}

function validateSyntheticEmailDomain(domain: string): void {
  if (
    !domain.endsWith(".test") &&
    domain !== "example.com" &&
    domain !== "example.test"
  ) {
    throw new Error(
      "SCHEDNEST_SYNTHETIC_EMAIL_DOMAIN must use a reserved test domain.",
    );
  }
}

export function requireSyntheticTestEnvironment(): SyntheticTestEnvironment {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Synthetic tests cannot run with NODE_ENV=production.");
  }

  if (
    process.env[REQUIRED_TEST_FLAG]?.toLowerCase() !==
    REQUIRED_TEST_FLAG_VALUE
  ) {
    throw new Error(
      `Set ${REQUIRED_TEST_FLAG}=${REQUIRED_TEST_FLAG_VALUE} to permit synthetic test data.`,
    );
  }

  const supabaseUrlValue = requireEnvironmentValue(
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const supabaseUrl = new URL(supabaseUrlValue);

  if (
    !isLocalSupabaseUrl(supabaseUrl) &&
    !isExplicitlyApprovedRemoteProject(supabaseUrl)
  ) {
    throw new Error(
      "Synthetic tests require local Supabase or an explicitly approved test Supabase project.",
    );
  }

  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!publicKey) {
    throw new Error(
      "Synthetic tests require NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const serviceRoleKey = requireEnvironmentValue(
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const syntheticEmailDomain = requireEnvironmentValue(
    "SCHEDNEST_SYNTHETIC_EMAIL_DOMAIN",
  );

  validateSyntheticEmailDomain(syntheticEmailDomain);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim() || null;

  if (stripeSecretKey && !stripeSecretKey.startsWith("sk_test_")) {
    throw new Error(
      "Synthetic payment tests require a Stripe test-mode secret key.",
    );
  }

  if (process.env.RESEND_API_KEY && !process.env.SCHEDNEST_INTERCEPT_EMAIL) {
    throw new Error(
      "Synthetic tests refuse to run with live email enabled. Set SCHEDNEST_INTERCEPT_EMAIL=true.",
    );
  }

  return {
    supabaseUrl: supabaseUrl.toString(),
    publicKey,
    serviceRoleKey,
    syntheticEmailDomain,
    stripeSecretKey,
  };
}
