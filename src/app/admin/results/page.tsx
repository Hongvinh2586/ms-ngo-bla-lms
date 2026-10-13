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

interface QuestionLite {
  id: string;
  quiz_id: string;
  order_index: number;
  points: number;
}

interface SectionDef {
  label: string;
  max: number;
  from: number; // first question number of this part
  to: number; // up to (not including)
}

interface StudentSummary {
  studentId: string;
  quizzes: Set<string>;
  attempts: number;
  totalPct: number;
  last: string;
  lastRow: AttemptRow;
}

interface TestProgress {
  key: string;
  title: string;
  section: string;
  items: AttemptRow[]; // oldest first
}

// Lessons keep several practice parts in one quiz, told apart by question number:
// below 500 = Structures, 500-999 = Vocabulary (only when a lesson has both),
// 1000 and up = Practice 2 / Advanced. Attempts do not store which part was done,
// so it is worked out from the attempt's maximum score.
const ADVANCED_FROM = 1000;
const VOCAB_FROM = 500;

function courseName(category: string): string {
  if (category === "other") return "Other";
  return ALL_COURSES.find((c) => c.category === category)?.title ?? category;
}

function buildSections(qs: QuestionLite[]): SectionDef[] {
  const sum = (f: (q: QuestionLite) => boolean) =>
    qs.filter(f).reduce((t, q) => t + Number(q.points), 0);
  const isAdv = (q: QuestionLite) => q.order_index >= ADVANCED_FROM;
  const isVocab = (q: QuestionLite) =>
    q.order_index >= VOCAB_FROM && q.order_index < ADVANCED_FROM;
  const isStruct = (q: QuestionLite) => q.order_index < VOCAB_FROM;
  const hasAdv = qs.some(isAdv);
  const hasVocab = qs.some(isVocab);
  const defs: SectionDef[] = [];
  if (hasVocab) {
    if (qs.some(isStruct)) defs.push({ label: "Structures", max: sum(isStruct), from: 0, to: VOCAB_FROM });
    defs.push({ label: "Vocabulary", max: sum(isVocab), from: VOCAB_FROM, to: ADVANCED_FROM });
  } else if (hasAdv) {
    defs.push({ label: "Practice 1", max: sum((q) => !isAdv(q)), from: 0, to: ADVANCED_FROM });
  }
  if (hasAdv)
    defs.push({
      label: hasVocab ? "Advanced" : "Practice 2",
      max: sum(isAdv),
      from: ADVANCED_FROM,
      to: 1000000,
    });
  return defs;
}

