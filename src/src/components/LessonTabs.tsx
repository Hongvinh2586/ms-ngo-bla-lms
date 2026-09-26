"use client";

import { useState, type ReactNode } from "react";
import type { VocabularyItem } from "@/lib/types";

/** Three-tab layout (Từ vựng / Cấu trúc / Kiểm tra) for a Writing course
 *  lesson. Any tab with no content is simply left out — a quiz with no
 *  vocabulary/grammar_notes saved just shows the test, same as before this
 *  component existed. */
export default function LessonTabs({
  vocabulary,
  grammarNotes,
  quiz,
}: {
  vocabulary: VocabularyItem[] | null;
  grammarNotes: string[] | null;
  quiz: ReactNode;
}) {
  const tabs = [
    vocabulary && vocabulary.length > 0 ? ("vocabulary" as const) : null,
    grammarNotes && grammarNotes.length > 0 ? ("grammar" as const) : null,
    "quiz" as const,
  ].filter((t): t is "vocabulary" | "grammar" | "quiz" => t !== null);

  const [active, setActive] = useState<"vocabulary" | "grammar" | "quiz">(tabs[0]);

  if (tabs.length <= 1) {
    // Nothing but the test — no point showing a single tab.
    return <>{quiz}</>;
  }

  const labels: Record<"vocabulary" | "grammar" | "quiz", string> = {
    vocabulary: "Từ vựng",
    grammar: "Cấu trúc",
    quiz: "Kiểm tra",
  };

  return (
    <div>
      <div className="flex gap-2 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              active === tab
                ? "border-accent text-accent-strong"
                : "border-transparent text-ink-faint hover:text-ink-soft"
            }`}
          >
            {labels[tab]}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {active === "vocabulary" && vocabulary && (
          <ul className="flex flex-col divide-y divide-line rounded-xl2 border border-line bg-surface">
            {vocabulary.map((item, i) => (
              <li key={i} className="flex flex-col gap-1 px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-display text-base font-bold text-ink">{item.term}</span>
                  <span className="text-sm text-ink-soft">— {item.meaning}</span>
                </div>
                {item.example && (
                  <p className="text-sm italic text-ink-faint">{item.example}</p>
                )}
              </li>
            ))}
          </ul>
        )}

        {active === "grammar" && grammarNotes && (
          <div className="flex flex-col gap-4 rounded-xl2 border border-line bg-surface p-5">
            {grammarNotes.map((paragraph, i) => (
              <p key={i} className="text-sm leading-relaxed text-ink">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {active === "quiz" && quiz}
      </div>
    </div>
  );
}
