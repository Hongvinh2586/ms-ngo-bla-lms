import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminQuizRow, QuestionRow } from "@/lib/types";
import QuizForm from "../QuizForm";
import DeleteQuestionButton from "./questions/DeleteQuestionButton";

export default async function EditQuizPage({ params }: { params: { quizId: string } }) {
  const supabase = createClient();

  const { data: quiz } = await supabase
    .from("quizzes")
    .select(
      "id, slug, title, description, level, category, time_limit_minutes, is_published, created_at"
    )
    .eq("id", params.quizId)
    .single<AdminQuizRow>();

  if (!quiz) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("quiz_id", quiz.id)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  const nextOrderIndex = (questions?.length ?? 0) + 1;

  return (
    <div>
      <Link href="/admin/quizzes" className="text-xs font-semibold text-accent">
        ← All quizzes
      </Link>

      <h2 className="mt-2 font-display text-xl font-bold text-ink">Edit quiz</h2>
      <QuizForm mode="edit" quiz={quiz} />

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            Questions ({questions?.length ?? 0})
          </h3>
          <Link
            href={`/admin/quizzes/${quiz.id}/questions/new?order=${nextOrderIndex}`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
          >
            + Add question
          </Link>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {questions?.map((question) => (
            <div
              key={question.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-line bg-surface p-4 shadow-card"
            >
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
                  #{question.order_index} · {question.type.replace(/_/g, " ")} · {question.points} pt
                </span>
                <p className="mt-1 text-sm text-ink">{question.prompt}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/quizzes/${quiz.id}/questions/${question.id}`}
                  className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
                >
                  Edit
                </Link>
                <DeleteQuestionButton questionId={question.id} quizId={quiz.id} />
              </div>
            </div>
          ))}

          {(!questions || questions.length === 0) && (
            <p className="text-ink-soft">No questions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
