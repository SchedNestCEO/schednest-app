"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { publishPlatformActivity } from "../../../lib/platform/publishActivity";

export async function logMedAppointmentCreated(
  supabase: SupabaseClient,
  userId: string,
  appointment: {
    id: string;
    title: string;
    starts_at: string;
    provider_name?: string | null;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "med",
    eventType: "appointment.created",
    action: "created",
    title: `Appointment added: ${appointment.title}`,
    description: appointment.provider_name
      ? `Provider: ${appointment.provider_name}`
      : undefined,
    resourceType: "med_appointment",
    resourceId: appointment.id,
    severity: "success",
    metadata: {
      starts_at: appointment.starts_at,
      provider_name: appointment.provider_name || null,
    },
  });
}

export async function logMedAppointmentStatusChanged(
  supabase: SupabaseClient,
  userId: string,
  appointment: {
    id: string;
    title: string;
    status: string;
  }
) {
  return publishPlatformActivity(supabase, {
    ownerId: userId,
    product: "med",
    eventType: "appointment.status_changed",
    action: "updated",
    title: `Appointment ${appointment.status}: ${appointment.title}`,
    resourceType: "med_appointment",
    resourceId: appointment.id,
    severity:
      appointment.status === "completed"
        ? "success"
        : appointment.status === "missed"
          ? "warning"
          : "info",
    metadata: {
      status: appointment.status,
    },
  });
}
