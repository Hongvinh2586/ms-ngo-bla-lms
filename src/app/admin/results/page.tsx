import { createClient } from "@/lib/supabase/server";

interface AttemptRow {
  id: string;
  student_id: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  quizzes: { title: string } | null;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

export default async function AdminResultsPage() {
  const supabase = createClient();

  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select("id, student_id, score, max_score, percentage, submitted_at, quizzes ( title )")
    .order("submitted_at", { ascending: false })
    .limit(200)
    .returns<AttemptRow[]>();

  // quiz_attempts.student_id references auth.users, not public.profiles
  // directly, so PostgREST can't embed profiles in the query above — look
  // student names up separately instead.
  const studentIds = Array.from(new Set((attempts ?? []).map((a) => a.student_id)));
  const { data: profiles } = studentIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds)
        .returns<ProfileLite[]>()
    : { data: [] as ProfileLite[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Results</h2>
      <p className="mt-1 text-sm text-ink-soft">Most recent 200 attempts, across all students.</p>

      {error && (
        <p className="mt-4 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          {error.message}
        </p>
      )}

      {!error && (!attempts || attempts.length === 0) && (
        <p className="mt-6 text-ink-soft">No quiz attempts yet.</p>
      )}

      {attempts && attempts.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-widest text-ink-faint">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Quiz</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => {
                const profile = profileById.get(attempt.student_id);
                return (
                  <tr key={attempt.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-3 text-ink">
                      {profile?.full_name || profile?.email || "—"}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{attempt.quizzes?.title ?? "—"}</td>
                    <td className="px-5 py-3 text-ink">
                      {attempt.score}/{attempt.max_score} ({attempt.percentage}%)
                    </td>
                    <td className="px-5 py-3 text-ink-faint">
                      {new Date(attempt.submitted_at).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
