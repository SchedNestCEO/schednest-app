"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { publishPlatformActivity } from "../../../lib/platform/publishActivity";

export async function logTeamRequestCreated(
  supabase: SupabaseClient,
  userId: string,
  request: {
    id: string;
    title: string;
    request_type?: string | null;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "teams",
    eventType: "request.created",
    action: "created",
    title: `Request created: ${request.title}`,
    description: request.request_type?.replaceAll("_", " ") || undefined,
    resourceType: "team_request",
    resourceId: request.id,
    severity: "info",
    metadata: {
      request_type: request.request_type || null,
    },
  });
}

export async function logTeamRequestReviewed(
  supabase: SupabaseClient,
  userId: string,
  request: {
    id: string;
    title: string;
    status: string;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "teams",
    eventType: "request.reviewed",
    action: "updated",
    title: `Request ${request.status}: ${request.title}`,
    resourceType: "team_request",
    resourceId: request.id,
    severity:
      request.status === "approved"
        ? "success"
        : request.status === "denied"
          ? "warning"
          : "info",
    metadata: {
      status: request.status,
    },
  });
}
