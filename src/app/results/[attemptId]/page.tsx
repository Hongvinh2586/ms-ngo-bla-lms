import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreRing, Stars, praiseFor } from "@/components/FunCard";
import Celebration from "@/components/Celebration";
import { mascotFor } from "@/lib/mascot";
import { computeBadges, type AttemptStat } from "@/lib/badges";
import type {
  FillBlankData,
  MatchingData,
  MultipleChoiceData,
  QuestionRow,
  StudentAnswer,
  TrueFalseData,
} from "@/lib/types";

interface AttemptRow {
  id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  quizzes: { title: string; slug: string } | null;
}

interface AnswerRow {
  id: string;
  question_id: string;
  student_answer: StudentAnswer | null;
  is_correct: boolean;
  points_awarded: number;
  questions: QuestionRow;
}

function formatAnswer(question: QuestionRow, answer: StudentAnswer | null | undefined): string {
  if (!answer) return "No answer";

  switch (question.type) {
    case "multiple_choice": {
      const data = question.data as MultipleChoiceData;
      if (answer.type !== "multiple_choice") return "No answer";
      return data.options?.[answer.selectedIndex] ?? "No answer";
    }
    case "true_false":
      return answer.type === "true_false" ? (answer.value ? "True" : "False") : "No answer";
    case "fill_blank":
    case "sentence_completion":
      return (answer.type === "fill_blank" || answer.type === "sentence_completion") &&
        answer.text
        ? answer.text
        : "No answer";
    case "matching": {
      if (answer.type !== "matching") return "No answer";
      const data = question.data as MatchingData;
      return (data.pairs ?? [])
        .map((pair) => `${pair.left} → ${answer.matches[pair.left] ?? "—"}`)
        .join(", ");
    }
    default:
      return "No answer";
  }
}

function formatCorrectAnswer(question: QuestionRow): string {
  switch (question.type) {
    case "multiple_choice": {
      const data = question.data as MultipleChoiceData;
      return data.options?.[data.correctIndex ?? -1] ?? "—";
    }
    case "true_false": {
      const data = question.data as TrueFalseData;
      return data.correctAnswer ? "True" : "False";
    }
    case "fill_blank":
    case "sentence_completion": {
      const data = question.data as FillBlankData;
      return (data.acceptedAnswers ?? []).join(" / ") || "—";
    }
    case "matching": {
      const data = question.data as MatchingData;
      return (data.pairs ?? []).map((pair) => `${pair.left} → ${pair.right}`).join(", ");
    }
    default:
      return "—";
  }
}

