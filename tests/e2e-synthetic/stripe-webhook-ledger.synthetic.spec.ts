import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createSyntheticSupabaseClients } from "../fixtures/supabase";

test("Stripe webhook ledger deduplicates and retries failed events", async () => {
  const { admin } = createSyntheticSupabaseClients();
  const eventId = `evt_schednest_${randomUUID()}`;

  try {
    const first = await admin.rpc("claim_stripe_webhook_event", {
      requested_event_id: eventId,
      requested_event_type: "customer.subscription.updated",
    });

    expect(first.error).toBeNull();
    expect(first.data?.[0]).toMatchObject({
      claimed: true,
      event_status: "processing",
      attempts: 1,
    });

    const duplicateProcessing = await admin.rpc("claim_stripe_webhook_event", {
      requested_event_id: eventId,
      requested_event_type: "customer.subscription.updated",
    });

    expect(duplicateProcessing.error).toBeNull();
    expect(duplicateProcessing.data?.[0]).toMatchObject({
      claimed: false,
      event_status: "processing",
      attempts: 1,
    });

    const failedAt = new Date().toISOString();

    const markFailed = await admin
      .from("stripe_webhook_events")
      .update({
        status: "failed",
        failed_at: failedAt,
        last_error: "Synthetic dependency failure",
        updated_at: failedAt,
      })
      .eq("stripe_event_id", eventId);

    expect(markFailed.error).toBeNull();

    const retry = await admin.rpc("claim_stripe_webhook_event", {
      requested_event_id: eventId,
      requested_event_type: "customer.subscription.updated",
    });

    expect(retry.error).toBeNull();
    expect(retry.data?.[0]).toMatchObject({
      claimed: true,
      event_status: "processing",
      attempts: 2,
    });

    const completedAt = new Date().toISOString();

    const markCompleted = await admin
      .from("stripe_webhook_events")
      .update({
        status: "completed",
        completed_at: completedAt,
        failed_at: null,
        last_error: null,
        updated_at: completedAt,
      })
      .eq("stripe_event_id", eventId);

    expect(markCompleted.error).toBeNull();

    const duplicateCompleted = await admin.rpc("claim_stripe_webhook_event", {
      requested_event_id: eventId,
      requested_event_type: "customer.subscription.updated",
    });

    expect(duplicateCompleted.error).toBeNull();
    expect(duplicateCompleted.data?.[0]).toMatchObject({
      claimed: false,
      event_status: "completed",
      attempts: 2,
    });

    const stored = await admin
      .from("stripe_webhook_events")
      .select("status,attempt_count,completed_at,failed_at,last_error")
      .eq("stripe_event_id", eventId)
      .single();

    expect(stored.error).toBeNull();
    expect(stored.data).toMatchObject({
      status: "completed",
      attempt_count: 2,
      failed_at: null,
      last_error: null,
    });
    expect(stored.data?.completed_at).toBeTruthy();
  } finally {
    await admin
      .from("stripe_webhook_events")
      .delete()
      .eq("stripe_event_id", eventId);
  }
});
