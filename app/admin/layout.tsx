import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  createServerSupabaseClient,
} from "../lib/supabase/server";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const supabase =
    await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: admin,
    error: adminError,
  } = await supabase
    .from("platform_admins")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (adminError || !admin) {
    redirect("/dashboard");
  }

  return children;
}
