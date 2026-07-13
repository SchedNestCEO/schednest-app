"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { publishPlatformActivity } from "../../../lib/platform/publishActivity";

export async function logStudentAssignmentCreated(
  supabase: SupabaseClient,
  userId: string,
  assignment: {
    id: string;
    title: string;
    due_at?: string | null;
    priority?: string | null;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "student",
    eventType: "assignment.created",
    action: "created",
    title: `Assignment created: ${assignment.title}`,
    description: assignment.due_at
      ? `Due ${assignment.due_at}`
      : "No due date",
    resourceType: "student_assignment",
    resourceId: assignment.id,
    severity: assignment.priority === "urgent" ? "warning" : "info",
    metadata: {
      due_at: assignment.due_at || null,
      priority: assignment.priority || null,
    },
  });
}

export async function logStudentAssignmentCompleted(
  supabase: SupabaseClient,
  userId: string,
  assignment: { id: string; title: string }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "student",
    eventType: "assignment.completed",
    action: "completed",
    title: `Assignment completed: ${assignment.title}`,
    resourceType: "student_assignment",
    resourceId: assignment.id,
    severity: "success",
  });
}

export async function logStudentAssignmentDeleted(
  supabase: SupabaseClient,
  userId: string,
  assignment: { id: string; title: string }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "student",
    eventType: "assignment.deleted",
    action: "deleted",
    title: `Assignment deleted: ${assignment.title}`,
    resourceType: "student_assignment",
    resourceId: assignment.id,
    severity: "warning",
  });
}
