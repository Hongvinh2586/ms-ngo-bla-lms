import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizRow } from "@/lib/types";

export default async function LessonsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lessons, error } = await supabase
    .from("quizzes")
    .select("id, slug, title, level")
    .eq("is_lesson", true)
    .eq("is_published", true)
    .or("category.is.null,category.neq.vocabulary")
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<QuizRow[]>();

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Writing Courses</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Lessons for Academic Writing</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Each lesson has its own structures, practice and advanced practice.
      </p>

      {error && (
        <p className="mt-8 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          Could not load the lessons: {error.message}
        </p>
      )}

      {!error && (!lessons || lessons.length === 0) && (
        <p className="mt-8 text-ink-soft">No lessons have been published yet.</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {lessons?.map((lesson) => (
          <article
            key={lesson.id}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-7 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            {lesson.level && <span className="level-tag">{lesson.level}</span>}
            <h2 className="font-display text-2xl font-bold text-ink">{lesson.title}</h2>
            <Link
              href={`/lessons/${lesson.slug}`}
              className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-base font-bold text-white shadow-card transition-colors hover:bg-accent-strong"
            >
              Study now →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
