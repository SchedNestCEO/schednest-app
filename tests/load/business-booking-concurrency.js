import http from "k6/http";
import { check } from "k6";
import { Counter } from "k6/metrics";
import { summary } from "./lib/summary.js";

if (__ENV.ALLOW_LOAD_TEST !== "true") {
  throw new Error("Set ALLOW_LOAD_TEST=true.");
}

const url = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const key = __ENV.SUPABASE_PUBLIC_KEY;
const email = __ENV.TEST_USER_EMAIL;
const password = __ENV.TEST_USER_PASSWORD;
const businessId = __ENV.CONCURRENCY_BUSINESS_ID;
const customerId = __ENV.CONCURRENCY_CUSTOMER_ID;
const serviceId = __ENV.CONCURRENCY_SERVICE_ID;
const startTime = __ENV.CONCURRENCY_START_TIME;

const requiredValues = {
  SUPABASE_URL: url,
  SUPABASE_PUBLIC_KEY: key,
  TEST_USER_EMAIL: email,
  TEST_USER_PASSWORD: password,
  CONCURRENCY_BUSINESS_ID: businessId,
  CONCURRENCY_CUSTOMER_ID: customerId,
  CONCURRENCY_SERVICE_ID: serviceId,
  CONCURRENCY_START_TIME: startTime,
};

for (const [name, value] of Object.entries(requiredValues)) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
}

const marker = `SPRINT5_CONCURRENCY_${Date.now()}`;

const bookingSuccesses = new Counter("booking_successes");
const expectedConflicts = new Counter("expected_conflicts");
const unexpectedResponses = new Counter("unexpected_responses");

export const options = {
  scenarios: {
    same_slot: {
      executor: "shared-iterations",
      vus: 5,
      iterations: 5,
      maxDuration: "30s",
    },
  },
  thresholds: {
    checks: ["rate==1"],
    booking_successes: ["count==1"],
    expected_conflicts: ["count==4"],
    unexpected_responses: ["count==0"],
    "http_req_duration{workflow:booking_concurrency_write}": ["p(95)<1500"],
  },
};

function authHeaders(token, contentType = false) {
  return {
    apikey: key,
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    ...(contentType ? { "Content-Type": "application/json" } : {}),
  };
}

function deleteTestBookings(token, testMarker) {
  return http.del(
    `${url}/rest/v1/bookings?notes=eq.${encodeURIComponent(testMarker)}`,
    null,
    {
      headers: {
        ...authHeaders(token),
        Prefer: "return=minimal",
      },
      tags: {
        product: "business",
        workflow: "booking_concurrency_cleanup",
      },
    }
  );
}

export function setup() {
  const authResponse = http.post(
    `${url}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        apikey: key,
        "Content-Type": "application/json",
      },
      tags: {
        product: "business",
        workflow: "booking_concurrency_auth",
      },
    }
  );

  if (
    !check(authResponse, {
      "authentication succeeds": (response) => response.status === 200,
    })
  ) {
    throw new Error(`Authentication failed with status ${authResponse.status}.`);
  }

  const authData = authResponse.json();
  const token = authData.access_token;

  const cleanupResponse = deleteTestBookings(token, marker);

  if (
    !check(cleanupResponse, {
      "pre-test cleanup succeeds": (response) =>
        response.status === 200 || response.status === 204,
    })
  ) {
    throw new Error(
      `Pre-test cleanup failed with status ${cleanupResponse.status}.`
    );
  }

  return {
    token,
    marker,
  };
}

export default function testSameSlot(data) {
  const response = http.post(
    `${url}/rest/v1/rpc/create_manual_booking`,
    JSON.stringify({
      p_business_id: businessId,
      p_customer_id: customerId,
      p_service_id: serviceId,
      p_start_time: startTime,
      p_status: "confirmed",
      p_source: "manual",
      p_notes: data.marker,
    }),
    {
      headers: authHeaders(data.token, true),
      tags: {
        product: "business",
        workflow: "booking_concurrency_write",
      },
    }
  );

  const body = response.body || "";
  const isSuccess = response.status === 200 || response.status === 201;
  const isExpectedConflict =
    response.status === 409 ||
    body.includes("23P01") ||
    body.includes("This time is no longer available");

  if (isSuccess) {
    bookingSuccesses.add(1);
  } else if (isExpectedConflict) {
    expectedConflicts.add(1);
  } else {
    unexpectedResponses.add(1);
  }

  check(response, {
    "response is success or expected conflict": () =>
      isSuccess || isExpectedConflict,
  });
}

export function teardown(data) {
  const countResponse = http.get(
    `${url}/rest/v1/bookings?notes=eq.${encodeURIComponent(
      data.marker
    )}&select=id`,
    {
      headers: authHeaders(data.token),
      tags: {
        product: "business",
        workflow: "booking_concurrency_verify",
      },
    }
  );

  const rows = countResponse.status === 200 ? countResponse.json() : [];

  check(countResponse, {
    "exactly one booking exists before cleanup": (response) =>
      response.status === 200 && Array.isArray(rows) && rows.length === 1,
  });

  const cleanupResponse = deleteTestBookings(data.token, data.marker);

  check(cleanupResponse, {
    "post-test cleanup succeeds": (response) =>
      response.status === 200 || response.status === 204,
  });
}

export function handleSummary(data) {
  return summary("business-booking-concurrency", data);
}
