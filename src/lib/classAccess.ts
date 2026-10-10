import type { SupabaseClient, User } from "@supabase/supabase-js";

/** The "class folders" a student account can be limited to. A student with no
 *  folders ticked (the default) sees everything; admins and teachers always do. */
export const CLASS_FOLDERS: { key: string; label: string }[] = [
  { key: "writing-b1-b2", label: "C16D7 (B1-B2)" },
  { key: "writing-a2", label: "A2 Writing" },
  { key: "writing-c15d6", label: "C15D6" },
  { key: "writing-b1", label: "B1 Writing" },
  { key: "writing-b2", label: "B2 Writing" },
  { key: "vocabulary", label: "Vocabulary Builder" },
  { key: "ielts", label: "IELTS Preparation" },
  { key: "lessons", label: "Lessons for Academic Writing" },
];

const KNOWN_FOLDERS = new Set(CLASS_FOLDERS.map((f) => f.key));

/** Which class folder a quiz/lesson category belongs to. */
export function folderOf(category: string | null | undefined): string {
  if (!category) return "lessons";
  if (category.startsWith("vocabulary")) return "vocabulary";
  return KNOWN_FOLDERS.has(category) ? category : "lessons";
}

/** null = unrestricted. Otherwise the list of folder keys the student may open.
 *  Assignments live in the student_classes table (supabase/migration_006_student_classes.sql);
 *  if that table does not exist yet, nobody is restricted. */
export async function allowedFolders(supabase: SupabaseClient, user: User): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("student_classes")
    .select("classes")
    .eq("student_id", user.id)
    .maybeSingle<{ classes: string[] | null }>();
  if (error || !data || !Array.isArray(data.classes) || data.classes.length === 0) return null;

  // Admins and teachers are never restricted.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();
  if (profile?.role && profile.role !== "student") return null;

  return data.classes;
}

export function canSee(allowed: string[] | null, category: string | null | undefined): boolean {
  return allowed === null || allowed.includes(folderOf(category));
}
