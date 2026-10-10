import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { FEATURED_COURSES, WRITING_SUB_COURSES } from "@/lib/types";
import { streakOf, type AttemptStat } from "@/lib/badges";
import { allowedFolders, canSee } from "@/lib/classAccess";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function CourseIcon({ category }: { category: string }) {
  if (category === "ielts") {
    return (
      <Svg>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" />
      </Svg>
    );
  }
  if (category === "writing") {
    return (
      <Svg>
        <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 013 3L8 19z" />
        <path d="M14.5 6.5l3 3" />
      </Svg>
    );
  }
  if (category === "results") {
    return (
      <Svg>
        <path d="M7 4h10v5a5 5 0 01-10 0z" />
        <path d="M7 6H4v1.5A3.5 3.5 0 007.5 11M17 6h3v1.5A3.5 3.5 0 0116.5 11" />
        <path d="M12 14v3M8.5 20h7M9.5 17h5" />
      </Svg>
    );
  }
  return (
    <Svg>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5v13" />
    </Svg>
  );
}

// One friendly colour per course card (palette lives in tailwind.config.ts).
const CARD_STYLES: Record<string, { card: string; icon: string }> = {
  vocabulary: { card: "bg-tint-teal", icon: "bg-tint-teal-strong" },
  ielts: { card: "bg-tint-mauve", icon: "bg-tint-mauve-strong" },
  writing: { card: "bg-tint-apricot", icon: "bg-tint-apricot-strong" },
  results: { card: "bg-tint-butter", icon: "bg-tint-butter-strong" },
};

