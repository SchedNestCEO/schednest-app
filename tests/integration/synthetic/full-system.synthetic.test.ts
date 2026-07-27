import { randomUUID } from "node:crypto";
import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import {
  assertSyntheticManifestIsComplete,
  cleanupSyntheticTestData,
} from "../../fixtures/cleanup";
import { requireSyntheticTestEnvironment } from "../../fixtures/environment";
import {
  createSyntheticIdentitySet,
  type SyntheticIdentity,
} from "../../fixtures/identities";
import {
  seedSyntheticTestData,
} from "../../fixtures/seed";
import {
  createAuthenticatedSyntheticClient,
  createSyntheticSupabaseClients,
} from "../../fixtures/supabase";
import type {
  SyntheticTenantManifest,
  SyntheticTestManifest,
} from "../../fixtures/manifest";

type PublicBookingResult = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  idempotent_replay: boolean;
};

let manifest: SyntheticTestManifest;
let tenantA: SyntheticTenantManifest;
let tenantB: SyntheticTenantManifest;
let ownerAIdentity: SyntheticIdentity;
let ownerBIdentity: SyntheticIdentity;
let ownerAClient: SupabaseClient;
let ownerBClient: SupabaseClient;
let publicClient: SupabaseClient;
let adminClient: SupabaseClient;

function nextOpenWeekday(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 7);

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date.toISOString().slice(0, 10);
}

describe.sequential("SchedNest synthetic multi-tenant system", () => {
  beforeAll(async () => {
    const environment = requireSyntheticTestEnvironment();
    const identities = createSyntheticIdentitySet(
      environment.syntheticEmailDomain,
    );

    ownerAIdentity = identities["business-owner-a"];
    ownerBIdentity = identities["business-owner-b"];

    manifest = await seedSyntheticTestData();
    assertSyntheticManifestIsComplete(manifest);

    tenantA = manifest.tenants.find(
      ({ actor }) => actor === "business-owner-a",
    ) as SyntheticTenantManifest;

    tenantB = manifest.tenants.find(
      ({ actor }) => actor === "business-owner-b",
    ) as SyntheticTenantManifest;

    if (!tenantA || !tenantB) {
      throw new Error("Synthetic tenant manifests are incomplete.");
    }

    ownerAClient = await createAuthenticatedSyntheticClient(
      ownerAIdentity,
    );
    ownerBClient = await createAuthenticatedSyntheticClient(
      ownerBIdentity,
    );

    publicClient = createClient(
      environment.supabaseUrl,
      environment.publicKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    adminClient = createSyntheticSupabaseClients().admin;
  });

  afterAll(async () => {
    await ownerAClient?.auth.signOut();
    await ownerBClient?.auth.signOut();
    await cleanupSyntheticTestData();
  });

  it("allows each owner to read their own business", async () => {
    const { data: businessA, error: errorA } = await ownerAClient
      .from("business_profiles")
      .select("id, owner_id, booking_slug")
      .eq("id", tenantA.businessId)
      .single();

    expect(errorA).toBeNull();
    expect(businessA?.id).toBe(tenantA.businessId);
    expect(businessA?.owner_id).toBe(tenantA.userId);

    const { data: businessB, error: errorB } = await ownerBClient
      .from("business_profiles")
      .select("id, owner_id, booking_slug")
      .eq("id", tenantB.businessId)
      .single();

    expect(errorB).toBeNull();
    expect(businessB?.id).toBe(tenantB.businessId);
    expect(businessB?.owner_id).toBe(tenantB.userId);
  });

  it("prevents Owner A from reading Tenant B business data", async () => {
    const { data, error } = await ownerAClient
      .from("business_profiles")
      .select("id")
      .eq("id", tenantB.businessId);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("prevents Owner A from reading Tenant B customers", async () => {
    const { data: ownCustomers, error: ownError } = await ownerAClient
      .from("customers")
      .select("id, business_id")
      .eq("id", tenantA.customerId);

    expect(ownError).toBeNull();
    expect(ownCustomers).toHaveLength(1);
    expect(ownCustomers?.[0]?.business_id).toBe(tenantA.businessId);

    const { data: foreignCustomers, error: foreignError } =
      await ownerAClient
        .from("customers")
        .select("id")
        .eq("id", tenantB.customerId);

    expect(foreignError).toBeNull();
    expect(foreignCustomers).toEqual([]);
  });

  it("creates a public booking idempotently", async () => {
    const submissionKey = randomUUID();
    const bookingDate = nextOpenWeekday();

    const parameters = {
      p_business_id: tenantA.businessId,
      p_service_id: tenantA.serviceId,
      p_customer_name: "Synthetic Public Booking Customer",
      p_customer_phone: "+15555550155",
      p_customer_email: "public-booking@example.test",
      p_local_date: bookingDate,
      p_local_time: "10:00:00",
      p_submission_key: submissionKey,
      p_notes: "schednest-sprint7-synthetic",
      p_intake_answers: {
        source: "sprint7-synthetic-integration",
      },
    };

    const first = await publicClient.rpc(
      "create_public_booking_with_intake_local_idempotent",
      parameters,
    );

    expect(first.error).toBeNull();

    const firstResult = first.data as PublicBookingResult;

    expect(firstResult.id).toBeTruthy();
    expect(firstResult.idempotent_replay).toBe(false);

    const second = await publicClient.rpc(
      "create_public_booking_with_intake_local_idempotent",
      parameters,
    );

    expect(second.error).toBeNull();

    const secondResult = second.data as PublicBookingResult;

    expect(secondResult.id).toBe(firstResult.id);
    expect(secondResult.idempotent_replay).toBe(true);

    const { data: persistedBooking, error: persistedError } =
      await adminClient
        .from("bookings")
        .select(
          "id, business_id, service_id, customer_email, submission_key",
        )
        .eq("id", firstResult.id)
        .single();

    expect(persistedError).toBeNull();
    expect(persistedBooking).toMatchObject({
      id: firstResult.id,
      business_id: tenantA.businessId,
      service_id: tenantA.serviceId,
      customer_email: "public-booking@example.test",
      submission_key: submissionKey,
    });
  });
});
