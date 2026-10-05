import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALL_COURSES, VOCAB_FOLDERS, type QuizRow } from "@/lib/types";

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
    .eq("is_lesson", false)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }

  const { data: quizzes, error } = await query.returns<QuizRow[]>();

  // Vocabulary Builder is a folder of books (VOCAB_FOLDERS). The hub page lists
  // the books as cards; opening a book lists that book's lessons.
  const activeFolder = VOCAB_FOLDERS.find((f) => f.category === activeCategory);
  const isVocabHub = activeCategory === "vocabulary";
  let lessonItems: QuizRow[] = [];
  if (activeFolder) {
    const { data: folderLessons } = await supabase
      .from("quizzes")
      .select("id, slug, title, description, level, category, time_limit_minutes")
      .eq("is_lesson", true)
      .eq("is_published", true)
      .eq("category", activeFolder.category)
      .order("order_index", { ascending: true })
      .returns<QuizRow[]>();
    lessonItems = folderLessons ?? [];
  }
  const folderCounts = new Map<string, number>();
  if (isVocabHub) {
    const { data: folderRows } = await supabase
      .from("quizzes")
      .select("category")
      .eq("is_lesson", true)
      .eq("is_published", true)
      .in(
        "category",
        VOCAB_FOLDERS.map((f) => f.category)
      )
      .returns<{ category: string | null }[]>();
    for (const row of folderRows ?? []) {
      if (!row.category) continue;
      folderCounts.set(row.category, (folderCounts.get(row.category) ?? 0) + 1);
    }
  }
  const items = [
    ...lessonItems.map((q) => ({ ...q, isLesson: true })),
    ...(quizzes ?? []).map((q) => ({ ...q, isLesson: false })),
  ];

  const activeCourse = ALL_COURSES.find((c) => c.category === activeCategory);
  const isWritingSubCourse = activeCategory?.startsWith("writing-") ?? false;

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      {isWritingSubCourse && (
        <Link
          href="/writing"
          className="mb-3 inline-block text-xs font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to Writing Courses
        </Link>
      )}
      {activeFolder && (
        <Link
          href="/quizzes?category=vocabulary"
          className="mb-3 inline-block text-xs font-semibold text-ink-soft hover:text-ink"
        >
          ← Back to Vocabulary Builder
        </Link>
      )}
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {activeFolder ? "Vocabulary Builder" : "Quizzes"}
      </p>
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
        {ALL_COURSES.filter((c) => !VOCAB_FOLDERS.some((f) => f.category === c.category)).map((course) => (
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

      {isVocabHub && VOCAB_FOLDERS.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Books</p>
          <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {VOCAB_FOLDERS.map((folder) => {
              const count = folderCounts.get(folder.category) ?? 0;
              return (
                <Link
                  key={folder.category}
                  href={`/quizzes?category=${folder.category}`}
                  className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-7 shadow-card transition-colors hover:border-ink-soft"
                >
                  <span
                    className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      count > 0 ? "bg-accent-soft text-accent-strong" : "bg-paper-alt text-ink-faint"
                    }`}
                  >
                    {count > 0 ? `${count} lesson${count > 1 ? "s" : ""}` : "Coming soon"}
                  </span>
                  <h2 className="font-display text-xl font-bold text-ink">{folder.title}</h2>
                  <p className="text-sm text-ink-soft">{folder.description}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-8 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          Could not load quizzes: {error.message}
        </p>
      )}

      {!error && items.length === 0 && !(isVocabHub && VOCAB_FOLDERS.length > 0) && (
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
        {items.map((quiz) => (
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
              href={quiz.isLesson ? `/lessons/${quiz.slug}` : `/quizzes/${quiz.slug}`}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              {quiz.isLesson ? "Study now →" : "Start quiz"}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
