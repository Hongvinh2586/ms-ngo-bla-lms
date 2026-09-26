import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = createClient();

  const [{ count: quizCount }, { count: accountCount }, { count: attemptCount }] =
    await Promise.all([
      supabase.from("quizzes").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("quiz_attempts").select("id", { count: "exact", head: true }),
    ]);

  return (
    <div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Quizzes" value={quizCount ?? 0} />
        <StatCard label="Accounts" value={accountCount ?? 0} />
        <StatCard label="Attempts submitted" value={attemptCount ?? 0} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/quizzes/new"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
        >
          + New quiz
        </Link>
        <Link
          href="/admin/quizzes"
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
        >
          Manage quizzes
        </Link>
        <Link
          href="/admin/results"
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
        >
          View results
        </Link>
        <Link
          href="/admin/students"
          className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-ink-soft transition-colors"
        >
          Manage students
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-6 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}
