import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createSyntheticBusinessDefinition,
  type SyntheticBusinessDefinition,
} from "./business";
import { createSyntheticCustomerDefinition } from "./customers";
import {
  createSyntheticIdentitySet,
  SYNTHETIC_MARKER,
  type SyntheticIdentity,
} from "./identities";
import {
  createEmptySyntheticManifest,
  writeSyntheticManifest,
  type SyntheticTenantManifest,
  type SyntheticTestManifest,
} from "./manifest";
import {
  createSyntheticSupabaseClients,
  ensureSyntheticAuthUser,
} from "./supabase";

type SyntheticTenantLabel = "a" | "b";

type SeededBusinessProfile = {
  id: string;
  booking_slug: string;
};

type SeededRecord = {
  id: string;
};

async function seedBusinessProfile(
  admin: SupabaseClient,
  user: User,
  definition: SyntheticBusinessDefinition,
): Promise<SeededBusinessProfile> {
  const { data, error } = await admin
    .from("business_profiles")
    .upsert(
      {
        owner_id: user.id,
        ...definition.profile,
      },
      {
        onConflict: "owner_id",
      },
    )
    .select("id, booking_slug")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to seed business profile for ${definition.owner.actor}: ${
        error?.message || "No profile returned"
      }`,
    );
  }

  return data as SeededBusinessProfile;
}

async function seedService(
  admin: SupabaseClient,
  user: User,
  businessId: string,
  definition: SyntheticBusinessDefinition,
): Promise<SeededRecord> {
  const { data: existing, error: existingError } = await admin
    .from("services")
    .select("id")
    .eq("business_id", businessId)
    .eq("description", SYNTHETIC_MARKER)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to locate synthetic service: ${existingError.message}`,
    );
  }

  if (existing) {
    const { data, error } = await admin
      .from("services")
      .update({
        owner_id: user.id,
        business_id: businessId,
        ...definition.service,
      })
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `Unable to update synthetic service: ${
          error?.message || "No service returned"
        }`,
      );
    }

    return data as SeededRecord;
  }

  const { data, error } = await admin
    .from("services")
    .insert({
      owner_id: user.id,
      business_id: businessId,
      ...definition.service,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to create synthetic service: ${
        error?.message || "No service returned"
      }`,
    );
  }

  return data as SeededRecord;
}

async function seedBusinessHours(
  admin: SupabaseClient,
  user: User,
  businessId: string,
  definition: SyntheticBusinessDefinition,
): Promise<void> {
  const rows = definition.hours.map((hours) => ({
    owner_id: user.id,
    business_id: businessId,
    ...hours,
  }));

  const { error } = await admin
    .from("business_hours")
    .upsert(rows, {
      onConflict: "business_id,day_of_week",
    });

  if (error) {
    throw new Error(
      `Unable to seed business hours for ${definition.owner.actor}: ${error.message}`,
    );
  }
}

async function seedCustomer(
  admin: SupabaseClient,
  user: User,
  businessId: string,
  identity: SyntheticIdentity,
  label: SyntheticTenantLabel,
): Promise<SeededRecord> {
  const definition = createSyntheticCustomerDefinition(identity, label);

  const { data: existing, error: existingError } = await admin
    .from("customers")
    .select("id")
    .eq("business_id", businessId)
    .eq("email", definition.email)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Unable to locate synthetic customer: ${existingError.message}`,
    );
  }

  const values = {
    business_id: businessId,
    owner_id: user.id,
    full_name: definition.full_name,
    name: definition.name,
    email: definition.email,
    phone: definition.phone,
    notes: definition.notes,
    source: definition.source,
    status: definition.status,
    preferred_language: definition.preferred_language,
  };

  if (existing) {
    const { data, error } = await admin
      .from("customers")
      .update(values)
      .eq("id", existing.id)
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `Unable to update synthetic customer: ${
          error?.message || "No customer returned"
        }`,
      );
    }

    return data as SeededRecord;
  }

  const { data, error } = await admin
    .from("customers")
    .insert(values)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to create synthetic customer: ${
        error?.message || "No customer returned"
      }`,
    );
  }

  return data as SeededRecord;
}

async function seedTenant(
  admin: SupabaseClient,
  identities: ReturnType<typeof createSyntheticIdentitySet>,
  ownerActor: "business-owner-a" | "business-owner-b",
  customerActor: "public-customer-a" | "public-customer-b",
  label: SyntheticTenantLabel,
): Promise<SyntheticTenantManifest> {
  const ownerIdentity = identities[ownerActor];
  const customerIdentity = identities[customerActor];

  const user = await ensureSyntheticAuthUser(admin, ownerIdentity);

  try {
    const definition = createSyntheticBusinessDefinition(
      ownerIdentity,
      label,
    );

    const profile = await seedBusinessProfile(admin, user, definition);
    const service = await seedService(
      admin,
      user,
      profile.id,
      definition,
    );

    await seedBusinessHours(admin, user, profile.id, definition);

    const customer = await seedCustomer(
      admin,
      user,
      profile.id,
      customerIdentity,
      label,
    );

    return {
      actor: ownerActor,
      userId: user.id,
      email: ownerIdentity.email,
      businessId: profile.id,
      bookingSlug: profile.booking_slug,
      serviceId: service.id,
      customerId: customer.id,
    };
  } catch (error) {
    const { error: cleanupError } =
      await admin.auth.admin.deleteUser(user.id);

    if (cleanupError) {
      throw new Error(
        `Synthetic tenant creation failed and cleanup also failed for ${ownerActor}: ${cleanupError.message}`,
        { cause: error },
      );
    }

    throw error;
  }
}

export async function seedSyntheticTestData(): Promise<SyntheticTestManifest> {
  const { environment, admin } = createSyntheticSupabaseClients();
  const identities = createSyntheticIdentitySet(
    environment.syntheticEmailDomain,
  );

  const manifest = createEmptySyntheticManifest(SYNTHETIC_MARKER);
  writeSyntheticManifest(manifest);

  const tenantA = await seedTenant(
    admin,
    identities,
    "business-owner-a",
    "public-customer-a",
    "a",
  );

  manifest.tenants.push(tenantA);
  writeSyntheticManifest(manifest);

  const tenantB = await seedTenant(
    admin,
    identities,
    "business-owner-b",
    "public-customer-b",
    "b",
  );

  manifest.tenants.push(tenantB);
  writeSyntheticManifest(manifest);

  return manifest;
}
