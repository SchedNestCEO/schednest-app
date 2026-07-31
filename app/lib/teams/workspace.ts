import type {
  PostgrestError,
  SupabaseClient,
} from "@supabase/supabase-js";

export type ResolvedTeamWorkspace = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ResolveTeamWorkspaceResult = {
  workspace: ResolvedTeamWorkspace | null;
  error: PostgrestError | null;
};

/**
 * Resolves the user's primary Teams workspace.
 *
 * RLS exposes workspaces the user owns or actively belongs to.
 * Prefer an owned workspace, then fall back to the oldest visible
 * shared workspace.
 */
export async function resolveTeamWorkspace(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResolveTeamWorkspaceResult> {
  const { data, error } = await supabase
    .from("team_workspaces")
    .select(
      "id, owner_id, name, description, created_at",
    )
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    return {
      workspace: null,
      error,
    };
  }

  const visibleWorkspaces =
    (data || []) as ResolvedTeamWorkspace[];

  const ownedWorkspace =
    visibleWorkspaces.find(
      (workspace) =>
        workspace.owner_id === userId,
    ) || null;

  return {
    workspace:
      ownedWorkspace ||
      visibleWorkspaces[0] ||
      null,
    error: null,
  };
}

export function isTeamWorkspaceOwner(
  workspace: Pick<ResolvedTeamWorkspace, "owner_id">,
  userId: string,
): boolean {
  return workspace.owner_id === userId;
}
