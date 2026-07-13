"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivitySeverity,
  ActivitySource,
  PlatformProduct,
} from "./activity";

export type PublishActivityInput = {
  ownerId: string;
  product: PlatformProduct;
  eventType: string;
  action: string;
  title: string;
  description?: string;
  resourceType?: string;
  resourceId?: string;
  severity?: ActivitySeverity;
  source?: ActivitySource;
  metadata?: Record<string, unknown>;
};

export async function publishPlatformActivity(
  supabase: SupabaseClient,
  input: PublishActivityInput
) {
  const { error } = await supabase.from("platform_activity_events").insert({
    actor_user_id: input.ownerId,
    owner_id: input.ownerId,
    product: input.product,
    event_type: input.eventType,
    action: input.action,
    resource_type: input.resourceType || null,
    resource_id: input.resourceId || null,
    title: input.title,
    description: input.description || null,
    severity: input.severity || "info",
    source: input.source || "user",
    metadata: input.metadata || {},
  });

  return { error };
}
