import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toSafeQuestionData } from "@/lib/grading";
import type { QuestionRow, QuizRow, SafeQuestion } from "@/lib/types";
import QuizRunner from "./QuizRunner";

export default async function TakeQuizPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, title, description, level, time_limit_minutes")
    .eq("slug", params.slug)
    .single<QuizRow>();

  if (!quiz) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("quiz_id", quiz.id)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  // Strip correct-answer fields before this ever reaches the browser.
  const safeQuestions: SafeQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    quiz_id: q.quiz_id,
    order_index: q.order_index,
    type: q.type,
    prompt: q.prompt,
    explanation: null, // shown only after submission, on the results page
    points: q.points,
    data: toSafeQuestionData(q),
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      {quiz.level && <span className="level-tag">{quiz.level}</span>}
      <h1 className="mt-3 font-display text-3xl font-bold text-ink">{quiz.title}</h1>
      {quiz.description && <p className="mt-2 text-ink-soft">{quiz.description}</p>}

      {safeQuestions.length === 0 ? (
        <p className="mt-8 text-ink-soft">This quiz has no questions yet.</p>
      ) : (
        <QuizRunner quizId={quiz.id} quizSlug={quiz.slug} questions={safeQuestions} />
      )}
    </div>
  );
}
