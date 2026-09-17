import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";
import RoleSelect from "./RoleSelect";

export default async function AdminStudentsPage() {
  const supabase = createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Students &amp; accounts</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Change someone&apos;s role to <strong>admin</strong> to give them access to this area too.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        {profiles?.map((profile) => (
          <div
            key={profile.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-line bg-surface p-4 shadow-card"
          >
            <div>
              <p className="text-sm font-semibold text-ink">{profile.full_name || "—"}</p>
              <p className="text-xs text-ink-faint">{profile.email ?? "—"}</p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                Joined {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
            <RoleSelect
              profileId={profile.id}
              role={profile.role}
              disabled={profile.id === currentUser?.id}
            />
          </div>
        ))}

        {!error && profiles?.length === 0 && <p className="text-ink-soft">No accounts yet.</p>}
      </div>
    </div>
  );
}
