// Streaks and badges, worked out from a student's past quiz attempts.
// Nothing extra is stored: the same attempts always give the same badges.

export interface AttemptStat {
  quiz_id: string;
  percentage: number;
  submitted_at: string;
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  hint: string;
  earned: boolean;
}

// A "day" ends at midnight in Vietnam (UTC+7), where the students are.
function dayKey(iso: string): number {
  return Math.floor((new Date(iso).getTime() + 7 * 3600 * 1000) / 86400000);
}

/** Days in a row with at least one quiz, counting back from today (or yesterday). */
export function streakOf(attempts: AttemptStat[], now: Date = new Date()): number {
  const days = new Set(attempts.map((a) => dayKey(a.submitted_at)));
  const today = dayKey(now.toISOString());
  let cursor = days.has(today) ? today : today - 1;
  let count = 0;
  while (days.has(cursor)) {
    count++;
    cursor--;
  }
  return count;
}

/** The longest run of consecutive practice days ever. */
export function longestStreak(attempts: AttemptStat[]): number {
  const days = Array.from(new Set(attempts.map((a) => dayKey(a.submitted_at)))).sort(
    (a, b) => a - b
  );
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function computeBadges(attempts: AttemptStat[]): Badge[] {
  const quizzes = new Set(attempts.map((a) => a.quiz_id)).size;
  const best = attempts.reduce((m, a) => Math.max(m, Number(a.percentage)), 0);
  const run = longestStreak(attempts);
  return [
    { id: "first", emoji: "\u{1F423}", title: "First steps", hint: "Finish your first quiz", earned: quizzes >= 1 },
    { id: "five", emoji: "\u{1F4DA}", title: "Quiz explorer", hint: "Finish 5 different quizzes", earned: quizzes >= 5 },
    { id: "ten", emoji: "\u{1F3C6}", title: "Quiz champion", hint: "Finish 10 different quizzes", earned: quizzes >= 10 },
    { id: "ace", emoji: "\u{1F31F}", title: "Shining star", hint: "Score 90% or more", earned: best >= 90 },
    { id: "perfect", emoji: "\u{1F4AF}", title: "Perfect score", hint: "Score 100%", earned: best >= 100 },
    { id: "streak3", emoji: "\u{1F525}", title: "On fire", hint: "Practise 3 days in a row", earned: run >= 3 },
    { id: "streak7", emoji: "\u{1F680}", title: "Rocket week", hint: "Practise 7 days in a row", earned: run >= 7 },
    { id: "retake", emoji: "\u{1F4AA}", title: "Never give up", hint: "Try the same quiz twice", earned: attempts.length > quizzes },
  ];
}
