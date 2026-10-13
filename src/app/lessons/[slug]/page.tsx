import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toSafeQuestionData } from "@/lib/grading";
import type { QuestionRow, QuizRow, SafeQuestion } from "@/lib/types";
import LessonTabs, { type PartStatus } from "./LessonTabs";
import { allowedFolders, canSee } from "@/lib/classAccess";

// Questions numbered 1000 and up are the lesson's "Advanced Practice" (B2-B2+).
const ADVANCED_FROM = 1000;
// Practice can be split into Structures (below 500) and Vocabulary (500 and up).
const VOCAB_FROM = 500;

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
    .select("id, slug, title, level, category, vocabulary, grammar_notes")
    .eq("slug", params.slug)
    .eq("is_lesson", true)
    .single<QuizRow>();

  if (!lesson) {
    notFound();
  }

  // Students limited to certain class folders cannot open lessons from other folders.
  const allowed = await allowedFolders(supabase, user);
  if (!canSee(allowed, lesson.category)) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("id, quiz_id, order_index, type, prompt, explanation, points, data")
    .eq("quiz_id", lesson.id)
    .order("order_index", { ascending: true })
    .returns<QuestionRow[]>();

  // Which parts of this lesson the student has already done, and their best score in each.
  // An attempt does not store its part, so it is read from the first question answered.
  const allQuestions = questions ?? [];
  const hasTwoQuizzes =
    allQuestions.some((q) => q.order_index < VOCAB_FROM) &&
    allQuestions.some((q) => q.order_index >= VOCAB_FROM && q.order_index < ADVANCED_FROM);
  const partOf = (order: number): string =>
    order >= ADVANCED_FROM ? "advanced" : hasTwoQuizzes ? (order < VOCAB_FROM ? "structures" : "vocabulary") : "basic";
  const orderOfQuestion = new Map<string, number>();
  for (const q of allQuestions) orderOfQuestion.set(q.id, q.order_index);

  const partStatus: PartStatus = {};
  const { data: myAttempts } = await supabase
    .from("quiz_attempts")
    .select("id, percentage")
    .eq("quiz_id", lesson.id)
    .eq("student_id", user.id)
    .returns<{ id: string; percentage: number }[]>();
  const attemptList = myAttempts ?? [];
  for (let i = 0; i < attemptList.length; i += 15) {
    const chunk = attemptList.slice(i, i + 15);
    const { data: answers } = await supabase
      .from("quiz_answers")
      .select("attempt_id, question_id")
      .in(
        "attempt_id",
        chunk.map((a) => a.id)
      )
      .range(0, 999)
      .returns<{ attempt_id: string; question_id: string }[]>();
    const firstOrder = new Map<string, number>();
    for (const r of answers ?? []) {
      const o = orderOfQuestion.get(r.question_id);
      if (o !== undefined && !firstOrder.has(r.attempt_id)) firstOrder.set(r.attempt_id, o);
    }
    for (const a of chunk) {
      const o = firstOrder.get(a.id);
      if (o === undefined) continue;
      const key = partOf(o);
      const pct = Math.round(Number(a.percentage));
      const cur = partStatus[key] ?? { attempts: 0, best: 0 };
      partStatus[key] = { attempts: cur.attempts + 1, best: Math.max(cur.best, pct) };
    }
  }

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
      <div className="rounded-xl2 border border-accent/15 bg-accent-soft px-6 py-6">
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-accent-strong">
            {lesson.category?.startsWith("vocabulary") ? "Vocabulary" : "Lesson"}
          </p>
          {lesson.level && <span className="level-tag">{lesson.level}</span>}
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">{lesson.title}</h1>
      </div>

      <LessonTabs
        quizId={lesson.id}
        quizSlug={lesson.slug}
        vocabulary={lesson.vocabulary ?? null}
        grammarNotes={lesson.grammar_notes ?? null}
        questions={safeQuestions.filter((q) => q.order_index < ADVANCED_FROM)}
        advancedQuestions={safeQuestions.filter((q) => q.order_index >= ADVANCED_FROM)}
        plainPractice={lesson.category === "ielts" || lesson.category === "vocabulary-academic-word-list"}
        partStatus={partStatus}
      />
    </div>
  );
}
