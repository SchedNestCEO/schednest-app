import type { User } from "@supabase/supabase-js";
import {
  createSyntheticIdentitySet,
  type SyntheticIdentity,
} from "./identities";
import {
  createSyntheticSupabaseClients,
  ensureSyntheticAuthUser,
} from "./supabase";

export type SyntheticPlatformAdmin = {
  identity: SyntheticIdentity;
  user: User;
};

export async function seedSyntheticPlatformAdmin():
  Promise<SyntheticPlatformAdmin> {
  const { environment, admin } =
    createSyntheticSupabaseClients();

  const identities = createSyntheticIdentitySet(
    environment.syntheticEmailDomain,
  );

  const identity = identities["platform-admin"];
  const user = await ensureSyntheticAuthUser(
    admin,
    identity,
  );

  const { error } = await admin
    .from("platform_admins")
    .upsert(
      {
        user_id: user.id,
        role: "founder",
        status: "active",
        permissions: ["synthetic-testing"],
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      },
    );

  if (error) {
    throw new Error(
      `Unable to seed synthetic platform admin: ${error.message}`,
    );
  }

  return {
    identity,
    user,
  };
}

export async function cleanupSyntheticPlatformAdmin(
  syntheticAdmin: SyntheticPlatformAdmin,
): Promise<void> {
  const { admin } = createSyntheticSupabaseClients();

  const { error: rowError } = await admin
    .from("platform_admins")
    .delete()
    .eq("user_id", syntheticAdmin.user.id);

  if (rowError) {
    throw new Error(
      `Unable to remove synthetic platform-admin row: ${rowError.message}`,
    );
  }

  const { error: userError } =
    await admin.auth.admin.deleteUser(
      syntheticAdmin.user.id,
    );

  if (userError) {
    throw new Error(
      `Unable to remove synthetic platform-admin user: ${userError.message}`,
    );
  }
}
