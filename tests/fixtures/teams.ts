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

export type SyntheticTeamActor = {
  identity: SyntheticIdentity;
  user: User;
};

export type SyntheticTeamsFixture = {
  ownerA: SyntheticTeamActor;
  memberA: SyntheticTeamActor;
  ownerB: SyntheticTeamActor;
  workspaceA: {
    id: string;
    name: string;
  };
  workspaceB: {
    id: string;
    name: string;
  };
};

const WORKSPACE_A_NAME =
  "Synthetic Operations Nest";
const WORKSPACE_B_NAME =
  "Synthetic Isolated Team";

async function deleteRowsByUser(
  admin: SupabaseClient,
  table: string,
  column: string,
  userId: string,
): Promise<void> {
  const { error } = await admin
    .from(table)
    .delete()
    .eq(column, userId);

  if (error) {
    throw new Error(
      `Unable to clean ${table}.${column} for ${userId}: ${error.message}`,
    );
  }
}

async function resetTeamsActorRecords(
  admin: SupabaseClient,
  actor: SyntheticTeamActor,
): Promise<void> {
  const userId = actor.user.id;

  await deleteRowsByUser(
    admin,
    "team_availability",
    "user_id",
    userId,
  );

  await deleteRowsByUser(
    admin,
    "team_events",
    "created_by",
    userId,
  );

  await deleteRowsByUser(
    admin,
    "team_tasks",
    "created_by",
    userId,
  );

  await deleteRowsByUser(
    admin,
    "team_requests",
    "requested_by",
    userId,
  );

  await deleteRowsByUser(
    admin,
    "team_projects",
    "created_by",
    userId,
  );

  await deleteRowsByUser(
    admin,
    "team_memberships",
    "user_id",
    userId,
  );

  const { error: workspaceError } = await admin
    .from("team_workspaces")
    .delete()
    .eq("owner_id", userId);

  if (workspaceError) {
    throw new Error(
      `Unable to clean owned Teams workspaces for ${userId}: ${workspaceError.message}`,
    );
  }
}

async function insertWorkspace(
  admin: SupabaseClient,
  ownerId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const { data, error } = await admin
    .from("team_workspaces")
    .insert({
      owner_id: ownerId,
      name,
      description:
        `${name} synthetic Sprint 7 workspace`,
      timezone: "America/Los_Angeles",
    })
    .select("id, name")
    .single();

  if (error || !data) {
    throw new Error(
      `Unable to create Teams workspace ${name}: ${
        error?.message ||
        "No workspace returned"
      }`,
    );
  }

  return {
    id: data.id as string,
    name: data.name as string,
  };
}

async function insertMembership(
  admin: SupabaseClient,
  workspaceId: string,
  userId: string,
  invitedEmail: string,
  role:
    | "owner"
    | "admin"
    | "manager"
    | "member"
    | "viewer",
): Promise<void> {
  const { error } = await admin
    .from("team_memberships")
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      invited_email: invitedEmail,
      role,
      status: "active",
    });

  if (error) {
    throw new Error(
      `Unable to create ${role} membership for ${invitedEmail}: ${error.message}`,
    );
  }
}

export async function seedSyntheticTeams(): Promise<SyntheticTeamsFixture> {
  const {
    environment,
    admin,
  } = createSyntheticSupabaseClients();

  const identities =
    createSyntheticIdentitySet(
      environment.syntheticEmailDomain,
    );

  const ownerAIdentity =
    identities["team-admin"];
  const memberAIdentity =
    identities["team-member"];
  const ownerBIdentity =
    identities["business-owner-b"];

  const ownerAUser =
    await ensureSyntheticAuthUser(
      admin,
      ownerAIdentity,
    );

  const memberAUser =
    await ensureSyntheticAuthUser(
      admin,
      memberAIdentity,
    );

  const ownerBUser =
    await ensureSyntheticAuthUser(
      admin,
      ownerBIdentity,
    );

  const ownerA: SyntheticTeamActor = {
    identity: ownerAIdentity,
    user: ownerAUser,
  };

  const memberA: SyntheticTeamActor = {
    identity: memberAIdentity,
    user: memberAUser,
  };

  const ownerB: SyntheticTeamActor = {
    identity: ownerBIdentity,
    user: ownerBUser,
  };

  for (const actor of [
    memberA,
    ownerB,
    ownerA,
  ]) {
    await resetTeamsActorRecords(
      admin,
      actor,
    );
  }

  const workspaceA =
    await insertWorkspace(
      admin,
      ownerA.user.id,
      WORKSPACE_A_NAME,
    );

  const workspaceB =
    await insertWorkspace(
      admin,
      ownerB.user.id,
      WORKSPACE_B_NAME,
    );

  await insertMembership(
    admin,
    workspaceA.id,
    ownerA.user.id,
    ownerA.identity.email,
    "owner",
  );

  await insertMembership(
    admin,
    workspaceA.id,
    memberA.user.id,
    memberA.identity.email,
    "member",
  );

  await insertMembership(
    admin,
    workspaceB.id,
    ownerB.user.id,
    ownerB.identity.email,
    "owner",
  );

  return {
    ownerA,
    memberA,
    ownerB,
    workspaceA,
    workspaceB,
  };
}

export async function cleanupSyntheticTeams(
  fixture: SyntheticTeamsFixture,
): Promise<void> {
  const { admin } =
    createSyntheticSupabaseClients();

  for (const actor of [
    fixture.memberA,
    fixture.ownerB,
    fixture.ownerA,
  ]) {
    await resetTeamsActorRecords(
      admin,
      actor,
    );
  }

  for (const actor of [
    fixture.memberA,
    fixture.ownerB,
    fixture.ownerA,
  ]) {
    const { error } =
      await admin.auth.admin.deleteUser(
        actor.user.id,
      );

    if (error) {
      throw new Error(
        `Unable to delete synthetic Teams actor ${actor.identity.email}: ${error.message}`,
      );
    }
  }
}