function sectionLabel(defs: SectionDef[], maxScore: number): string {
  if (defs.length === 0) return "";
  const hits = defs.filter((d) => Math.abs(d.max - Number(maxScore)) < 0.01);
  return hits.map((d) => d.label).join(" / ");
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
      lastRow: a,
    };
    s.quizzes.add(a.quiz_id);
    s.attempts += 1;
    s.totalPct += Number(a.percentage);
    if (a.submitted_at > s.last) {
      s.last = a.submitted_at;
      s.lastRow = a;
    }
    map.set(a.student_id, s);
  }
  return Array.from(map.values()).sort((x, y) => (x.last < y.last ? 1 : -1));
}

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: { course?: string; student?: string };
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

  // Question point totals per quiz, to tell Practice 1 from Practice 2 attempts.
  const quizIds = Array.from(new Set((attempts ?? []).map((a) => a.quiz_id)));
  const questionsByQuiz = new Map<string, QuestionLite[]>();
  if (quizIds.length > 0) {
    for (let from = 0; from < 20000; from += 1000) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, quiz_id, order_index, points")
        .in("quiz_id", quizIds)
        .order("id", { ascending: true })
        .range(from, from + 999)
        .returns<QuestionLite[]>();
      for (const q of qs ?? []) {
        const list = questionsByQuiz.get(q.quiz_id) ?? [];
        list.push(q);
        questionsByQuiz.set(q.quiz_id, list);
      }
      if (!qs || qs.length < 1000) break;
    }
  }
  const sectionsByQuiz = new Map<string, SectionDef[]>();
  questionsByQuiz.forEach((qs, quizId) => sectionsByQuiz.set(quizId, buildSections(qs)));
  const matchingDefs = (a: AttemptRow) =>
    (sectionsByQuiz.get(a.quiz_id) ?? []).filter(
      (d) => Math.abs(d.max - Number(a.max_score)) < 0.01
    );
  // Two parts with the same total score cannot be told apart by score alone, so for those
  // attempts look at which questions the student actually answered.
  const ambiguous = (attempts ?? []).filter((a) => matchingDefs(a).length > 1);
  const orderOfQuestion = new Map<string, number>();
  questionsByQuiz.forEach((qs) => qs.forEach((q) => orderOfQuestion.set(q.id, q.order_index)));
  const resolvedSection = new Map<string, string>();
  for (let i = 0; i < ambiguous.length; i += 15) {
    const chunk = ambiguous.slice(i, i + 15);
    const { data: ans } = await supabase
      .from("quiz_answers")
      .select("attempt_id, question_id")
      .in(
        "attempt_id",
        chunk.map((a) => a.id)
      )
      .range(0, 999)
      .returns<{ attempt_id: string; question_id: string }[]>();
    const firstOrder = new Map<string, number>();
    for (const r of ans ?? []) {
      const o = orderOfQuestion.get(r.question_id);
      if (o !== undefined && !firstOrder.has(r.attempt_id)) firstOrder.set(r.attempt_id, o);
    }
    for (const a of chunk) {
      const o = firstOrder.get(a.id);
      if (o === undefined) continue;
      const hit = matchingDefs(a).find((d) => o >= d.from && o < d.to);
      if (hit) resolvedSection.set(a.id, hit.label);
    }
  }
  const sectionOf = (a: AttemptRow) =>
    resolvedSection.get(a.id) ?? sectionLabel(sectionsByQuiz.get(a.quiz_id) ?? [], a.max_score);
  const testName = (a: AttemptRow) => {
    const sec = sectionOf(a);
    return (a.quizzes?.title ?? "—") + (sec ? " · " + sec : "");
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
  const studentFilter = active && searchParams.student ? searchParams.student : null;

  // For one course: per student -> per test -> attempts (oldest first), plus attempt numbers.
  function buildProgress(rows: AttemptRow[]) {
    const asc = [...rows].sort((x, y) => (x.submitted_at < y.submitted_at ? -1 : 1));
    const perStudent = new Map<string, Map<string, TestProgress>>();
    const attemptNo = new Map<string, number>();
    for (const a of asc) {
      const tests = perStudent.get(a.student_id) ?? new Map<string, TestProgress>();
      const key = a.quiz_id + "|" + sectionOf(a);
      const t = tests.get(key) ?? {
        key,
        title: a.quizzes?.title ?? "—",
        section: sectionOf(a),
        items: [],
      };
      t.items.push(a);
      attemptNo.set(a.id, t.items.length);
      tests.set(key, t);
      perStudent.set(a.student_id, tests);
    }
    return { perStudent, attemptNo };
  }

  const th = "px-5 py-3";

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
            const allRows = byCourse.get(key) ?? [];
            const rows = studentFilter
              ? allRows.filter((a) => a.student_id === studentFilter)
              : allRows;
            const students = summarise(rows);
            const { perStudent, attemptNo } = buildProgress(rows);
            return (
              <section key={key} className="mt-8">
                <h3 className="font-display text-lg font-bold text-ink">
                  {courseName(key)}{" "}
                  <span className="text-sm font-semibold text-ink-faint">
                    · {students.length} {students.length === 1 ? "student" : "students"} ·{" "}
                    {rows.length} {rows.length === 1 ? "attempt" : "attempts"}
                  </span>
                </h3>

                {studentFilter && (
                  <p className="mt-2 text-sm text-ink-soft">
                    Showing only {nameOf(studentFilter)}.{" "}
                    <Link
                      href={"/admin/results?course=" + encodeURIComponent(key)}
                      className="font-bold text-accent"
                    >
                      Show all students
                    </Link>
                  </p>
                )}

                <div className="mt-3 overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs font-semibold uppercase tracking-widest text-ink-faint">
                        <th className={th}>Student</th>
                        <th className={th}>Quizzes done</th>
                        <th className={th}>Attempts</th>
                        <th className={th}>Average</th>
                        <th className={th}>Latest test</th>
                        <th className={th}>Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.studentId} className="border-b border-line/60 last:border-0">
                          <td className="px-5 py-3 font-semibold text-ink">
                            {active ? (
                              <Link
                                href={
                                  "/admin/results?course=" +
                                  encodeURIComponent(key) +
                                  "&student=" +
                                  s.studentId
                                }
                                className="hover:text-accent"
                              >
                                {nameOf(s.studentId)}
                              </Link>
                            ) : (
                              nameOf(s.studentId)
                            )}
                          </td>
                          <td className="px-5 py-3 text-ink">{s.quizzes.size}</td>
                          <td className="px-5 py-3 text-ink-soft">{s.attempts}</td>
                          <td className="px-5 py-3 text-ink">
                            {Math.round(s.totalPct / s.attempts)}%
                          </td>
                          <td className="px-5 py-3 text-ink-soft">
                            {testName(s.lastRow)} ({s.lastRow.percentage}%)
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
                    See every test and attempt in {courseName(key)} →
                  </Link>
                )}

                {active && (
                  <>
                    <h4 className="mt-8 font-display text-base font-bold text-ink">
                      Progress by student and test
                    </h4>
                    <p className="mt-1 text-sm text-ink-soft">
                      One row per test (Practice 1 and Practice 2 are separate). Scores run from the
                      first attempt to the latest; the best one is in bold.
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs font-semibold uppercase tracking-widest text-ink-faint">
                            <th className={th}>Student</th>
                            <th className={th}>Test</th>
                            <th className={th}>Attempts</th>
                            <th className={th}>Best</th>
                            <th className={th}>Latest</th>
                            <th className={th}>All scores (1st to latest)</th>
                            <th className={th}>Last done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((s) => {
                            const tests = Array.from(
                              (perStudent.get(s.studentId) ?? new Map<string, TestProgress>()).values()
                            ).sort((x, y) =>
                              x.items[x.items.length - 1].submitted_at <
                              y.items[y.items.length - 1].submitted_at
                                ? 1
                                : -1
                            );
                            return tests.map((t, i) => {
                              const pcts = t.items.map((a) => Number(a.percentage));
                              const best = Math.max(...pcts);
                              const bestIdx = pcts.indexOf(best);
                              const latest = t.items[t.items.length - 1];
                              return (
                                <tr
                                  key={s.studentId + t.key}
                                  className={
                                    "border-b border-line/60 last:border-0 " +
                                    (i === 0 ? "border-t-2 border-t-line" : "")
                                  }
                                >
                                  <td className="px-5 py-3 font-semibold text-ink">
                                    {i === 0 ? nameOf(s.studentId) : ""}
                                  </td>
                                  <td className="px-5 py-3 text-ink">
                                    {t.title}
                                    {t.section && (
                                      <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs font-bold text-ink-soft">
                                        {t.section}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-ink">{t.items.length}</td>
                                  <td className="px-5 py-3 font-bold text-ink">
                                    {best}% ({t.items[bestIdx].score}/{t.items[bestIdx].max_score})
                                  </td>
                                  <td className="px-5 py-3 text-ink">
                                    {latest.percentage}% ({latest.score}/{latest.max_score})
                                  </td>
                                  <td className="px-5 py-3 text-ink-soft">
                                    {pcts.map((p, idx) => (
                                      <span
                                        key={idx}
                                        className={
                                          "mr-1.5 inline-block rounded-md border border-line px-1.5 py-0.5 " +
                                          (idx === bestIdx ? "font-bold text-ink" : "")
                                        }
                                      >
                                        {p}%
                                      </span>
                                    ))}
                                  </td>
                                  <td className="px-5 py-3 text-ink-faint">
                                    {new Date(latest.submitted_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                      </table>
                    </div>

                    <h4 className="mt-8 font-display text-base font-bold text-ink">
                      Every attempt
                    </h4>
                    <div className="mt-3 overflow-x-auto rounded-xl2 border border-line bg-surface shadow-card">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line text-xs font-semibold uppercase tracking-widest text-ink-faint">
                            <th className={th}>Student</th>
                            <th className={th}>Quiz</th>
                            <th className={th}>Part</th>
                            <th className={th}>Attempt</th>
                            <th className={th}>Score</th>
                            <th className={th}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((attempt) => {
                            const t = perStudent
                              .get(attempt.student_id)
                              ?.get(attempt.quiz_id + "|" + sectionOf(attempt));
                            return (
                              <tr key={attempt.id} className="border-b border-line/60 last:border-0">
                                <td className="px-5 py-3 text-ink">{nameOf(attempt.student_id)}</td>
                                <td className="px-5 py-3 text-ink-soft">
                                  {attempt.quizzes?.title ?? "—"}
                                </td>
                                <td className="px-5 py-3 text-ink-soft">
                                  {sectionOf(attempt) || "—"}
                                </td>
                                <td className="px-5 py-3 text-ink-soft">
                                  #{attemptNo.get(attempt.id)}
                                  {t ? " of " + t.items.length : ""}
                                </td>
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
                  </>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
