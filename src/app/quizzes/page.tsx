import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FEATURED_COURSES, type QuizRow } from "@/lib/types";

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const activeCategory = searchParams.category;

  let query = supabase
    .from("quizzes")
    .select("id, slug, title, description, level, category, time_limit_minutes")
    .order("created_at", { ascending: true });

  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  const { data: quizzes, error } = await query.returns<QuizRow[]>();

  const activeCourse = FEATURED_COURSES.find((c) => c.category === activeCategory);

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Quizzes</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">
        {activeCourse ? activeCourse.title : "Pick a quiz to take"}
      </h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        {activeCourse
          ? activeCourse.description
          : "Each quiz is graded instantly. You can see every explanation right after you submit, and every attempt is saved to your results history."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/quizzes"
          className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !activeCategory
              ? "border-accent bg-accent text-white"
              : "border-line text-ink-soft hover:border-ink-soft"
          }`}
        >
          All
        </Link>
        {FEATURED_COURSES.map((course) => (
          <Link
            key={course.category}
            href={`/quizzes?category=${course.category}`}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === course.category
                ? "border-accent bg-accent text-white"
                : "border-line text-ink-soft hover:border-ink-soft"
            }`}
          >
            {course.title}
          </Link>
        ))}
      </div>

      {error && (
        <p className="mt-8 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          Could not load quizzes: {error.message}
        </p>
      )}

      {!error && (!quizzes || quizzes.length === 0) && (
        <p className="mt-8 text-ink-soft">
          {activeCourse
            ? `No quizzes published in ${activeCourse.title} yet — check back soon.`
            : (
              <>
                No quizzes are published yet — check{" "}
                <code className="rounded bg-paper-alt px-1.5 py-0.5 text-sm">supabase/seed.sql</code>{" "}
                if you expected the sample quiz to be here.
              </>
            )}
        </p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {quizzes?.map((quiz) => (
          <article
            key={quiz.id}
            className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-7 shadow-card"
          >
            {quiz.level && <span className="level-tag">{quiz.level}</span>}
            <h2 className="font-display text-xl font-bold text-ink">{quiz.title}</h2>
            {quiz.description && <p className="text-sm text-ink-soft">{quiz.description}</p>}
            {quiz.time_limit_minutes && (
              <p className="text-xs text-ink-faint">Suggested time: {quiz.time_limit_minutes} min</p>
            )}
            <Link
              href={`/quizzes/${quiz.slug}`}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              Start quiz
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
