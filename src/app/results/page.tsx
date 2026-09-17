import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface AttemptListRow {
  id: string;
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
    .select("id, score, max_score, percentage, submitted_at, quizzes ( title )")
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false })
    .returns<AttemptListRow[]>();

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">My results</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-ink">Your quiz history</h1>

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
            className="flex items-center justify-between gap-4 rounded-xl2 border border-line bg-surface px-6 py-5 shadow-card hover:border-ink-soft transition-colors"
          >
            <div>
              <p className="font-display text-lg font-semibold text-ink">
                {attempt.quizzes?.title ?? "Quiz"}
              </p>
              <p className="text-xs text-ink-faint">
                {new Date(attempt.submitted_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-bold text-ink">
                {attempt.score}/{attempt.max_score}
              </p>
              <p className="text-xs text-ink-faint">{attempt.percentage}%</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
