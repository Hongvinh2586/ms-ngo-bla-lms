import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";
import { FEATURED_COURSES, WRITING_SUB_COURSES } from "@/lib/types";

export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    displayName = profile?.full_name || user.email || null;
    isAdmin = profile?.role === "admin";
  }

  // Quiz counts for the "Writing Courses" hover menu below. Only readable
  // once signed in (quizzes RLS), same as the homepage's course cards.
  const writingCounts = new Map<string, number>();
  if (user) {
    const { data: writingQuizzes } = await supabase
      .from("quizzes")
      .select("category")
      .in(
        "category",
        WRITING_SUB_COURSES.map((c) => c.category)
      )
      .returns<{ category: string | null }[]>();
    for (const row of writingQuizzes ?? []) {
      if (!row.category) continue;
      writingCounts.set(row.category, (writingCounts.get(row.category) ?? 0) + 1);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-white">
            N
          </span>
          <span>
            <span className="block font-display text-base font-bold text-ink">Ms Ngo Bla</span>
            <span className="block text-[10px] font-medium uppercase tracking-widest text-ink-faint">
              Student area
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-accent-strong">
          <Link href="/" className="hover:text-accent">
            Trang chủ
          </Link>
          {FEATURED_COURSES.map((course) =>
            course.category === "writing" ? (
              <div key={course.category} className="group relative">
                <Link
                  href="/writing"
                  className="flex items-center gap-1 hover:text-accent"
                >
                  {course.title}
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    className="mt-px transition-transform group-hover:rotate-180"
                    aria-hidden="true"
                  >
                    <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </Link>
                <div className="invisible absolute left-0 top-full z-20 w-[300px] pt-3 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
                  <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
                    <div className="grid grid-cols-3 gap-2">
                      {WRITING_SUB_COURSES.map((sub) => {
                        const count = writingCounts.get(sub.category) ?? 0;
                        return (
                          <Link
                            key={sub.category}
                            href={`/quizzes?category=${sub.category}`}
                            className="group/tile rounded-xl bg-accent-soft px-2 py-3 text-center transition-colors hover:bg-accent"
                          >
                            <div className="text-sm font-bold text-accent-strong group-hover/tile:text-white">
                              {sub.title.replace(" Writing Course", "")}
                            </div>
                            <div className="mt-1 text-[11px] text-ink-faint group-hover/tile:text-white/80">
                              {count > 0 ? `${count} quiz${count > 1 ? "zes" : ""}` : "Coming soon"}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <Link
                      href="/writing"
                      className="mt-3 block rounded-lg bg-accent-soft py-2 text-center text-sm font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-white"
                    >
                      Xem tất cả
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={course.category}
                href={`/quizzes?category=${course.category}`}
                className="hover:text-accent"
              >
                {course.title}
              </Link>
            )
          )}
          <Link href="/results" className="hover:text-accent">
            My results
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full bg-accent-soft px-3 py-1 text-accent-strong hover:bg-accent hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-ink-soft sm:inline">{displayName}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:border-ink-soft transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
