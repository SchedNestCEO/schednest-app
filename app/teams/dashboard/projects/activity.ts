"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { publishPlatformActivity } from "../../../lib/platform/publishActivity";

export async function logTeamProjectCreated(
  supabase: SupabaseClient,
  userId: string,
  project: {
    id: string;
    name: string;
    due_on?: string | null;
    status?: string | null;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "teams",
    eventType: "project.created",
    action: "created",
    title: `Project created: ${project.name}`,
    description: project.due_on ? `Due ${project.due_on}` : "No due date",
    resourceType: "team_project",
    resourceId: project.id,
    severity: "success",
    metadata: {
      due_on: project.due_on || null,
      status: project.status || null,
    },
  });
}

export async function logTeamProjectStatusChanged(
  supabase: SupabaseClient,
  userId: string,
  project: { id: string; name: string; status: string }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "teams",
    eventType: "project.status_changed",
    action: "updated",
    title: `Project status changed: ${project.name}`,
    description: `New status: ${project.status}`,
    resourceType: "team_project",
    resourceId: project.id,
    severity: project.status === "blocked" ? "warning" : "info",
    metadata: { status: project.status },
  });
}
