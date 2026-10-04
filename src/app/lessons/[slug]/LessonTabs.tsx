"use client";

import { useState, type ReactNode } from "react";
import type { SafeQuestion, VocabularyItem } from "@/lib/types";
import QuizRunner from "@/app/quizzes/[slug]/QuizRunner";

type Tab = "vocabulary" | "grammar" | "practice";
type ExampleKind = "good" | "bad" | "neutral";

const STRUCTURE_PATTERN =
  /\b(on the contrary|in contrast|not only|but also|however|unlike|similarly|likewise|instead of|instead|neither|either|whether|both|while|like|first of all|in addition|for example|in conclusion|as a result|even though|so that|in order to|on one hand|on the other hand|those who|that is why|would rather|prefer)\b/gi;

/** Bolds and colors every structure / linking word it finds in a string,
 *  leaving everything else as plain text. */
function highlightStructures(text: string, className: string): ReactNode[] {
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
      <strong key={key++} className={className}>
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

/** Makes every ALL-CAPS word in a note (COMMA, NO, NOT, NEVER, PERIOD...)
 *  bold and colored, so the punctuation / grammar rule jumps out. */
function emphasizeCaps(text: string): ReactNode[] {
  return text.split(/(\b[A-Z]{2,}\b)/).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-warm">
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function parseExample(raw: string): { kind: ExampleKind; text: string } {
  const text = raw.trim();
  const m = text.match(/^([✓✔✗✘×])\s*([\s\S]*)$/);
  if (!m) {
    return { kind: "neutral", text };
  }
  return { kind: "✓✔".includes(m[1]) ? "good" : "bad", text: m[2].trim() };
}

const EXAMPLE_STYLES: Record<ExampleKind, { box: string; badge: string; text: string }> = {
  good: {
    box: "border-good/30 bg-good-soft",
    badge: "bg-good text-white",
    text: "text-ink",
  },
  bad: {
    box: "border-bad/30 bg-bad-soft",
    badge: "bg-bad text-white",
    text: "text-ink-soft",
  },
  neutral: {
    box: "border-line bg-warm-soft/60",
    badge: "bg-warm text-white",
    text: "text-ink",
  },
};

/** A "Cấu trúc" paragraph is written as "TITLE IN CAPS: formula line.
 *  note line. note line. Example: ... Example: ...". Renders it as a card:
 *  a numbered title bar, the formula in a highlighted box, the notes
 *  (punctuation / grammar warnings) in a warm box with the ALL-CAPS words
 *  emphasised, and every example as its own green (✓) or red (✗) row. */
function GrammarCard({ paragraph, index }: { paragraph: string; index: number }) {
  const titleMatch = paragraph.match(/^([A-Z][A-Z0-9 /.,'-]{3,70}):\s*([\s\S]*)$/);
  const title = titleMatch ? titleMatch[1].trim() : null;
  const body = titleMatch ? titleMatch[2].trim() : paragraph;
  const segments = body.split(/\s*Example:\s*/i);
  const lines = segments[0]
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "");
  const formula = lines[0] ?? "";
  const notes = lines.slice(1);
  const examples = segments.slice(1).map(parseExample);

  return (
    <section className="overflow-hidden rounded-xl2 border border-line bg-surface shadow-card">
      {title && (
        <header className="flex items-center gap-3 border-b border-accent/15 bg-accent-soft px-5 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">
            {index + 1}
          </span>
          <h3 className="text-sm font-bold uppercase tracking-widest text-accent-strong">{title}</h3>
        </header>
      )}

      <div className="flex flex-col gap-4 p-5">
        {formula && (
          <div className="rounded-lg border-l-4 border-accent bg-accent-soft/60 px-4 py-3">
            <p className="font-display text-lg font-bold leading-relaxed text-ink">
              {highlightStructures(formula, "text-accent")}
            </p>
          </div>
        )}

        {notes.length > 0 && (
          <div className="rounded-lg border border-warm/20 bg-warm-soft/50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-widest text-warm">Lưu ý</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warm" />
                  <span>{emphasizeCaps(note)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {examples.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">Ví dụ</p>
            {examples.map((example, i) => {
              const style = EXAMPLE_STYLES[example.kind];
              return (
                <div
                  key={i}
                  className={["flex items-start gap-3 rounded-lg border px-4 py-3", style.box].join(" ")}
                >
                  <span
                    className={[
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      style.badge,
                    ].join(" ")}
                  >
                    {example.kind === "good" ? "✓" : example.kind === "bad" ? "✗" : "•"}
                  </span>
                  <p className={["text-sm leading-relaxed", style.text].join(" ")}>
                    {highlightStructures(example.text, "font-bold text-accent-strong")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
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
  const availableTabs: { key: Tab; label: string; count?: number }[] = [
    ...(vocabulary && vocabulary.length > 0
      ? [{ key: "vocabulary" as Tab, label: "Từ vựng", count: vocabulary.length }]
      : []),
    ...(grammarNotes && grammarNotes.length > 0
      ? [{ key: "grammar" as Tab, label: "Cấu trúc", count: grammarNotes.length }]
      : []),
    { key: "practice" as Tab, label: "Luyện tập", count: questions.length },
  ];

  const [tab, setTab] = useState<Tab>(availableTabs[0]?.key ?? "practice");

  return (
    <div className="mt-8">
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-surface p-1 shadow-card">
        {availableTabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={[
                "flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                active ? "bg-accent text-white" : "text-ink-soft hover:bg-accent-soft hover:text-accent-strong",
              ].join(" ")}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={[
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    active ? "bg-white/25 text-white" : "bg-accent-soft text-accent-strong",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === "vocabulary" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(vocabulary ?? []).map((item, i) => (
              <div
                key={i}
                className="rounded-xl2 border border-line border-l-4 border-l-accent bg-surface p-5 shadow-card"
              >
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
          <div className="flex flex-col gap-6">
            {(grammarNotes ?? []).map((paragraph, i) => (
              <GrammarCard key={i} paragraph={paragraph} index={i} />
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
