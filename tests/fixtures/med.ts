import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  createSyntheticIdentitySet,
  type SyntheticIdentity,
} from "./identities";
import {
  createSyntheticSupabaseClients,
  ensureSyntheticAuthUser,
} from "./supabase";

export type SyntheticMedActor = {
  identity: SyntheticIdentity;
  user: User;
};

export type SyntheticMedFixture = {
  patient: SyntheticMedActor;
  caregiver: SyntheticMedActor;
  unrelatedPatient: SyntheticMedActor;
  profile: {
    id: string;
    displayName: string;
  };
  unrelatedProfile: {
    id: string;
    displayName: string;
  };
  appointment: {
    id: string;
    title: string;
  };
  medication: {
    id: string;
    name: string;
  };
  task: {
    id: string;
    title: string;
  };
  question: {
    id: string;
    question: string;
  };
  document: {
    id: string;
    title: string;
    path: string;
  };
  emergencyCard: {
    id: string;
  };
  caregiverAccess: {
    id: string;
  };
};

const PATIENT_NAME = "Synthetic Med Patient";

const UNRELATED_PATIENT_NAME = "Synthetic Isolated Patient";

async function deleteRowsByUser(
  admin: SupabaseClient,
  table: string,
  column: string,
  userId: string,
): Promise<void> {
  const { error } = await admin.from(table).delete().eq(column, userId);

  if (error) {
    throw new Error(
      `Unable to clean ${table}.${column} for ${userId}: ${error.message}`,
    );
  }
}

async function resetMedOwnerRecords(
  admin: SupabaseClient,
  ownerId: string,
): Promise<void> {
  for (const table of [
    "med_documents",
    "med_provider_questions",
    "med_emergency_cards",
    "med_accessibility_preferences",
    "med_tasks",
    "med_medications",
    "med_appointments",
    "med_caregiver_access",
    "med_care_nests",
    "med_profiles",
  ]) {
    await deleteRowsByUser(admin, table, "owner_id", ownerId);
  }

  const { data: files, error: listError } = await admin.storage
    .from("med-documents")
    .list(ownerId);

  if (listError) {
    throw new Error(
      `Unable to list Med files for ${ownerId}: ${listError.message}`,
    );
  }

  const paths = (files || []).map((file) => `${ownerId}/${file.name}`);

  if (paths.length > 0) {
    const { error: removeError } = await admin.storage
      .from("med-documents")
      .remove(paths);

    if (removeError) {
      throw new Error(
        `Unable to remove Med files for ${ownerId}: ${removeError.message}`,
      );
    }
  }
}

async function resetCaregiverRecords(
  admin: SupabaseClient,
  caregiverId: string,
): Promise<void> {
  await deleteRowsByUser(
    admin,
    "med_caregiver_access",
    "caregiver_user_id",
    caregiverId,
  );
}

