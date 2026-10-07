import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WRITING_SUB_COURSES } from "@/lib/types";
import { FunLink } from "@/components/FunCard";

/** "Writing Courses" landing page — one level below the homepage's Writing
 *  Courses card. Shows the A2 / B1 / B2 sub-courses (quizzes) plus Lessons,
 *  side by side; picking a sub-course filters /quizzes down to that
 *  sub-course's quizzes, picking Lessons goes to /lessons. */
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

  const { count: lessonCount } = await supabase
    .from("quizzes")
    .select("id", { count: "exact", head: true })
    .eq("is_lesson", true)
    .eq("is_published", true)
    .or("category.is.null,and(category.not.like.vocabulary*,category.neq.writing-c15d6)");

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Writing Courses</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">Pick your level</h1>
      <p className="mt-2 max-w-xl text-lg font-semibold text-ink-soft">
        Writing practice is split by level — choose A2, B1, or B2 to see the quizzes for that course,
        or open Lessons for Academic Writing to study structures and practise by topic.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {WRITING_SUB_COURSES.map((course, courseIndex) => {
          const count = countsByCategory.get(course.category) ?? 0;
          return (
            <FunLink
              key={course.category}
              index={courseIndex}
              href={"/quizzes?category=" + course.category}
              title={course.title}
              description={course.description}
              badge={count > 0 ? count + (count > 1 ? " quizzes available" : " quiz available") : "Coming soon"}
              highlight={count > 0}
              cta="Open"
            />
          );
        })}

        <FunLink
          index={WRITING_SUB_COURSES.length}
          href="/lessons"
          title="Lessons for Academic Writing"
          description="Structures and practice for every topic."
          badge={(lessonCount ?? 0) > 0 ? lessonCount + (lessonCount! > 1 ? " lessons available" : " lesson available") : "Coming soon"}
          highlight={(lessonCount ?? 0) > 0}
          cta="Open"
        />
      </div>
    </div>
  );
}
