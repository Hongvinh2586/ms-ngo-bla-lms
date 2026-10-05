"use client";

import { useState, type ReactNode } from "react";
import type { SafeQuestion, VocabularyItem } from "@/lib/types";
import QuizRunner from "@/app/quizzes/[slug]/QuizRunner";

type Tab = "vocabulary" | "flashcards" | "grammar" | "practice" | "advanced";
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-base font-bold text-white">
            {index + 1}
          </span>
          <h3 className="text-base font-bold uppercase tracking-widest text-accent-strong">{title}</h3>
        </header>
      )}

      <div className="flex flex-col gap-4 p-5">
        {formula && (
          <div className="rounded-lg border-l-4 border-accent bg-accent-soft/60 px-4 py-3">
            <p className="font-display text-xl font-bold leading-relaxed text-ink">
              {highlightStructures(formula, "text-accent")}
            </p>
          </div>
        )}

        {notes.length > 0 && (
          <div className="rounded-lg border border-warm/20 bg-warm-soft/50 px-4 py-3">
            <p className="text-sm font-bold uppercase tracking-widest text-warm">Notes</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-base leading-relaxed text-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warm" />
                  <span>{emphasizeCaps(note)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {examples.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-bold uppercase tracking-widest text-ink-faint">Examples</p>
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
                  <p className={["text-base leading-relaxed", style.text].join(" ")}>
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

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Flip-card study mode for a lesson vocabulary list: tap the card to see
 *  the meaning, then mark it as known or still learning. Missed cards can
 *  be reviewed again at the end. */
function Flashcards({ items }: { items: VocabularyItem[] }) {
  const [deck, setDeck] = useState<VocabularyItem[]>(items);
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [missed, setMissed] = useState<VocabularyItem[]>([]);

  const card = deck[pos];

  function startDeck(next: VocabularyItem[]) {
    setDeck(next);
    setPos(0);
    setFlipped(false);
    setKnown(0);
    setMissed([]);
  }

  function mark(wasKnown: boolean) {
    if (wasKnown) setKnown((k) => k + 1);
    else setMissed((m) => [...m, card]);
    setFlipped(false);
    setPos((p) => p + 1);
  }

  const btn =
    "rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink";

  if (!card) {
    return (
      <div className="mx-auto max-w-xl rounded-xl2 border border-line bg-surface p-8 text-center shadow-card">
        <p className="font-display text-2xl font-bold text-ink">Deck complete</p>
        <p className="mt-2 text-ink-soft">
          You knew {known} of {deck.length} cards.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {missed.length > 0 && (
            <button
              type="button"
              onClick={() => startDeck(shuffled(missed))}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong"
            >
              Review {missed.length} missed
            </button>
          )}
          <button type="button" onClick={() => startDeck(shuffled(items))} className={btn}>
            Start again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-2 flex items-center justify-between text-sm text-ink-soft">
        <span>
          Card {pos + 1} of {deck.length}
        </span>
        <span>Known: {known}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-accent-soft">
        <div className="h-full bg-accent transition-all" style={{ width: `${(pos / deck.length) * 100}%` }} />
      </div>

      <div
        key={pos}
        role="button"
        tabIndex={0}
        onClick={() => setFlipped((f) => !f)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            setFlipped((f) => !f);
          }
        }}
        className="mt-4 flex min-h-[260px] cursor-pointer select-none flex-col items-center justify-center rounded-xl2 border border-line border-l-4 border-l-accent bg-surface p-8 text-center shadow-card"
      >
        {!flipped ? (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">Word</p>
            <p className="mt-3 font-display text-4xl font-bold text-ink">{card.term}</p>
            <p className="mt-6 text-sm text-ink-faint">Tap the card to see the meaning</p>
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Meaning</p>
            <p className="mt-3 text-xl text-ink">{card.meaning}</p>
            {card.example && <p className="mt-4 text-base italic text-ink-soft">&ldquo;{card.example}&rdquo;</p>}
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {!flipped ? (
          <button
            type="button"
            onClick={() => setFlipped(true)}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-strong"
          >
            Show meaning
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => mark(false)}
              className="rounded-full border border-bad bg-bad-soft px-6 py-2.5 text-sm font-bold text-bad transition-opacity hover:opacity-80"
            >
              Still learning
            </button>
            <button
              type="button"
              onClick={() => mark(true)}
              className="rounded-full bg-good px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              I know it
            </button>
          </>
        )}
        <button type="button" onClick={() => startDeck(shuffled(items))} className={btn}>
          Shuffle
        </button>
      </div>
    </div>
  );
}

export default function LessonTabs({
  quizId,
  quizSlug,
  vocabulary,
  grammarNotes,
  questions,
  advancedQuestions = [],
}: {
  quizId: string;
  quizSlug: string;
  vocabulary: VocabularyItem[] | null;
  grammarNotes: string[] | null;
  questions: SafeQuestion[];
  advancedQuestions?: SafeQuestion[];
}) {
  const hasAdvanced = advancedQuestions.length > 0;

  const availableTabs: { key: Tab; label: string; count?: number }[] = [
    ...(vocabulary && vocabulary.length > 0
      ? [{ key: "vocabulary" as Tab, label: "Vocabulary", count: vocabulary.length }]
      : []),
    ...(vocabulary && vocabulary.length > 0
      ? [{ key: "flashcards" as Tab, label: "Flashcards", count: vocabulary.length }]
      : []),
    ...(grammarNotes && grammarNotes.length > 0
      ? [{ key: "grammar" as Tab, label: "Structures", count: grammarNotes.length }]
      : []),
    { key: "practice" as Tab, label: "Practice", count: questions.length },
    ...(hasAdvanced
      ? [{ key: "advanced" as Tab, label: "Advanced Practice", count: advancedQuestions.length }]
      : []),
  ];

  const [tab, setTab] = useState<Tab>(availableTabs[0]?.key ?? "practice");

  // Every panel stays mounted (only hidden) so answers typed in a practice tab
  // are not lost when the student flips to Structures and back.
  const panel = (key: Tab) => (tab === key ? "" : "hidden");

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
        {vocabulary && vocabulary.length > 0 && (
          <div className={panel("vocabulary")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {vocabulary.map((item, i) => (
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
          </div>
        )}

        {vocabulary && vocabulary.length > 0 && (
          <div className={panel("flashcards")}>
            <Flashcards items={vocabulary} />
          </div>
        )}

        {grammarNotes && grammarNotes.length > 0 && (
          <div className={panel("grammar")}>
            <div className="flex flex-col gap-6">
              {grammarNotes.map((paragraph, i) => (
                <GrammarCard key={i} paragraph={paragraph} index={i} />
              ))}
            </div>
          </div>
        )}

        <div className={panel("practice")}>
          {questions.length === 0 ? (
            <p className="text-ink-soft">No practice questions yet.</p>
          ) : (
            <QuizRunner
              quizId={quizId}
              quizSlug={quizSlug}
              questions={questions}
              section={hasAdvanced ? "basic" : undefined}
            />
          )}
        </div>

        {hasAdvanced && (
          <div className={panel("advanced")}>
            <div className="flex flex-wrap items-center gap-3 rounded-xl2 border border-warm/20 bg-warm-soft/50 px-5 py-4">
              <span className="rounded-full bg-warm px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                B2 – B2+
              </span>
              <p className="text-sm text-ink-soft">
                Harder tasks: read for logic and cohesion, not just grammar. Scored separately from Practice.
              </p>
            </div>
            <QuizRunner
              quizId={quizId}
              quizSlug={quizSlug}
              questions={advancedQuestions}
              section="advanced"
            />
          </div>
        )}
      </div>
    </div>
  );
}
