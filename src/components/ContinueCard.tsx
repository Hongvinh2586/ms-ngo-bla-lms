"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Pick up where you left off": the quiz runner saves a student's unfinished answers
// on this device (key "qdraft:..."), and the home page shows the most recent one.

interface Draft {
  key: string;
  href: string;
  title: string;
  answered: number;
  total: number;
  t: number;
}

const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

function findLatestDraft(): Draft | null {
  let best: Draft | null = null;
  try {
    const now = Date.now();
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("qdraft:")) continue;
      try {
        const d = JSON.parse(window.localStorage.getItem(key) ?? "null") as {
          t?: number;
          href?: string;
          title?: string;
          total?: number;
          answers?: Record<string, unknown>;
        } | null;
        if (!d || typeof d.t !== "number" || typeof d.href !== "string" || !d.answers) continue;
        if (now - d.t > MAX_AGE_MS) {
          window.localStorage.removeItem(key);
          continue;
        }
        const answered = Object.keys(d.answers).length;
        if (answered === 0 || !d.total) continue;
        if (!best || d.t > best.t) {
          best = { key, href: d.href, title: d.title || "your quiz", answered, total: d.total, t: d.t };
        }
      } catch {
        // Ignore a damaged entry.
      }
    }
  } catch {
    return null;
  }
  return best;
}

export default function ContinueCard() {
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    setDraft(findLatestDraft());
  }, []);

  if (!draft) return null;

  const pct = Math.min(100, Math.round((draft.answered / draft.total) * 100));
  const ready = draft.answered >= draft.total;

  function dismiss() {
    try {
      if (draft) window.localStorage.removeItem(draft.key);
    } catch {
      // Nothing to remove.
    }
    setDraft(null);
  }

  return (
    <section className="mt-10" aria-label="Continue your quiz">
      <div className="flex flex-wrap items-center gap-4 rounded-xl2 border-2 border-ink/80 bg-tint-butter p-5 shadow-[0_8px_22px_-10px_rgba(43,48,16,0.38)]">
        <span className="mascot-bob text-4xl leading-none" aria-hidden="true">
          {"\u{1F4D6}"}
        </span>
        <div className="min-w-0 flex-[1_1_240px]">
          <p className="text-sm font-bold text-accent-strong">
            {ready ? "All answered. Ready to submit!" : "Pick up where you left off"}
          </p>
          <p className="truncate font-display text-xl font-extrabold text-ink">{draft.title}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/80 ring-1 ring-line">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: pct + "%" }} />
            </div>
            <span className="shrink-0 text-sm font-bold text-ink-soft">
              {draft.answered} of {draft.total} answered
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={draft.href}
            className="press rounded-full bg-accent px-6 py-3 text-base font-extrabold text-white shadow-[0_3px_8px_-3px_rgba(43,48,16,0.45)] transition-transform hover:-translate-y-0.5"
          >
            Continue
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="press grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-sm font-bold text-ink-soft hover:border-accent"
            aria-label="Hide this and forget my saved answers"
            title="Hide this and forget my saved answers"
          >
            {"✕"}
          </button>
        </div>
      </div>
    </section>
  );
}
