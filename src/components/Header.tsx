import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export default async function Header() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let displayName: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    displayName = profile?.full_name || user.email || null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
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

        <nav className="flex items-center gap-6 text-sm font-medium text-ink-soft">
          <Link href="/quizzes" className="hover:text-ink">
            Quizzes
          </Link>
          <Link href="/results" className="hover:text-ink">
            My results
          </Link>
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
