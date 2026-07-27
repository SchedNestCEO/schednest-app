import { unlinkSync } from "node:fs";
import {
  readSyntheticManifest,
  SYNTHETIC_MANIFEST_PATH,
  type SyntheticTestManifest,
} from "./manifest";
import { createSyntheticSupabaseClients } from "./supabase";
import { SYNTHETIC_MARKER } from "./identities";

export async function cleanupSyntheticTestData(): Promise<void> {
  const manifest = readSyntheticManifest();

  if (!manifest) {
    return;
  }

  if (manifest.marker !== SYNTHETIC_MARKER) {
    throw new Error(
      "Synthetic cleanup manifest marker is invalid. Refusing cleanup.",
    );
  }

  const { admin } = createSyntheticSupabaseClients();

  for (const tenant of [...manifest.tenants].reverse()) {
    const { error: businessError } = await admin
      .from("business_profiles")
      .delete()
      .eq("id", tenant.businessId)
      .eq("owner_id", tenant.userId)
      .eq("business_description", SYNTHETIC_MARKER);

    if (businessError) {
      throw new Error(
        `Unable to remove synthetic business ${tenant.businessId}: ${businessError.message}`,
      );
    }

    const { error: userError } = await admin.auth.admin.deleteUser(
      tenant.userId,
    );

    if (userError) {
      throw new Error(
        `Unable to remove synthetic user ${tenant.email}: ${userError.message}`,
      );
    }
  }

  unlinkSync(SYNTHETIC_MANIFEST_PATH);
}

export function assertSyntheticManifestIsComplete(
  manifest: SyntheticTestManifest,
): void {
  if (manifest.marker !== SYNTHETIC_MARKER) {
    throw new Error("Synthetic manifest marker is invalid.");
  }

  if (manifest.tenants.length !== 2) {
    throw new Error(
      `Expected two synthetic tenants, received ${manifest.tenants.length}.`,
    );
  }

  const userIds = new Set(manifest.tenants.map(({ userId }) => userId));
  const businessIds = new Set(
    manifest.tenants.map(({ businessId }) => businessId),
  );

  if (userIds.size !== manifest.tenants.length) {
    throw new Error("Synthetic tenant users are not unique.");
  }

  if (businessIds.size !== manifest.tenants.length) {
    throw new Error("Synthetic tenant businesses are not unique.");
  }
}
