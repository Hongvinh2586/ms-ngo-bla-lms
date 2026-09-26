import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client authenticated as the service role — bypasses Row Level
 * Security entirely and can call privileged Auth Admin APIs (like inviting
 * a user by email).
 *
 * SERVER-ONLY. SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so
 * Next.js never bundles it into client-side JavaScript — but that alone
 * doesn't make it safe to call this from just anywhere. Only import this
 * from a Server Action / Route Handler that has already checked the caller
 * is an admin (see inviteStudent in src/app/admin/students/actions.ts for
 * the pattern). Never import it into a "use client" file.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. " +
        "Add SUPABASE_SERVICE_ROLE_KEY in your Vercel project's Environment Variables (Supabase " +
        "Dashboard -> Project Settings -> API -> service_role secret)."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
