import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toSafeQuestionData } from "@/lib/grading";
import type { QuestionRow, QuizRow, SafeQuestion } from "@/lib/types";
import LessonTabs from "./LessonTabs";

export default async function LessonPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: lesson } = await supabase
    .from("quizzes")
    .select("id, slug, title, level, vocabulary, grammar_notes")
    .eq("slug", params.slug)
    .eq("is_lesson", true)
    .single<QuizRow>();

  if (!lesson) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("quiz_id", lesson.id)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  const safeQuestions: SafeQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    quiz_id: q.quiz_id,
    order_index: q.order_index,
    type: q.type,
    prompt: q.prompt,
    explanation: null,
    points: q.points,
    data: toSafeQuestionData(q),
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      {lesson.level && <span className="level-tag">{lesson.level}</span>}
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">{lesson.title}</h1>

      <LessonTabs
        quizId={lesson.id}
        quizSlug={lesson.slug}
        vocabulary={lesson.vocabulary ?? null}
        grammarNotes={lesson.grammar_notes ?? null}
        questions={safeQuestions}
      />
    </div>
  );
}
