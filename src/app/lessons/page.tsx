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
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<QuizRow[]>();

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Bài học</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Các bài học</h1>
      <p className="mt-2 max-w-xl text-ink-soft">
        Mỗi bài học có phần từ vựng, cấu trúc ngữ pháp, và luyện tập riêng.
      </p>

      {error && (
        <p className="mt-8 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          Không tải được danh sách bài học: {error.message}
        </p>
      )}

      {!error && (!lessons || lessons.length === 0) && (
        <p className="mt-8 text-ink-soft">Chưa có bài học nào được xuất bản.</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        {lessons?.map((lesson) => (
          <article
            key={lesson.id}
            className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-7 shadow-card"
          >
            {lesson.level && <span className="level-tag">{lesson.level}</span>}
            <h2 className="font-display text-xl font-bold text-ink">{lesson.title}</h2>
            <Link
              href={`/lessons/${lesson.slug}`}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              Học bài →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
