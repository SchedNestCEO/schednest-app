import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { requireSyntheticTestEnvironment } from "./environment";

const originalEnvironment = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnvironment };
  vi.unstubAllEnvs();
});

function applySafeEnvironment() {
  vi.stubEnv("NODE_ENV", "test");
  process.env.SCHEDNEST_ALLOW_SYNTHETIC_TEST_DATA = "true";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-public-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  process.env.SCHEDNEST_SYNTHETIC_EMAIL_DOMAIN = "example.test";
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.RESEND_API_KEY;
}

describe("requireSyntheticTestEnvironment", () => {
  it("accepts an explicitly enabled local test environment", () => {
    applySafeEnvironment();

    expect(requireSyntheticTestEnvironment()).toMatchObject({
      supabaseUrl: "http://127.0.0.1:54321/",
      syntheticEmailDomain: "example.test",
    });
  });

  it("rejects execution without the destructive-test flag", () => {
    applySafeEnvironment();
    delete process.env.SCHEDNEST_ALLOW_SYNTHETIC_TEST_DATA;

    expect(() => requireSyntheticTestEnvironment()).toThrow(
      /SCHEDNEST_ALLOW_SYNTHETIC_TEST_DATA=true/,
    );
  });

  it("rejects an unapproved remote Supabase project", () => {
    applySafeEnvironment();
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      "https://production-project.supabase.co";

    expect(() => requireSyntheticTestEnvironment()).toThrow(
      /explicitly approved test Supabase project/,
    );
  });

  it("rejects Stripe live-mode keys", () => {
    applySafeEnvironment();
    process.env.STRIPE_SECRET_KEY = "sk_live_not_allowed";

    expect(() => requireSyntheticTestEnvironment()).toThrow(
      /Stripe test-mode secret key/,
    );
  });
});
