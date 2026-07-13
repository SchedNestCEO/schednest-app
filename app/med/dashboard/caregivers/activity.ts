"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { publishPlatformActivity } from "../../../lib/platform/publishActivity";

export async function logCaregiverInvited(
  supabase: SupabaseClient,
  userId: string,
  caregiver: {
    id: string;
    caregiver_email: string;
    relationship?: string | null;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "med",
    eventType: "caregiver.invited",
    action: "created",
    title: `Caregiver invited: ${caregiver.caregiver_email}`,
    description: caregiver.relationship || undefined,
    resourceType: "med_caregiver_access",
    resourceId: caregiver.id,
    severity: "info",
    metadata: {
      caregiver_email: caregiver.caregiver_email,
      relationship: caregiver.relationship || null,
    },
  });
}

export async function logCaregiverPermissionChanged(
  supabase: SupabaseClient,
  userId: string,
  caregiver: {
    id: string;
    caregiver_email: string;
    permission: string;
    enabled: boolean;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "med",
    eventType: "caregiver.permission_changed",
    action: "updated",
    title: `Caregiver permission changed`,
    description: `${caregiver.caregiver_email}: ${caregiver.permission} ${
      caregiver.enabled ? "enabled" : "disabled"
    }`,
    resourceType: "med_caregiver_access",
    resourceId: caregiver.id,
    severity: "warning",
    metadata: {
      caregiver_email: caregiver.caregiver_email,
      permission: caregiver.permission,
      enabled: caregiver.enabled,
    },
  });
}

export async function logCaregiverRevoked(
  supabase: SupabaseClient,
  userId: string,
  caregiver: {
    id: string;
    caregiver_email: string;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "med",
    eventType: "caregiver.revoked",
    action: "revoked",
    title: `Caregiver access revoked`,
    description: caregiver.caregiver_email,
    resourceType: "med_caregiver_access",
    resourceId: caregiver.id,
    severity: "critical",
    metadata: {
      caregiver_email: caregiver.caregiver_email,
    },
  });
}
