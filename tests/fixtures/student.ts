import type {
  SupabaseClient,
  User,
} from "@supabase/supabase-js";
import {
  createSyntheticIdentitySet,
  type SyntheticIdentity,
} from "./identities";
import {
  createSyntheticSupabaseClients,
  ensureSyntheticAuthUser,
} from "./supabase";

export type SyntheticStudentActor = {
  identity: SyntheticIdentity;
  user: User;
};

export type SyntheticStudentFixture = {
  studentA: SyntheticStudentActor;
  studentB: SyntheticStudentActor;
};

const STUDENT_TABLES_IN_DELETE_ORDER = [
  "student_import_items",
  "student_imports",
  "student_class_sessions",
  "student_study_sessions",
  "student_assignments",
  "student_exams",
  "student_courses",
  "student_profiles",
] as const;

async function removeStudentStorage(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data, error } = await admin.storage
    .from("student-imports")
    .list(userId, {
      limit: 1000,
    });

  if (error) {
    throw new Error(
      `Unable to inspect Student import storage for ${userId}: ${error.message}`,
    );
  }

  const paths = (data || [])
    .filter(
      ({ name }) =>
        typeof name === "string" &&
        name.length > 0,
    )
    .map(({ name }) => `${userId}/${name}`);

  if (paths.length === 0) {
    return;
  }

  const { error: removeError } =
    await admin.storage
      .from("student-imports")
      .remove(paths);

  if (removeError) {
    throw new Error(
      `Unable to remove Student import storage for ${userId}: ${removeError.message}`,
    );
  }
}

async function removeStudentRows(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  for (const table of STUDENT_TABLES_IN_DELETE_ORDER) {
    const { error } = await admin
      .from(table)
      .delete()
      .eq("owner_id", userId);

    if (error) {
      throw new Error(
        `Unable to clean ${table} for ${userId}: ${error.message}`,
      );
    }
  }
}

async function resetStudentActor(
  admin: SupabaseClient,
  actor: SyntheticStudentActor,
): Promise<void> {
  await removeStudentStorage(
    admin,
    actor.user.id,
  );

  await removeStudentRows(
    admin,
    actor.user.id,
  );
}

export async function seedSyntheticStudents(): Promise<SyntheticStudentFixture> {
  const {
    environment,
    admin,
  } = createSyntheticSupabaseClients();

  const identities =
    createSyntheticIdentitySet(
      environment.syntheticEmailDomain,
    );

  const studentAIdentity =
    identities.student;

  const studentBIdentity =
    identities["team-member"];

  const studentAUser =
    await ensureSyntheticAuthUser(
      admin,
      studentAIdentity,
    );

  const studentBUser =
    await ensureSyntheticAuthUser(
      admin,
      studentBIdentity,
    );

  const fixture: SyntheticStudentFixture = {
    studentA: {
      identity: studentAIdentity,
      user: studentAUser,
    },
    studentB: {
      identity: studentBIdentity,
      user: studentBUser,
    },
  };

  await resetStudentActor(
    admin,
    fixture.studentA,
  );

  await resetStudentActor(
    admin,
    fixture.studentB,
  );

  return fixture;
}

export async function cleanupSyntheticStudents(
  fixture: SyntheticStudentFixture,
): Promise<void> {
  const { admin } =
    createSyntheticSupabaseClients();

  for (const actor of [
    fixture.studentB,
    fixture.studentA,
  ]) {
    await resetStudentActor(
      admin,
      actor,
    );

    const { error } =
      await admin.auth.admin.deleteUser(
        actor.user.id,
      );

    if (error) {
      throw new Error(
        `Unable to delete synthetic Student actor ${actor.identity.email}: ${error.message}`,
      );
    }
  }
}