function CourseCard({
  href,
  category,
  title,
  description,
  badge,
  highlight,
  cta,
}: {
  href: string;
  category: string;
  title: string;
  description: string;
  badge: string;
  highlight: boolean;
  cta: string;
}) {
  const style = CARD_STYLES[category] ?? CARD_STYLES.vocabulary;
  return (
    <Link
      href={href}
      className={
        "flex flex-col gap-3 rounded-xl2 border-[3px] border-ink p-7 shadow-[0_8px_0_#2B3010] transition-transform hover:-translate-y-1 " +
        style.card
      }
    >
      <span
        className={
          "flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border-[3px] border-ink text-ink " +
          style.icon
        }
      >
        <CourseIcon category={category} />
      </span>
      <span
        className={
          "w-fit rounded-full px-3 py-1 text-xs font-extrabold " +
          (highlight ? "bg-surface text-ink" : "bg-surface/60 text-ink-soft")
        }
      >
        {badge}
      </span>
      <h3 className="font-display text-2xl font-extrabold leading-tight text-ink">{title}</h3>
      <p className="flex-grow text-base font-semibold text-ink-soft">{description}</p>
      <span className="mt-1 w-fit rounded-full bg-ink px-5 py-2 text-base font-extrabold text-white">
        {cta}
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Students limited to certain class folders only see those folders' cards.
  const allowed = user ? await allowedFolders(supabase, user) : null;

  // Count published quizzes per course category so each card can show
  // whether it already has quizzes or is still "coming soon". The
  // `quizzes` row-level security policy only allows signed-in users to
  // read it, so this stays empty (and every card just reads "Sign up to
  // see what is available") until someone is logged in.
  const countsByCategory = new Map<string, number>();
  if (user) {
    const { data: quizCategories } = await supabase
      .from("quizzes")
      .select("category")
      .eq("is_published", true)
      .returns<{ category: string | null }[]>();
    for (const row of quizCategories ?? []) {
      if (!row.category) continue;
      // Lessons inside a Vocabulary Builder book count toward Vocabulary Builder.
      const cat = row.category.startsWith("vocabulary-") ? "vocabulary" : row.category;
      countsByCategory.set(cat, (countsByCategory.get(cat) ?? 0) + 1);
    }
  }

  // Days in a row the student has practised (shown as a small flame chip).
  let streak = 0;
  if (user) {
    const { data: myAttempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, percentage, submitted_at")
      .eq("student_id", user.id)
      .returns<AttemptStat[]>();
    streak = streakOf(myAttempts ?? []);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pb-20 pt-12">
      <section className="flex flex-wrap items-center gap-10">
        <div className="min-w-0 flex-[1_1_380px]">
          <span className="inline-block rounded-full bg-[#FFE08A] px-4 py-1.5 text-sm font-extrabold uppercase tracking-wider text-ink">
            {user ? "Welcome back" : "Student area"}
          </span>
          <div className="mt-4 flex gap-3 text-4xl leading-none" aria-hidden="true">
            {["\u{1F98E}", "\u{1F422}", "\u{1F989}", "\u{1F43B}", "\u{1F98A}"].map((m, i) => (
              <span key={i} className="mascot-bob" style={{ animationDelay: -i * 0.45 + "s" }}>
                {m}
              </span>
            ))}
          </div>
          {user && (
            <p className="mt-3 inline-block rounded-full border-[3px] border-ink bg-white px-4 py-1.5 text-base font-extrabold text-ink shadow-[0_3px_0_#2B3010]">
              {"\u{1F525}"}{" "}
              {streak > 0
                ? streak + (streak === 1 ? " day" : " days") + " in a row. Keep it going!"
                : "Do a quiz today to start your streak!"}
            </p>
          )}
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] text-ink sm:text-6xl">
            {user
              ? "Hi there! Ready to learn some English today?"
              : "Practice, get graded, keep track of your progress."}
          </h1>
          <p className="mt-5 max-w-lg text-xl font-semibold text-ink-soft">
            Take quizzes for your course, see your score and every explanation right away, and
            review everything you have submitted so far.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/quizzes"
                  className="press rounded-full bg-accent px-8 py-4 text-lg font-extrabold text-white shadow-[0_6px_0_#3E4A12] transition-transform hover:-translate-y-0.5"
                >
                  Start learning
                </Link>
                <Link
                  href="/results"
                  className="press rounded-full border-[3px] border-line bg-surface px-8 py-3.5 text-lg font-extrabold text-ink shadow-[0_6px_0_#CBD1A0] transition-transform hover:-translate-y-0.5"
                >
                  My results
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/signup"
                  className="press rounded-full bg-accent px-8 py-4 text-lg font-extrabold text-white shadow-[0_6px_0_#3E4A12] transition-transform hover:-translate-y-0.5"
                >
                  Create a student account
                </Link>
                <Link
                  href="/login"
                  className="press rounded-full border-[3px] border-line bg-surface px-8 py-3.5 text-lg font-extrabold text-ink shadow-[0_6px_0_#CBD1A0] transition-transform hover:-translate-y-0.5"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="hidden flex-[1_1_340px] justify-center sm:flex" aria-hidden="true">
          <div className="relative h-[360px] w-[420px] max-w-full">
            <div className="absolute left-[40px] top-[10px] h-[340px] w-[340px] rounded-full bg-accent-soft" />
            <div className="absolute left-[70px] top-[84px] flex h-[200px] w-[280px] -rotate-[4deg] flex-col justify-center gap-3 rounded-[28px] border-4 border-ink bg-white px-7 shadow-[8px_8px_0_#FFC93C]">
              <div className="font-display text-[44px] font-extrabold leading-none text-ink">
                Try, learn, grow!
              </div>
              <div className="text-[17px] font-bold leading-snug text-ink-soft">
                Every mistake is a step forward.
              </div>
            </div>
            <div className="absolute left-0 top-[40px] flex h-[84px] w-[84px] -rotate-[10deg] items-center justify-center rounded-3xl border-4 border-ink bg-tint-apricot-strong font-display text-[40px] font-extrabold text-ink">
              A+
            </div>
            <div className="absolute right-[6px] top-[20px] flex h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-ink bg-tint-butter-strong">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#FFFFFF" stroke="#2B3010" strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
              </svg>
            </div>
            <div className="absolute bottom-[30px] right-[10px] rotate-6 rounded-full border-4 border-ink bg-[#F2A39B] px-5 py-3 text-lg font-extrabold text-ink">
              Great job!
            </div>
            <div className="absolute bottom-[34px] left-[30px] flex h-16 w-16 items-center justify-center rounded-full border-4 border-ink bg-[#8FA82A]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2B3010" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <p className="text-sm font-extrabold uppercase tracking-widest text-accent">Courses</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          Choose your adventure
        </h2>

        <div
          className={
            "mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 " + (user ? "lg:grid-cols-4" : "lg:grid-cols-3")
          }
        >
          {FEATURED_COURSES.filter(
            (course) =>
              allowed === null ||
              (course.category === "writing"
                ? allowed.some((k) => k.startsWith("writing-") || k === "lessons")
                : canSee(allowed, course.category))
          ).map((course) => {
            const isWritingParent = course.category === "writing";
            const count = isWritingParent
              ? WRITING_SUB_COURSES.filter((sub) => canSee(allowed, sub.category)).reduce(
                  (sum, sub) => sum + (countsByCategory.get(sub.category) ?? 0),
                  0
                )
              : countsByCategory.get(course.category) ?? 0;
            const href = !user
              ? "/signup"
              : isWritingParent
                ? "/writing"
                : "/quizzes?category=" + course.category;
            const badgeText = !user
              ? "Sign up to see what is available"
              : count > 0
                ? count + (count > 1 ? " quizzes available" : " quiz available")
                : "Coming soon";
            return (
              <CourseCard
                key={course.category}
                href={href}
                category={course.category}
                title={course.title}
                description={course.description}
                badge={badgeText}
                highlight={Boolean(user) && count > 0}
                cta={user ? "Let us go" : "Join now"}
              />
            );
          })}
          {user && (
            <CourseCard
              href="/results"
              category="results"
              title="My results"
              description="See your scores, every explanation and how much you have improved."
              badge="Your progress"
              highlight
              cta="Take a look"
            />
          )}
        </div>
      </section>
    </div>
  );
}
