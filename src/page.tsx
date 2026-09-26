import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AdminQuizRow } from "@/lib/types";
import DeleteQuizButton from "./DeleteQuizButton";

export default async function AdminQuizzesPage() {
  const supabase = createClient();

  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("id, slug, title, description, level, category, time_limit_minutes, is_published, created_at")
    .order("created_at", { ascending: false })
    .returns<AdminQuizRow[]>();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-ink">Quizzes</h2>
        <Link
          href="/admin/quizzes/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
        >
          + New quiz
        </Link>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          {error.message}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {quizzes?.map((quiz) => (
          <div
            key={quiz.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-line bg-surface p-5 shadow-card"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-lg font-semibold text-ink">{quiz.title}</h3>
                {!quiz.is_published && (
                  <span className="rounded-full bg-paper-alt px-2 py-0.5 text-[10px] font-bold uppercase text-ink-faint">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-faint">
                {quiz.category ?? "no course"} · /{quiz.slug}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/quizzes/${quiz.id}`}
                className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
              >
                Edit
              </Link>
              <DeleteQuizButton quizId={quiz.id} quizTitle={quiz.title} />
            </div>
          </div>
        ))}

        {!error && quizzes?.length === 0 && <p className="text-ink-soft">No quizzes yet.</p>}
      </div>
    </div>
  );
}
