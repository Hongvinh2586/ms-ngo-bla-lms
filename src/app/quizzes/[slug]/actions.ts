"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { gradeAnswer } from "@/lib/grading";
import type { QuestionRow, StudentAnswers } from "@/lib/types";

// Lessons keep their "Advanced Practice" questions in the same quiz, numbered from
// 1000 up. Passing `section` scores only that part; leaving it out scores everything
// (what every regular quiz does).
const ADVANCED_FROM = 1000;

export async function submitQuizAttempt(
  quizId: string,
  answers: StudentAnswers,
  section?: "basic" | "advanced"
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("quiz_id", quizId)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  if (questionsError || !questions || questions.length === 0) {
    throw new Error(questionsError?.message ?? "This quiz has no questions.");
  }

  const scoredQuestions = questions.filter((q) =>
    section === "advanced"
      ? q.order_index >= ADVANCED_FROM
      : section === "basic"
        ? q.order_index < ADVANCED_FROM
        : true
  );

  let score = 0;
  let maxScore = 0;
  const graded = scoredQuestions.map((question) => {
    const result = gradeAnswer(question, answers[question.id]);
    score += result.pointsAwarded;
    maxScore += question.points;
    return { question, result };
  });

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;

  const { data: attempt, error: attemptError } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      student_id: user.id,
      score,
      max_score: maxScore,
      percentage,
    })
    .select("id")
    .single<{ id: string }>();

  if (attemptError || !attempt) {
    throw new Error(attemptError?.message ?? "Could not save this attempt.");
  }

  const answerRows = graded.map(({ question, result }) => ({
    attempt_id: attempt.id,
    question_id: question.id,
    student_answer: answers[question.id] ?? null,
    is_correct: result.isCorrect,
    points_awarded: result.pointsAwarded,
  }));

  const { error: answersError } = await supabase.from("quiz_answers").insert(answerRows);

  if (answersError) {
    throw new Error(answersError.message);
  }

  redirect(`/results/${attempt.id}`);
}