async function createProfile(
  admin: SupabaseClient,
  ownerId: string,
  displayName: string,
): Promise<{ id: string; displayName: string }> {
  const { data, error } = await admin
    .from("med_profiles")
    .insert({
      owner_id: ownerId,
      display_name: displayName,
      timezone: "America/Los_Angeles",
    })
    .select("id, display_name")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to create Med profile: ${
        error?.message || "No profile returned"
      }`,
    );
  }

  return {
    id: data.id as string,
    displayName: data.display_name as string,
  };
}

export async function seedSyntheticMed(): Promise<SyntheticMedFixture> {
  const { environment, admin } = createSyntheticSupabaseClients();

  const identities = createSyntheticIdentitySet(
    environment.syntheticEmailDomain,
  );

  const patientIdentity = identities["medical-user"];

  const caregiverIdentity = identities.caregiver;

  const unrelatedIdentity = identities["medical-user-b"];

  const patientUser = await ensureSyntheticAuthUser(admin, patientIdentity);

  const caregiverUser = await ensureSyntheticAuthUser(admin, caregiverIdentity);

  const unrelatedUser = await ensureSyntheticAuthUser(admin, unrelatedIdentity);

  const patient: SyntheticMedActor = {
    identity: patientIdentity,
    user: patientUser,
  };

  const caregiver: SyntheticMedActor = {
    identity: caregiverIdentity,
    user: caregiverUser,
  };

  const unrelatedPatient: SyntheticMedActor = {
    identity: unrelatedIdentity,
    user: unrelatedUser,
  };

  await resetCaregiverRecords(admin, caregiver.user.id);

  await resetMedOwnerRecords(admin, unrelatedPatient.user.id);

  await resetMedOwnerRecords(admin, patient.user.id);

  const profile = await createProfile(admin, patient.user.id, PATIENT_NAME);

  const unrelatedProfile = await createProfile(
    admin,
    unrelatedPatient.user.id,
    UNRELATED_PATIENT_NAME,
  );

  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const endsAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
  ).toISOString();

  const { data: appointmentData, error: appointmentError } = await admin
    .from("med_appointments")
    .insert({
      owner_id: patient.user.id,
      med_profile_id: profile.id,
      title: "Synthetic Cardiology Follow-up",
      provider_name: "Dr. Synthetic",
      starts_at: startsAt,
      ends_at: endsAt,
      location: "Synthetic Medical Center",
      status: "scheduled",
    })
    .select("id, title")
    .single();

  if (appointmentError || !appointmentData) {
    throw new Error(
      `Unable to create Med appointment: ${
        appointmentError?.message || "No appointment returned"
      }`,
    );
  }

  const { data: medicationData, error: medicationError } = await admin
    .from("med_medications")
    .insert({
      owner_id: patient.user.id,
      med_profile_id: profile.id,
      medication_name: "Synthetic Medication",
      dosage: "10 mg",
      frequency: "Daily",
      is_active: true,
    })
    .select("id, medication_name")
    .single();

  if (medicationError || !medicationData) {
    throw new Error(
      `Unable to create Med medication: ${
        medicationError?.message || "No medication returned"
      }`,
    );
  }

  const { data: taskData, error: taskError } = await admin
    .from("med_tasks")
    .insert({
      owner_id: patient.user.id,
      med_profile_id: profile.id,
      title: "Synthetic Lab Task",
      task_type: "lab",
    })
    .select("id, title")
    .single();

  if (taskError || !taskData) {
    throw new Error(
      `Unable to create Med task: ${taskError?.message || "No task returned"}`,
    );
  }

  const { data: questionData, error: questionError } = await admin
    .from("med_provider_questions")
    .insert({
      owner_id: patient.user.id,
      med_profile_id: profile.id,
      question: "Synthetic provider question?",
      answered: false,
    })
    .select("id, question")
    .single();

  if (questionError || !questionData) {
    throw new Error(
      `Unable to create Med question: ${
        questionError?.message || "No question returned"
      }`,
    );
  }

  const documentPath = `${patient.user.id}/synthetic-med-document.txt`;

  const { error: uploadError } = await admin.storage
    .from("med-documents")
    .upload(documentPath, Buffer.from("Synthetic Med document"), {
      contentType: "text/plain",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(
      `Unable to upload synthetic Med document: ${uploadError.message}`,
    );
  }

  const { data: documentData, error: documentError } = await admin
    .from("med_documents")
    .insert({
      owner_id: patient.user.id,
      med_profile_id: profile.id,
      title: "Synthetic Care Instructions",
      document_type: "text/plain",
      file_url: documentPath,
      notes: "Synthetic document fixture",
    })
    .select("id, title")
    .single();

  if (documentError || !documentData) {
    throw new Error(
      `Unable to create Med document: ${
        documentError?.message || "No document returned"
      }`,
    );
  }

  const { data: emergencyData, error: emergencyError } = await admin
    .from("med_emergency_cards")
    .insert({
      owner_id: patient.user.id,
      med_profile_id: profile.id,
      blood_type: "O+",
      allergies: "Synthetic allergy",
      conditions: "Synthetic condition",
      emergency_contacts: [
        {
          name: "Synthetic Emergency Contact",
          relationship: "Family",
          phone: "555-0100",
        },
      ],
      preferred_hospital: "Synthetic Medical Center",
      primary_provider: "Dr. Synthetic",
      share_with_caregivers: true,
    })
    .select("id")
    .single();

  if (emergencyError || !emergencyData) {
    throw new Error(
      `Unable to create Med emergency card: ${
        emergencyError?.message || "No emergency card returned"
      }`,
    );
  }

  const { error: accessibilityError } = await admin
    .from("med_accessibility_preferences")
    .insert({
      owner_id: patient.user.id,
      large_text: true,
      preferred_language: "English",
    });

  if (accessibilityError) {
    throw new Error(
      `Unable to create Med accessibility preferences: ${accessibilityError.message}`,
    );
  }

  const { data: accessData, error: accessError } = await admin
    .from("med_caregiver_access")
    .insert({
      med_profile_id: profile.id,
      owner_id: patient.user.id,
      caregiver_user_id: caregiver.user.id,
      caregiver_email: caregiver.identity.email,
      relationship: "Family",
      permission_level: "manage",
      status: "accepted",
      accepted_at: new Date().toISOString(),
      invited_by: patient.user.id,
      permissions: {
        view_schedule: true,
        manage_appointments: true,
        view_medications: true,
        manage_medications: true,
        manage_tasks: true,
        view_documents: true,
        upload_documents: false,
        manage_questions: true,
        receive_reminders: true,
        manage_caregivers: false,
      },
    })
    .select("id")
    .single();

  if (accessError || !accessData) {
    throw new Error(
      `Unable to create caregiver access: ${
        accessError?.message || "No access record returned"
      }`,
    );
  }

  return {
    patient,
    caregiver,
    unrelatedPatient,
    profile,
    unrelatedProfile,
    appointment: {
      id: appointmentData.id as string,
      title: appointmentData.title as string,
    },
    medication: {
      id: medicationData.id as string,
      name: medicationData.medication_name as string,
    },
    task: {
      id: taskData.id as string,
      title: taskData.title as string,
    },
    question: {
      id: questionData.id as string,
      question: questionData.question as string,
    },
    document: {
      id: documentData.id as string,
      title: documentData.title as string,
      path: documentPath,
    },
    emergencyCard: {
      id: emergencyData.id as string,
    },
    caregiverAccess: {
      id: accessData.id as string,
    },
  };
}

export async function cleanupSyntheticMed(
  fixture: SyntheticMedFixture,
): Promise<void> {
  const { admin } = createSyntheticSupabaseClients();

  await resetCaregiverRecords(admin, fixture.caregiver.user.id);

  await resetMedOwnerRecords(admin, fixture.unrelatedPatient.user.id);

  await resetMedOwnerRecords(admin, fixture.patient.user.id);

  for (const actor of [
    fixture.caregiver,
    fixture.unrelatedPatient,
    fixture.patient,
  ]) {
    const { error } = await admin.auth.admin.deleteUser(actor.user.id);

    if (error) {
      throw new Error(
        `Unable to delete synthetic Med actor ${actor.identity.email}: ${error.message}`,
      );
    }
  }
}
