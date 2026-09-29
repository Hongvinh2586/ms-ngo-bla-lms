import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdminQuizRow, QuestionRow } from "@/lib/types";
import LessonForm from "../LessonForm";
import DeleteQuestionButton from "../../quizzes/[quizId]/questions/DeleteQuestionButton";
import BulkImportForm from "../../quizzes/[quizId]/questions/BulkImportForm";

export default async function EditLessonPage({ params }: { params: { lessonId: string } }) {
  const supabase = createClient();

  const { data: lesson } = await supabase
    .from("quizzes")
    .select(
      "id, slug, title, description, level, category, time_limit_minutes, vocabulary, grammar_notes, is_lesson, order_index, is_published, created_at"
    )
    .eq("id", params.lessonId)
    .eq("is_lesson", true)
    .single<AdminQuizRow>();

  if (!lesson) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("quiz_id", lesson.id)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  const nextOrderIndex = (questions?.length ?? 0) + 1;

  return (
    <div>
      <Link href="/admin/lessons" className="text-xs font-semibold text-accent">
        ← Tất cả bài học
      </Link>

      <h2 className="mt-2 font-display text-xl font-bold text-ink">Sửa bài học</h2>
      <LessonForm mode="edit" lesson={lesson} />

      <div className="mt-12">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">
            Câu hỏi luyện tập ({questions?.length ?? 0})
          </h3>
          <Link
            href={`/admin/quizzes/${lesson.id}/questions/new?order=${nextOrderIndex}`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
          >
            + Thêm câu hỏi
          </Link>
        </div>

        <p className="mt-2 text-xs text-ink-faint">
          Dùng dạng <strong>Nối thẻ (matching)</strong> để kiểm tra từ vựng với nghĩa, và{" "}
          <strong>Trắc nghiệm (multiple choice)</strong> cho phần luyện tập ngữ pháp/đọc hiểu. Dán
          nhiều câu trắc nghiệm cùng lúc bằng nút bên dưới.
        </p>

        <div className="mt-3">
          <BulkImportForm quizId={lesson.id} nextOrderIndex={nextOrderIndex} />
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
                  href={`/admin/quizzes/${lesson.id}/questions/${question.id}`}
                  className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
                >
                  Edit
                </Link>
                <DeleteQuestionButton questionId={question.id} quizId={lesson.id} />
              </div>
            </div>
          ))}

          {(!questions || questions.length === 0) && (
            <p className="text-ink-soft">Chưa có câu hỏi nào.</p>
          )}
        </div>
      </div>
    </div>
  );
}
