import { createClient } from "@/lib/supabase/server";
import type { AllowedStudentRow, ProfileRow } from "@/lib/types";
import RoleSelect from "./RoleSelect";
import ClassPicker from "./ClassPicker";
import { createAdminClient } from "@/lib/supabase/admin";
import InviteStudentForm from "./InviteStudentForm";
import AllowedStudentsForm from "./AllowedStudentsForm";
import RemoveAllowedStudentButton from "./RemoveAllowedStudentButton";

/** Each account's class folders (stored in the auth user's app_metadata). */
async function loadClasses(): Promise<{ map: Map<string, string[]>; error: string | null }> {
  const map = new Map<string, string[]>();
  try {
    const admin = createAdminClient();
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return { map, error: error.message };
      for (const u of data.users) {
        const c = (u.app_metadata as { classes?: unknown } | undefined)?.classes;
        if (Array.isArray(c)) {
          map.set(u.id, c.filter((x): x is string => typeof x === "string"));
        }
      }
      if (data.users.length < 200) break;
    }
  } catch (err) {
    return { map, error: err instanceof Error ? err.message : String(err) };
  }
  return { map, error: null };
}

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

  // Requires supabase/migration_005_allowed_students.sql to have been run —
  // on a project that hasn't run it yet, this select just errors quietly
  // (allowedError) and the section below shows that error instead of the list.
  const { data: allowedStudents, error: allowedError } = await supabase
    .from("allowed_students")
    .select("email, full_name, created_at")
    .order("created_at", { ascending: false })
    .returns<AllowedStudentRow[]>();

  const { map: classesById, error: classesError } = await loadClasses();

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

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">
          Danh sách được phép đăng ký
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Học sinh tự vào <code className="rounded bg-paper px-1">/signup</code> để tạo tài khoản và
          tự đặt mật khẩu — nhưng chỉ email có trong danh sách dưới đây mới đăng ký được. Dán danh
          sách tên + email học sinh (thu thập từ phụ huynh) vào đây trước.
        </p>
        <div className="mt-3">
          <AllowedStudentsForm />
        </div>

        {allowedError && (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
            {allowedError.message}
            {allowedError.message.toLowerCase().includes("does not exist") && (
              <>
                {" "}
                — cần chạy file{" "}
                <code className="rounded bg-paper px-1">
                  supabase/migration_005_allowed_students.sql
                </code>{" "}
                trong Supabase SQL Editor trước (chỉ cần chạy 1 lần).
              </>
            )}
          </p>
        )}

        {!allowedError && (
          <div className="mt-3 flex flex-col gap-1.5">
            {allowedStudents?.map((student) => (
              <div
                key={student.email}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3.5 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{student.full_name || "—"}</p>
                  <p className="text-xs text-ink-faint">{student.email}</p>
                </div>
                <RemoveAllowedStudentButton email={student.email} />
              </div>
            ))}
            {allowedStudents?.length === 0 && (
              <p className="text-sm text-ink-soft">Chưa có email nào trong danh sách.</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-10">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">
          Hoặc: mời học viên mới qua email
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Cách khác thay vì tự đăng ký ở trên — nhập email, học viên sẽ nhận một email mời để tự đặt
          mật khẩu của họ, bạn không cần đặt mật khẩu thay họ. Cần cấu hình thêm (xem
          .env.local.example).
        </p>
        <div className="mt-3">
          <InviteStudentForm />
        </div>
      </div>

      <p className="mt-10 text-xs font-bold uppercase tracking-widest text-ink-faint">
        Tài khoản đã đăng ký ({profiles?.length ?? 0})
      </p>
      <p className="mt-1 text-xs text-ink-soft">
        Bấm chọn lớp/folder mà từng học sinh được vào. Học sinh chưa chọn lớp nào thì thấy tất cả như
        bình thường; admin và teacher luôn thấy tất cả.
      </p>
      {classesError && (
        <p className="mt-3 whitespace-pre-wrap rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          Chưa lưu được lớp cho học sinh: {classesError}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
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
            {profile.role === "student" && !classesError && (
              <ClassPicker profileId={profile.id} initial={classesById.get(profile.id) ?? []} />
            )}
          </div>
        ))}

        {!error && profiles?.length === 0 && <p className="text-ink-soft">No accounts yet.</p>}
      </div>
    </div>
  );
}
