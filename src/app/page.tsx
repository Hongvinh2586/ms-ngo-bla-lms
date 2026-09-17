import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-3xl px-6 py-20 text-center">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent">
        Student area
      </p>
      <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
        {user ? "Welcome back." : "Practice, get graded, keep track of your progress."}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg text-ink-soft">
        Take quizzes for your course, see your score and every explanation right away, and
        review everything you have submitted so far.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        {user ? (
          <>
            <Link
              href="/quizzes"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
            >
              Go to quizzes
            </Link>
            <Link
              href="/results"
              className="rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              My results
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
            >
              Create a student account
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-line px-6 py-3 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
            >
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
