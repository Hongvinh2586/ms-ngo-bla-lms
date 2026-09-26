"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserRole(profileId: string, newRole: string) {
  const supabase = createClient();

  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: profileId,
    new_role: newRole,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
}

/**
 * Invites a student by email instead of the student self-registering: this
 * pre-creates their auth user (so only people you've invited can ever have
 * an account) but lets THEM choose their own password — Supabase emails
 * them a one-time link to /set-password, where they pick it.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SITE_URL to be set
 * (see .env.local.example), and "<site>/set-password" to be added under
 * Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs.
 */
export async function inviteStudent(email: string, fullName: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") {
    throw new Error("Only admins can invite students.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Add it in your Vercel project's Environment Variables " +
        "(e.g. https://your-app.vercel.app), then redeploy."
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
    redirectTo: `${siteUrl.replace(/\/$/, "")}/set-password`,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
}