export default async function AttemptResultPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: attempt } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, score, max_score, percentage, submitted_at, quizzes ( title, slug )")
    .eq("id", params.attemptId)
    .eq("student_id", user.id)
    .single<AttemptRow>();

  if (!attempt) {
    notFound();
  }

  const { data: answers } = await supabase
    .from("quiz_answers")
    .select(
      "id, question_id, student_answer, is_correct, points_awarded, questions ( id, quiz_id, order_index, type, prompt, explanation, points, data )"
    )
    .eq("attempt_id", attempt.id)
    .returns<AnswerRow[]>();

  const sortedAnswers = (answers ?? []).sort(
    (a, b) => a.questions.order_index - b.questions.order_index
  );

  // Badges this attempt unlocked: earned with it, but not without it.
  const { data: allAttempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, percentage, submitted_at")
    .eq("student_id", user.id)
    .returns<AttemptStat[]>();
  const upToNow = (allAttempts ?? []).filter((a) => a.submitted_at <= attempt.submitted_at);
  const before = upToNow.filter((a) => a.submitted_at < attempt.submitted_at);
  const alreadyHad = new Set(
    computeBadges(before)
      .filter((b) => b.earned)
      .map((b) => b.id)
  );
  const newBadges = computeBadges(upToNow).filter((b) => b.earned && !alreadyHad.has(b.id));

  const level = praiseFor(attempt.percentage).level;
  const mascot = mascotFor(attempt.quizzes?.title ?? "");
  const mascotSays =
    level >= 3
      ? "I am so proud of you!"
      : level === 2
        ? "Nice work! Shall we go again?"
        : level === 1
          ? "Good try! You can do it!"
          : "Don't give up. I believe in you!";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <Celebration level={praiseFor(attempt.percentage).level} />
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">
        {attempt.quizzes?.title ?? "Quiz result"}
      </p>

      <div className="mt-3 flex flex-col items-center gap-5 rounded-xl2 border-[3px] border-ink bg-tint-butter p-8 text-center shadow-[0_8px_0_#2B3010]">
        <div className="flex flex-col items-center gap-2">
          <span
            className={(level >= 3 ? "mascot-dance" : "mascot-bob") + " text-7xl leading-none"}
            aria-hidden="true"
          >
            {mascot}
          </span>
          <p className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-base font-extrabold text-ink">
            {mascotSays}
          </p>
        </div>
        <Stars count={praiseFor(attempt.percentage).stars} />
        <p className="cheer-pop font-display text-4xl font-extrabold text-ink sm:text-5xl">
          {praiseFor(attempt.percentage).title}
        </p>
        <div className="relative h-[170px] w-[170px]">
          <ScoreRing percentage={attempt.percentage} size={170} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-4xl font-extrabold leading-none text-ink">
              {attempt.score}/{attempt.max_score}
            </p>
            <p className="mt-1 text-base font-extrabold text-ink-soft">{attempt.percentage}%</p>
          </div>
        </div>
        <p className="max-w-sm text-lg font-bold text-ink-soft">
          {praiseFor(attempt.percentage).message}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href={"/quizzes/" + (attempt.quizzes?.slug ?? "")}
            className="press rounded-full bg-accent px-7 py-3.5 text-lg font-extrabold text-white shadow-[0_5px_0_#3E4A12] transition-colors hover:bg-accent-strong"
          >
            Retake this quiz
          </Link>
          <Link
            href="/results"
            className="press rounded-full border-[3px] border-line bg-surface px-7 py-3 text-lg font-extrabold text-ink shadow-[0_5px_0_#CBD1A0]"
          >
            My results
          </Link>
        </div>
      </div>

      {newBadges.length > 0 && (
        <div className="mt-8 rounded-xl2 border-[3px] border-ink bg-white p-6 text-center shadow-[0_6px_0_#2B3010]">
          <p className="font-display text-2xl font-extrabold text-ink">
            {newBadges.length > 1 ? "New badges unlocked!" : "New badge unlocked!"}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {newBadges.map((b) => (
              <div key={b.id} className="flex w-36 flex-col items-center gap-1">
                <span className="mascot-dance text-5xl leading-none" aria-hidden="true">
                  {b.emoji}
                </span>
                <span className="text-base font-extrabold text-ink">{b.title}</span>
                <span className="text-xs font-semibold text-ink-soft">{b.hint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-5">
        {sortedAnswers.map((answer, index) => {
          const question = answer.questions;
          return (
            <div
              key={answer.id}
              className={`rounded-xl2 border-2 p-6 ${
                answer.is_correct ? "border-good/40 bg-good-soft/40" : "border-bad/40 bg-bad-soft/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
                  Question {index + 1}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    answer.is_correct ? "bg-good text-white" : "bg-bad text-white"
                  }`}
                >
                  {answer.is_correct ? "Correct" : "Incorrect"} · {answer.points_awarded}/
                  {question.points} pt
                </span>
              </div>

              <p className="mt-2 font-display text-lg font-semibold text-ink">{question.prompt}</p>

              <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-ink-soft">Your answer</dt>
                  <dd className="text-ink">{formatAnswer(question, answer.student_answer)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-ink-soft">Correct answer</dt>
                  <dd className="text-ink">{formatCorrectAnswer(question)}</dd>
                </div>
              </dl>

              {question.explanation && (
                <p className="mt-3 border-t border-line/70 pt-3 text-sm text-ink-soft">
                  <span className="font-semibold text-ink">Why: </span>
                  {question.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Link href="/results" className="mt-8 inline-block text-sm font-semibold text-accent">
        ← Back to my results
      </Link>
    </div>
  );
}
