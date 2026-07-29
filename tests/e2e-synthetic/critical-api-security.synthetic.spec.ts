import {
  expect,
  test,
  type APIRequestContext,
} from "@playwright/test";
import {
  isPlanKey,
  type PlanKey,
} from "../../app/lib/stripe/billing";

const INVALID_TOKEN = "schednest-invalid-access-token";
const INVALID_STRIPE_SIGNATURE =
  "t=1720000000,v1=invalid-synthetic-signature";

const CHECKOUT_PLAN_CANDIDATES = [
  "solo",
  "business",
  "teams",
  "starter",
  "professional",
  "growth",
] as const;

const VALID_CHECKOUT_PLAN = CHECKOUT_PLAN_CANDIDATES.find(
  (candidate) => isPlanKey(candidate),
);

if (!VALID_CHECKOUT_PLAN) {
  throw new Error(
    "Synthetic checkout test could not resolve a valid plan key.",
  );
}

const CHECKOUT_PLAN_KEY: PlanKey = VALID_CHECKOUT_PLAN;

async function expectJsonError(
  response: Awaited<ReturnType<APIRequestContext["post"]>>,
  expectedStatus: number,
  expectedMessage: string,
) {
  expect(response.status()).toBe(expectedStatus);

  const body = (await response.json()) as {
    error?: unknown;
  };

  expect(body.error).toBe(expectedMessage);
}

test.describe.serial(
  "critical API security boundaries",
  () => {
    test(
      "checkout rejects missing and invalid authentication",
      async ({ request }) => {
        const missingAuth = await request.post(
          "/api/stripe/create-checkout-session",
          {
            data: {
              planKey: CHECKOUT_PLAN_KEY,
              billingInterval: "monthly",
            },
          },
        );

        await expectJsonError(
          missingAuth,
          401,
          "Missing authorization token.",
        );

        const invalidAuth = await request.post(
          "/api/stripe/create-checkout-session",
          {
            headers: {
              authorization: `Bearer ${INVALID_TOKEN}`,
            },
            data: {
              planKey: CHECKOUT_PLAN_KEY,
              billingInterval: "monthly",
            },
          },
        );

        await expectJsonError(
          invalidAuth,
          401,
          "You must be logged in to start checkout.",
        );
      },
    );

    test(
      "billing portal rejects missing and invalid authentication",
      async ({ request }) => {
        const missingAuth = await request.post(
          "/api/stripe/create-billing-portal-session",
        );

        await expectJsonError(
          missingAuth,
          401,
          "Missing authorization token.",
        );

        const invalidAuth = await request.post(
          "/api/stripe/create-billing-portal-session",
          {
            headers: {
              authorization: `Bearer ${INVALID_TOKEN}`,
            },
          },
        );

        await expectJsonError(
          invalidAuth,
          401,
          "You must be logged in to manage billing.",
        );
      },
    );

    test(
      "Stripe webhook rejects missing and invalid signatures",
      async ({ request }) => {
        const missingSignature = await request.post(
          "/api/stripe/webhook",
          {
            data: {
              id: "evt_schednest_synthetic",
              type: "customer.subscription.updated",
            },
          },
        );

        await expectJsonError(
          missingSignature,
          400,
          "Missing Stripe signature.",
        );

        const invalidSignature = await request.post(
          "/api/stripe/webhook",
          {
            headers: {
              "content-type": "application/json",
              "stripe-signature": INVALID_STRIPE_SIGNATURE,
            },
            data: {
              id: "evt_schednest_synthetic",
              type: "customer.subscription.updated",
            },
          },
        );

        expect(invalidSignature.status()).toBe(400);

        const body = (await invalidSignature.json()) as {
          error?: unknown;
        };

        expect(typeof body.error).toBe("string");
        expect(String(body.error).length).toBeGreaterThan(0);
      },
    );

    test(
      "booking reminders reject missing and invalid cron secrets",
      async ({ request }) => {
        const missingSecret = await request.get(
          "/api/booking-reminders",
        );

        await expectJsonError(
          missingSecret,
          401,
          "Unauthorized.",
        );

        const invalidBearer = await request.get(
          "/api/booking-reminders",
          {
            headers: {
              authorization:
                "Bearer schednest-invalid-reminder-secret",
            },
          },
        );

        await expectJsonError(
          invalidBearer,
          401,
          "Unauthorized.",
        );

        const invalidQuery = await request.get(
          "/api/booking-reminders" +
            "?secret=schednest-invalid-reminder-secret",
        );

        await expectJsonError(
          invalidQuery,
          401,
          "Unauthorized.",
        );
      },
    );

    test(
      "booking notifications validate input and owner authorization",
      async ({ request }) => {
        const missingBody = await request.post(
          "/api/booking-notifications",
          {
            data: {},
          },
        );

        await expectJsonError(
          missingBody,
          400,
          "bookingId and eventType are required.",
        );

        const invalidEvent = await request.post(
          "/api/booking-notifications",
          {
            data: {
              bookingId: "00000000-0000-0000-0000-000000000000",
              eventType: "booking.invalid",
            },
          },
        );

        await expectJsonError(
          invalidEvent,
          400,
          "Invalid eventType.",
        );
      },
    );
  },
);
