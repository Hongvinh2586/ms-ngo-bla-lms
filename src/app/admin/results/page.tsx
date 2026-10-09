import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ALL_COURSES } from "@/lib/types";

interface AttemptRow {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  max_score: number;
  percentage: number;
  submitted_at: string;
  quizzes: { title: string; category: string | null } | null;
}

interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface StudentSummary {
  studentId: string;
  quizzes: Set<string>;
  attempts: number;
  totalPct: number;
  last: string;
}

function courseName(category: string): string {
  if (category === "other") return "Other";
  return ALL_COURSES.find((c) => c.category === category)?.title ?? category;
}

function summarise(rows: AttemptRow[]): StudentSummary[] {
  const map = new Map<string, StudentSummary>();
  for (const a of rows) {
    const s = map.get(a.student_id) ?? {
      studentId: a.student_id,
      quizzes: new Set<string>(),
      attempts: 0,
      totalPct: 0,
      last: a.submitted_at,
    };
    s.quizzes.add(a.quiz_id);
    s.attempts += 1;
    s.totalPct += Number(a.percentage);
    if (a.submitted_at > s.last) s.last = a.submitted_at;
    map.set(a.student_id, s);
  }
  return Array.from(map.values()).sort((x, y) => (x.last < y.last ? 1 : -1));
}

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: { course?: string };
}) {
  const supabase = createClient();

  const { data: attempts, error } = await supabase
    .from("quiz_attempts")
    .select(
      "id, student_id, quiz_id, score, max_score, percentage, submitted_at, quizzes ( title, category )"
    )
    .order("submitted_at", { ascending: false })
    .limit(1000)
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
  const nameOf = (id: string) => {
    const p = profileById.get(id);
    return p?.full_name || p?.email || "—";
  };

  // Group the attempts by the course folder of the quiz (C16D7, A2, ...).
  const byCourse = new Map<string, AttemptRow[]>();
  for (const a of attempts ?? []) {
    const key = a.quizzes?.category ?? "other";
    const list = byCourse.get(key) ?? [];
    list.push(a);
    byCourse.set(key, list);
  }
  const courseKeys = Array.from(byCourse.keys()).sort((a, b) =>
    courseName(a).localeCompare(courseName(b))
  );
  const active =
    searchParams.course && byCourse.has(searchParams.course) ? searchParams.course : null;
  const shownKeys = active ? [active] : courseKeys;

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-ink">Results</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Students grouped by the course folder they practise in. Most recent 1000 attempts.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          {error.message}
        </p>
      )}

      {!error && (!attempts || attempts.length === 0) && (
        <p className="mt-6 text-ink-soft">No quiz attempts yet.</p>
      )}

      {attempts && attempts.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/admin/results"
              className={
                "rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors " +
                (!active
                  ? "border-ink bg-accent text-white"
                  : "border-line bg-surface text-ink hover:border-ink-soft")
              }
            >
              All courses ({studentIds.length})
            </Link>
            {courseKeys.map((key) => {
              const count = summarise(byCourse.get(key) ?? []).length;
              return (
                <Link
                  key={key}
                  href={"/admin/results?course=" + encodeURIComponent(key)}
                  className={
                    "rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors " +
                    (active === key
                      ? "border-ink bg-accent text-white"
                      : "border-line bg-surface text-ink hover:border-ink-soft")
                  }
                >
                  {courseName(key)} ({count})
                </Link>
              );
            })}
          </div>

          {shownKeys.map((key) => {
            const rows = byCourse.get(key) ?? [];
            const students = summarise(rows);
            return (
              <section key={key} className="mt-8">
                <h3 className="font-display text-lg font-bold text-ink">
                  {courseName(key)}{" "}
                  <span className="text-sm font-semibold text-ink-faint">
                    · {students.length} {students.length === 1 ? "student" : "students"} ·{" "}
                    {rows.length} {rows.length === 1 ? "attempt" : "attempts"}
                  </span>
                </h3>

                <div className="mt-3 overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs font-semibold uppercase tracking-widest text-ink-faint">
                        <th className="px-5 py-3">Student</th>
                        <th className="px-5 py-3">Quizzes done</th>
                        <th className="px-5 py-3">Attempts</th>
                        <th className="px-5 py-3">Average</th>
                        <th className="px-5 py-3">Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.studentId} className="border-b border-line/60 last:border-0">
                          <td className="px-5 py-3 font-semibold text-ink">{nameOf(s.studentId)}</td>
                          <td className="px-5 py-3 text-ink">{s.quizzes.size}</td>
                          <td className="px-5 py-3 text-ink-soft">{s.attempts}</td>
                          <td className="px-5 py-3 text-ink">
                            {Math.round(s.totalPct / s.attempts)}%
                          </td>
                          <td className="px-5 py-3 text-ink-faint">
                            {new Date(s.last).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!active && (
                  <Link
                    href={"/admin/results?course=" + encodeURIComponent(key)}
                    className="mt-2 inline-block text-sm font-bold text-accent"
                  >
                    See every attempt in {courseName(key)} →
                  </Link>
                )}

                {active && (
                  <div className="mt-5 overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card">
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
                        {rows.map((attempt) => (
                          <tr key={attempt.id} className="border-b border-line/60 last:border-0">
                            <td className="px-5 py-3 text-ink">{nameOf(attempt.student_id)}</td>
                            <td className="px-5 py-3 text-ink-soft">{attempt.quizzes?.title ?? "—"}</td>
                            <td className="px-5 py-3 text-ink">
                              {attempt.score}/{attempt.max_score} ({attempt.percentage}%)
                            </td>
                            <td className="px-5 py-3 text-ink-faint">
                              {new Date(attempt.submitted_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
