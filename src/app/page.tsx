import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FEATURED_COURSES, WRITING_SUB_COURSES } from "@/lib/types";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Count published quizzes per course category so each card can show
  // whether it already has quizzes or is still "coming soon". The
  // `quizzes` row-level security policy only allows signed-in users to
  // read it, so this stays empty (and every card just reads "Sign up to
  // see what's available") until someone is logged in.
  const countsByCategory = new Map<string, number>();
  if (user) {
    const { data: quizCategories } = await supabase
      .from("quizzes")
      .select("category")
      .returns<{ category: string | null }[]>();
    for (const row of quizCategories ?? []) {
      if (!row.category) continue;
      countsByCategory.set(row.category, (countsByCategory.get(row.category) ?? 0) + 1);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-20 text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
        Student area
      </p>
      <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
        {user ? "Welcome back." : "Practice, get graded, keep track of your progress."}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
        Take quizzes for your course, see your score and every explanation right away, and
        review everything you have submitted so far.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <>
            <Link
              href="/quizzes"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
            >
              Go to quizzes
            </Link>
            <Link
              href="/results"
              className="rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              My results
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
            >
              Create a student account
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              Log in
            </Link>
          </>
        )}
      </div>

      <div className="mt-20 text-left">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Courses</p>
        <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
          Featured courses
        </h2>

        <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {FEATURED_COURSES.map((course) => {
            const isWritingParent = course.category === "writing";
            const count = isWritingParent
              ? WRITING_SUB_COURSES.reduce(
                  (sum, sub) => sum + (countsByCategory.get(sub.category) ?? 0),
                  0
                )
              : countsByCategory.get(course.category) ?? 0;
            const href = !user ? "/signup" : isWritingParent ? "/writing" : `/quizzes?category=${course.category}`;
            const badgeText = !user
              ? "Sign up to see what's available"
              : count > 0
                ? `${count} quiz${count > 1 ? "zes" : ""} available`
                : "Coming soon";
            return (
              <Link
                key={course.category}
                href={href}
                className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-7 shadow-card transition-colors hover:border-ink-soft"
              >
                <span
                  className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    user && count > 0
                      ? "bg-accent-soft text-accent-strong"
                      : "bg-paper-alt text-ink-faint"
                  }`}
                >
                  {badgeText}
                </span>
                <h3 className="font-display text-xl font-bold text-ink">{course.title}</h3>
                <p className="text-sm text-ink-soft">{course.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
