"use client";

import { useState, type ReactNode } from "react";
import type { SafeQuestion, VocabularyItem } from "@/lib/types";
import QuizRunner from "@/app/quizzes/[slug]/QuizRunner";

type Tab = "vocabulary" | "grammar" | "practice";

const STRUCTURE_PATTERN =
  /\b(on the contrary|in contrast|not only|but also|however|unlike|similarly|likewise|instead|neither|either|whether|both|while|like)\b/gi;

/** Bolds and colors every compare/contrast signal word it finds in a string
 *  (unlike, while, instead, however, both, either, neither, whether,
 *  similarly, likewise, in contrast, on the contrary...), leaving everything
 *  else as plain text. */
function highlightStructures(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  STRUCTURE_PATTERN.lastIndex = 0;
  while ((match = STRUCTURE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={key++} className="font-bold text-accent-strong">
        {match[0]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/** A "Cấu trúc" paragraph is written as "TITLE IN CAPS: explanation.
 *  Example: ... Example: ...". Renders it the way a grammar-review page
 *  would: a small colored eyebrow label with the topic name, the rule
 *  itself in a highlighted box, then each example pulled into its own
 *  differently-colored box below — instead of one long block of text. */
function GrammarCard({ paragraph }: { paragraph: string }) {
  const titleMatch = paragraph.match(/^([A-Z][A-Z0-9 /.,'-]{3,70}):\s*([\s\S]*)$/);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const body = titleMatch ? titleMatch[2].trim() : paragraph;
  const segments = body.split(/\s*Example:\s*/i);
  const explanation = segments[0];
  const examples = segments.slice(1);

  return (
    <div className="flex flex-col gap-4">
      {title && (
        <p className="text-xs font-bold uppercase tracking-widest text-accent-strong">
          {title}
        </p>
      )}

      {explanation && (
        <div className="rounded-xl2 border border-accent/15 bg-accent-soft px-5 py-4">
          <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-ink">
            {highlightStructures(explanation)}
          </p>
        </div>
      )}

      {examples.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-bold uppercase tracking-widest text-warm">Ví dụ</p>
          {examples.map((example, i) => (
            <div key={i} className="rounded-xl2 border border-line bg-warm-soft/60 px-5 py-4">
              <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-ink-soft">
                {highlightStructures(example)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          <div className="flex flex-col divide-y divide-line">
            {(grammarNotes ?? []).map((paragraph, i) => (
              <div key={i} className={i === 0 ? "pb-8" : "py-8"}>
                <GrammarCard paragraph={paragraph} />
              </div>
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
