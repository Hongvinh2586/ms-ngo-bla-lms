import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizRow } from "@/lib/types";
import { FunCard } from "@/components/FunCard";

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
    .or("category.is.null,category.not.like.vocabulary*")
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<QuizRow[]>();

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Writing Courses</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">Lessons for Academic Writing</h1>
      <p className="mt-2 max-w-xl text-lg font-semibold text-ink-soft">
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

      <div className="mt-10 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {lessons?.map((lesson, index) => (
          <FunCard
            key={lesson.id}
            index={index}
            title={lesson.title}
            level={lesson.level}
            href={"/lessons/" + lesson.slug}
            cta="Study now →"
          />
        ))}
      </div>
    </div>
  );
}
