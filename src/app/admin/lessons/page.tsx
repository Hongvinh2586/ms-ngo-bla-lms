import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AdminQuizRow } from "@/lib/types";
import DeleteLessonButton from "./DeleteLessonButton";

export default async function AdminLessonsPage() {
  const supabase = createClient();

  const { data: lessons, error } = await supabase
    .from("quizzes")
    .select("id, slug, title, level, order_index, is_published, created_at")
    .eq("is_lesson", true)
    .order("order_index", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .returns<AdminQuizRow[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">Lessons</h2>
        <Link
          href="/admin/lessons/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
        >
          + New lesson
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          {error.message}
          {error.message.toLowerCase().includes("column") && (
            <> — Hãy chạy lại SQL ở Bước 1 trong Supabase SQL Editor trước.</>
          )}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {lessons?.map((lesson) => (
          <div
            key={lesson.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-line bg-surface p-5 shadow-card"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-ink">{lesson.title}</h3>
                {!lesson.is_published && (
                  <span className="rounded-full bg-paper-alt px-2 py-0.5 text-[10px] font-bold uppercase text-ink-faint">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-faint">/{lesson.slug}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/lessons/${lesson.id}`}
                className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
              >
                Edit
              </Link>
              <DeleteLessonButton lessonId={lesson.id} lessonTitle={lesson.title} />
            </div>
          </div>
        ))}

        {!error && lessons?.length === 0 && <p className="text-ink-soft">Chưa có bài học nào.</p>}
      </div>
    </div>
  );
}
