import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WRITING_SUB_COURSES } from "@/lib/types";

/** "Writing Courses" landing page — one level below the homepage's Writing
 *  Courses card. Shows the A2 / B1 / B2 sub-courses; picking one filters
 *  /quizzes down to that sub-course's quizzes. */
export default async function WritingCoursesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const countsByCategory = new Map<string, number>();
  const { data: quizCategories } = await supabase
    .from("quizzes")
    .select("category")
    .returns<{ category: string | null }[]>();
  for (const row of quizCategories ?? []) {
    if (!row.category) continue;
    countsByCategory.set(row.category, (countsByCategory.get(row.category) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Writing Courses</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Pick your level</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Writing practice is split by level — choose A2, B1, or B2 to see the quizzes for that course.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        {WRITING_SUB_COURSES.map((course) => {
          const count = countsByCategory.get(course.category) ?? 0;
          return (
            <Link
              key={course.category}
              href={`/quizzes?category=${course.category}`}
              className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-7 shadow-card transition-colors hover:border-ink-soft"
            >
              <span
                className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  count > 0 ? "bg-accent-soft text-accent-strong" : "bg-paper-alt text-ink-faint"
                }`}
              >
                {count > 0 ? `${count} quiz${count > 1 ? "zes" : ""} available` : "Coming soon"}
              </span>
              <h2 className="font-display text-xl font-bold text-ink">{course.title}</h2>
              <p className="text-sm text-ink-soft">{course.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
