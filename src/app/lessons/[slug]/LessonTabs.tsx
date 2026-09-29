"use client";

import { useState } from "react";
import type { SafeQuestion, VocabularyItem } from "@/lib/types";
import QuizRunner from "@/app/quizzes/[slug]/QuizRunner";

type Tab = "vocabulary" | "grammar" | "practice";

export default function LessonTabs({
  quizId,
  quizSlug,
  vocabulary,
  grammarNotes,
  questions,
}: {
  quizId: string;
  quizSlug: string;
  vocabulary: VocabularyItem[] | null;
  grammarNotes: string[] | null;
  questions: SafeQuestion[];
}) {
  const availableTabs: { key: Tab; label: string }[] = [
    ...(vocabulary && vocabulary.length > 0 ? [{ key: "vocabulary" as Tab, label: "Từ vựng" }] : []),
    ...(grammarNotes && grammarNotes.length > 0 ? [{ key: "grammar" as Tab, label: "Cấu trúc" }] : []),
    { key: "practice" as Tab, label: "Luyện tập" },
  ];

  const [tab, setTab] = useState<Tab>(availableTabs[0]?.key ?? "practice");

  return (
    <div className="mt-8">
      <div className="flex flex-wrap gap-2 border-b border-line">
        {availableTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "border-accent text-accent-strong"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "vocabulary" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(vocabulary ?? []).map((item, i) => (
              <div key={i} className="rounded-xl2 border border-line bg-surface p-5 shadow-card">
                <p className="font-display text-lg font-bold text-ink">{item.term}</p>
                <p className="mt-1 text-sm text-ink-soft">{item.meaning}</p>
                {item.example && (
                  <p className="mt-2 text-xs italic text-ink-faint">&ldquo;{item.example}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "grammar" && (
          <div className="flex flex-col gap-4">
            {(grammarNotes ?? []).map((paragraph, i) => (
              <p
                key={i}
                className="whitespace-pre-wrap rounded-xl2 border border-line bg-surface p-5 text-sm leading-relaxed text-ink shadow-card"
              >
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {tab === "practice" &&
          (questions.length === 0 ? (
            <p className="text-ink-soft">Chưa có câu hỏi luyện tập cho bài học này.</p>
          ) : (
            <QuizRunner quizId={quizId} quizSlug={quizSlug} questions={questions} />
          ))}
      </div>
    </div>
  );
}
