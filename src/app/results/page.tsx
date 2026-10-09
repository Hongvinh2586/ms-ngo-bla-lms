import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScoreRing } from "@/components/FunCard";
import BadgeShelf from "@/components/BadgeShelf";
import { computeBadges, streakOf } from "@/lib/badges";

interface AttemptListRow {
  id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  quizzes: { title: string } | null;
}

export default async function ResultsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, score, max_score, percentage, submitted_at, quizzes ( title )")
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .returns<AttemptListRow[]>();

  const stats = (attempts ?? []).map((a) => ({
    quiz_id: a.quiz_id,
    percentage: Number(a.percentage),
    submitted_at: a.submitted_at,
  }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">My results</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">Your quiz history</h1>

      <BadgeShelf badges={computeBadges(stats)} streak={streakOf(stats)} />

      {(!attempts || attempts.length === 0) && (
        <p className="mt-8 text-ink-soft">
          You haven&apos;t submitted any quizzes yet.{" "}
          <Link href="/quizzes" className="font-semibold text-accent">
            Go take one
          </Link>
          .
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {attempts?.map((attempt) => (
          <Link
            key={attempt.id}
            href={`/results/${attempt.id}`}
            className="flex items-center justify-between gap-4 rounded-xl2 border-[3px] border-ink bg-surface px-6 py-5 shadow-[0_5px_0_#2B3010] transition-transform hover:-translate-y-0.5"
          >
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {attempt.quizzes?.title ?? "Quiz"}
              </p>
              <p className="text-xs text-ink-faint">
                {new Date(attempt.submitted_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-display text-xl font-extrabold text-ink">
                  {attempt.score}/{attempt.max_score}
                </p>
                <p className="text-xs font-bold text-ink-faint">{attempt.percentage}%</p>
              </div>
              <ScoreRing percentage={attempt.percentage} size={52} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
