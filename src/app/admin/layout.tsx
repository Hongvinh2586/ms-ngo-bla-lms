import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">Dashboard</h1>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm font-medium">
          <Link
            href="/admin"
            className="rounded-lg border border-line px-3.5 py-2 text-ink-soft hover:border-ink-soft hover:text-ink transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/admin/quizzes"
            className="rounded-lg border border-line px-3.5 py-2 text-ink-soft hover:border-ink-soft hover:text-ink transition-colors"
          >
            Quizzes
          </Link>
          <Link
            href="/admin/results"
            className="rounded-lg border border-line px-3.5 py-2 text-ink-soft hover:border-ink-soft hover:text-ink transition-colors"
          >
            Results
          </Link>
          <Link
            href="/admin/students"
            className="rounded-lg border border-line px-3.5 py-2 text-ink-soft hover:border-ink-soft hover:text-ink transition-colors"
          >
            Students
          </Link>
          <Link
            href="/"
            className="rounded-lg px-3.5 py-2 text-ink-faint hover:text-ink transition-colors"
          >
            ← Back to site
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
