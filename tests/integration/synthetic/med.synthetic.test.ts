import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cleanupSyntheticMed,
  seedSyntheticMed,
  type SyntheticMedFixture,
} from "../../fixtures/med";
import { requireSyntheticTestEnvironment } from "../../fixtures/environment";
import {
  createAuthenticatedSyntheticClient,
  createSyntheticSupabaseClients,
} from "../../fixtures/supabase";

let fixture: SyntheticMedFixture;
let patientClient: SupabaseClient;
let caregiverClient: SupabaseClient;
let unrelatedClient: SupabaseClient;
let adminClient: SupabaseClient;

describe.sequential("SchedNest Med synthetic access network", () => {
  beforeAll(async () => {
    requireSyntheticTestEnvironment();

    fixture = await seedSyntheticMed();

    patientClient = await createAuthenticatedSyntheticClient(
      fixture.patient.identity,
    );

    caregiverClient = await createAuthenticatedSyntheticClient(
      fixture.caregiver.identity,
    );

    unrelatedClient = await createAuthenticatedSyntheticClient(
      fixture.unrelatedPatient.identity,
    );

    adminClient = createSyntheticSupabaseClients().admin;
  });

  afterAll(async () => {
    await patientClient?.auth.signOut();
    await caregiverClient?.auth.signOut();
    await unrelatedClient?.auth.signOut();

    if (fixture) {
      await cleanupSyntheticMed(fixture);
    }
  });

  it("creates the complete Med fixture", async () => {
    const { data: profile, error: profileError } = await adminClient
      .from("med_profiles")
      .select("id, owner_id, display_name")
      .eq("id", fixture.profile.id)
      .single();

    expect(profileError).toBeNull();

    expect(profile).toMatchObject({
      id: fixture.profile.id,
      owner_id: fixture.patient.user.id,
      display_name: fixture.profile.displayName,
    });

    const checks = [
      {
        table: "med_appointments",
        id: fixture.appointment.id,
      },
      {
        table: "med_medications",
        id: fixture.medication.id,
      },
      {
        table: "med_tasks",
        id: fixture.task.id,
      },
      {
        table: "med_provider_questions",
        id: fixture.question.id,
      },
      {
        table: "med_documents",
        id: fixture.document.id,
      },
      {
        table: "med_emergency_cards",
        id: fixture.emergencyCard.id,
      },
      {
        table: "med_caregiver_access",
        id: fixture.caregiverAccess.id,
      },
    ];

    for (const check of checks) {
      const { data, error } = await adminClient
        .from(check.table)
        .select("id")
        .eq("id", check.id)
        .single();

      expect(error).toBeNull();
      expect(data?.id).toBe(check.id);
    }

    const { data: accessibility, error: accessibilityError } = await adminClient
      .from("med_accessibility_preferences")
      .select("owner_id, large_text")
      .eq("owner_id", fixture.patient.user.id)
      .single();

    expect(accessibilityError).toBeNull();

    expect(accessibility).toMatchObject({
      owner_id: fixture.patient.user.id,
      large_text: true,
    });
  });

  it("allows the patient to read their own Med records", async () => {
    const tables = [
      {
        table: "med_appointments",
        id: fixture.appointment.id,
      },
      {
        table: "med_medications",
        id: fixture.medication.id,
      },
      {
        table: "med_tasks",
        id: fixture.task.id,
      },
      {
        table: "med_provider_questions",
        id: fixture.question.id,
      },
      {
        table: "med_documents",
        id: fixture.document.id,
      },
      {
        table: "med_emergency_cards",
        id: fixture.emergencyCard.id,
      },
    ];

    for (const record of tables) {
      const { data, error } = await patientClient
        .from(record.table)
        .select("id")
        .eq("id", record.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it("allows the accepted caregiver to read only permitted patient records", async () => {
    const permitted = [
      {
        table: "med_appointments",
        id: fixture.appointment.id,
      },
      {
        table: "med_medications",
        id: fixture.medication.id,
      },
      {
        table: "med_tasks",
        id: fixture.task.id,
      },
      {
        table: "med_provider_questions",
        id: fixture.question.id,
      },
      {
        table: "med_documents",
        id: fixture.document.id,
      },
      {
        table: "med_emergency_cards",
        id: fixture.emergencyCard.id,
      },
    ];

    for (const record of permitted) {
      const { data, error } = await caregiverClient
        .from(record.table)
        .select("id")
        .eq("id", record.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
    }
  });

  it("keeps patient accessibility preferences private", async () => {
    const { data, error } = await caregiverClient
      .from("med_accessibility_preferences")
      .select("id")
      .eq("owner_id", fixture.patient.user.id);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("prevents the caregiver from reading the unrelated patient", async () => {
    const { data: profiles, error: profileError } = await caregiverClient
      .from("med_profiles")
      .select("id")
      .eq("id", fixture.unrelatedProfile.id);

    expect(profileError).toBeNull();
    expect(profiles).toEqual([]);

    const { data: appointments, error: appointmentError } =
      await caregiverClient
        .from("med_appointments")
        .select("id")
        .eq("owner_id", fixture.unrelatedPatient.user.id);

    expect(appointmentError).toBeNull();
    expect(appointments).toEqual([]);
  });

  it("prevents the unrelated patient from reading the primary patient's records", async () => {
    const records = [
      {
        table: "med_appointments",
        id: fixture.appointment.id,
      },
      {
        table: "med_medications",
        id: fixture.medication.id,
      },
      {
        table: "med_tasks",
        id: fixture.task.id,
      },
      {
        table: "med_documents",
        id: fixture.document.id,
      },
    ];

    for (const record of records) {
      const { data, error } = await unrelatedClient
        .from(record.table)
        .select("id")
        .eq("id", record.id);

      expect(error).toBeNull();
      expect(data).toEqual([]);
    }
  });

  it("allows permission-backed caregiver updates", async () => {
    const { error: appointmentError } = await caregiverClient
      .from("med_appointments")
      .update({
        status: "completed",
      })
      .eq("id", fixture.appointment.id);

    expect(appointmentError).toBeNull();

    const { error: medicationError } = await caregiverClient
      .from("med_medications")
      .update({
        is_active: false,
      })
      .eq("id", fixture.medication.id);

    expect(medicationError).toBeNull();

    const completedAt = new Date().toISOString();

    const { error: taskError } = await caregiverClient
      .from("med_tasks")
      .update({
        completed_at: completedAt,
      })
      .eq("id", fixture.task.id);

    expect(taskError).toBeNull();

    const { data: persisted, error: persistedError } = await adminClient
      .from("med_tasks")
      .select("completed_at")
      .eq("id", fixture.task.id)
      .single();

    expect(persistedError).toBeNull();

    expect(persisted?.completed_at).toBeTruthy();
  });

  it("removes caregiver visibility immediately after revocation", async () => {
    const { error: revokeError } = await adminClient
      .from("med_caregiver_access")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", fixture.caregiverAccess.id);

    expect(revokeError).toBeNull();

    const { data: appointments, error: appointmentError } =
      await caregiverClient
        .from("med_appointments")
        .select("id")
        .eq("id", fixture.appointment.id);

    expect(appointmentError).toBeNull();
    expect(appointments).toEqual([]);

    const { data: medications, error: medicationError } = await caregiverClient
      .from("med_medications")
      .select("id")
      .eq("id", fixture.medication.id);

    expect(medicationError).toBeNull();
    expect(medications).toEqual([]);
  });
});
