import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate for every /admin page: redirects to /login if signed out, or to /
 * if signed in but not an admin. This is a UX convenience only — the real
 * enforcement is the "admin ..." row-level security policies in
 * supabase/schema.sql, which the database checks on every query regardless
 * of what this function does.
 */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return user;
}
