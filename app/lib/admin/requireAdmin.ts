import type { SupabaseClient } from "@supabase/supabase-js";

export async function requirePlatformAdmin(supabase: SupabaseClient) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false as const, status: 401, error: "Unauthorized" };

  const { data, error } = await supabase
    .from("platform_admins")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return { ok: false as const, status: 403, error: "Forbidden" };
  return { ok: true as const, user, role: data.role as string };
}
