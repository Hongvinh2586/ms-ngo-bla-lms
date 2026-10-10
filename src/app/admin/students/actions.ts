"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CLASS_FOLDERS } from "@/lib/classAccess";

/** Server Actions must never `throw` a "normal" error: in a production
 *  build, Next.js redacts any thrown error's message before it reaches the
 *  client and replaces it with a generic "An error occurred in the Server
 *  Components render..." message — so the real reason never shows up in the
 *  UI, only in Vercel's server logs. Every action below returns a plain
 *  result object instead of throwing, and the calling component reads
 *  `result.error` directly rather than relying on try/catch. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export async function setUserRole(profileId: string, newRole: string): Promise<ActionResult> {
  const supabase = createClient();

  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: profileId,
    new_role: newRole,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/students");
  return { ok: true };
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
 *
 * If you're instead using the self-signup allowlist (allowed_students, see
 * migration_005_allowed_students.sql), add the student's email there too —
 * the enforce_allowed_signup_trigger applies to invited accounts as well.
 */
export async function inviteStudent(email: string, fullName: string): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can invite students." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return {
      ok: false,
      error:
        "NEXT_PUBLIC_SITE_URL is not set. Add it in your Vercel project's Environment Variables " +
        "(e.g. https://your-app.vercel.app), then redeploy.",
    };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
    redirectTo: `${siteUrl.replace(/\/$/, "")}/set-password`,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/students");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Allowed-students list — gates who can use /signup. See
// supabase/migration_005_allowed_students.sql for the table, RLS policy,
// is_email_allowed() check, and the enforcing trigger on auth.users.
// ---------------------------------------------------------------------------

type ParsedAllowedStudent = { email: string; fullName: string | null };

// Matches one email address anywhere in a line, so a line copied out of a
// spreadsheet — "Trần Hà Phương<TAB>ha.phuong@gmail.com" or
// "Trần Hà Phương, ha.phuong@gmail.com" — still yields the right email
// regardless of the separator used.
const EMAIL_IN_LINE_PATTERN = /[^\s,;\t]+@[^\s,;\t]+\.[^\s,;\t]+/;

/**
 * Parses text pasted into AllowedStudentsForm — one student per line, name
 * and email in either order, separated by a tab, comma, or just spaces (the
 * shape you get pasting straight out of a spreadsheet or a chat table).
 *
 * A line with no "@" at all (a pasted header row like "Họ tên   Email", a
 * blank line) isn't an attempt to list a student — it's silently skipped,
 * same reasoning as the bulk question importer skipping section titles. A
 * line that DOES contain "@" but not a well-formed email is a genuine typo
 * worth flagging, so those are collected and reported back instead of
 * silently dropped — a mistyped student email is a locked-out student.
 */
function parseAllowedStudentsList(raw: string): {
  parsed: ParsedAllowedStudent[];
  invalidLines: string[];
} {
  const parsed: ParsedAllowedStudent[] = [];
  const invalidLines: string[] = [];

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") continue;
    if (!line.includes("@")) continue;

    const match = line.match(EMAIL_IN_LINE_PATTERN);
    if (!match) {
      invalidLines.push(line);
      continue;
    }

    const email = match[0].toLowerCase();
    const fullName =
      line
        .replace(match[0], "")
        .replace(/[,;\t|]+/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null;

    parsed.push({ email, fullName });
  }

  return { parsed, invalidLines };
}

export type AddAllowedStudentsResult =
  | { ok: true; added: number; invalidLines: string[] }
  | { ok: false; error: string };

export async function addAllowedStudents(rawText: string): Promise<AddAllowedStudentsResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can manage the allowed student list." };
  }

  const { parsed, invalidLines } = parseAllowedStudentsList(rawText);

  if (parsed.length === 0) {
    return {
      ok: false,
      error:
        invalidLines.length > 0
          ? `Không thêm được dòng nào — không tìm thấy email hợp lệ ở: ${invalidLines.join("; ")}`
          : "Không tìm thấy email nào trong nội dung bạn đã dán.",
    };
  }

  const rows = parsed.map((p) => ({
    email: p.email,
    full_name: p.fullName,
    added_by: user.id,
  }));

  const { error } = await supabase.from("allowed_students").upsert(rows, { onConflict: "email" });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/students");
  return { ok: true, added: rows.length, invalidLines };
}

export async function removeAllowedStudent(email: string): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.from("allowed_students").delete().eq("email", email);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/admin/students");
  return { ok: true };
}

/**
 * Limits a student to the given class folders (e.g. only C15D6). An empty list
 * removes the limit, so the student sees everything again. Stored in the
 * student_classes table (see supabase/migration_006_student_classes.sql), which
 * only admins can write.
 */
export async function setStudentClasses(profileId: string, classes: string[]): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be logged in." };
  }
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (me?.role !== "admin") {
    return { ok: false, error: "Only admins can change a student's classes." };
  }

  const valid = new Set(CLASS_FOLDERS.map((f) => f.key));
  const clean = classes.filter((c) => valid.has(c));

  const { error } = await supabase
    .from("student_classes")
    .upsert(
      { student_id: profileId, classes: clean, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );
  if (error) {
    return {
      ok: false,
      error: error.message.toLowerCase().includes("does not exist")
        ? "Chưa có bảng student_classes — cần chạy file supabase/migration_006_student_classes.sql trong Supabase SQL Editor (1 lần)."
        : error.message,
    };
  }

  revalidatePath("/admin/students");
  return { ok: true };
}
