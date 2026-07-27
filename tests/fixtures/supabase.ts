import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import {
  requireSyntheticTestEnvironment,
  type SyntheticTestEnvironment,
} from "./environment";
import type { SyntheticIdentity } from "./identities";

export type SyntheticSupabaseClients = {
  environment: SyntheticTestEnvironment;
  admin: SupabaseClient;
};

export function createSyntheticSupabaseClients(): SyntheticSupabaseClients {
  const environment = requireSyntheticTestEnvironment();

  const admin = createClient(
    environment.supabaseUrl,
    environment.serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return {
    environment,
    admin,
  };
}

export async function createAuthenticatedSyntheticClient(
  identity: SyntheticIdentity,
): Promise<SupabaseClient> {
  const environment = requireSyntheticTestEnvironment();

  const client = createClient(
    environment.supabaseUrl,
    environment.publicKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  const { error } = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });

  if (error) {
    throw new Error(
      `Unable to authenticate synthetic actor ${identity.actor}: ${error.message}`,
    );
  }

  return client;
}

export async function findSyntheticUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw new Error(`Unable to list synthetic users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );

    if (match) {
      return match;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  throw new Error(
    "Synthetic user search exceeded 2,000 users. Refusing to continue.",
  );
}

export async function ensureSyntheticAuthUser(
  admin: SupabaseClient,
  identity: SyntheticIdentity,
): Promise<User> {
  const existing = await findSyntheticUserByEmail(admin, identity.email);

  if (existing) {
    return existing;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: identity.email,
    password: identity.password,
    email_confirm: true,
    user_metadata: {
      synthetic_marker: identity.marker,
      synthetic_actor: identity.actor,
      deterministic_key: identity.deterministicKey,
      business_name: `Synthetic ${identity.actor}`,
      accepted_terms: true,
      accepted_privacy: true,
      accepted_security: true,
      acceptance_method: "sprint7_synthetic_fixture",
      accepted_at: new Date().toISOString(),
    },
  });

  if (error || !data.user) {
    throw new Error(
      `Unable to create synthetic actor ${identity.actor}: ${
        error?.message || "No user returned"
      }`,
    );
  }

  return data.user;
}
