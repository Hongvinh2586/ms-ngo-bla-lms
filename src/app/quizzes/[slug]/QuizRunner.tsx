"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { SafeQuestion, StudentAnswer, StudentAnswers } from "@/lib/types";
import { submitQuizAttempt } from "./actions";

interface Props {
  quizId: string;
  quizSlug: string;
  questions: SafeQuestion[];
  /** Lessons only: score just the basic or just the advanced part of the quiz. */
  section?: "basic" | "advanced" | "structures" | "vocabulary";
  /** Emoji mascot that rides along the progress bar. */
  mascot?: string;
  /** Suggested time in minutes. When set, a countdown is shown while the student works. */
  timeLimitMinutes?: number | null;
}

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const sec = totalSeconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
}

// Blend two #rrggbb colours: t=0 gives a, t=1 gives b.
function mixColor(a: string, b: string, t: number): string {
  const p = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return "rgb(" + c.join(",") + ")";
}

export default function QuizRunner({ quizId, questions, section, mascot, timeLimitMinutes }: Props) {
  const limitSeconds = timeLimitMinutes && timeLimitMinutes > 0 ? Math.round(timeLimitMinutes * 60) : null;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(limitSeconds);
  useEffect(() => {
    if (limitSeconds === null) return;
    // Count down from a fixed end time so a throttled background tab stays accurate.
    const endAt = Date.now() + limitSeconds * 1000;
    setSecondsLeft(limitSeconds);
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [limitSeconds]);
  const timeUp = secondsLeft !== null && secondsLeft <= 0;
  const timeLow = secondsLeft !== null && limitSeconds !== null && !timeUp && secondsLeft <= Math.min(60, limitSeconds * 0.2);

  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answeredCount = Object.keys(answers).length;
  const total = questions.length;
  const pct = total ? (answeredCount / total) * 100 : 0;
  const allDone = total > 0 && answeredCount >= total;
  // The Submit button starts pale and gets darker as more questions are answered,
  // then turns sunny yellow and pulses gently once every question has an answer.
  const t = total ? Math.min(1, answeredCount / total) : 0;
  const submitStyle = allDone
    ? { backgroundColor: "#FFC93C", color: "#2B3010" }
    : { backgroundColor: mixColor("#F4FAD9", "#2F5A12", t), color: t >= 0.55 ? "#FFFFFF" : "#2B3010" };
  const cheer =
    timeUp
      ? "Time's up! Press Submit when you are ready."
      : answeredCount === 0
      ? "Let's go!"
      : answeredCount >= total
        ? "All answered. Press Submit!"
        : pct >= 66
          ? "Almost there!"
          : pct >= 33
            ? "Great job, keep going!"
            : "Nice start!";

  function setAnswer(questionId: string, answer: StudentAnswer) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        await submitQuizAttempt(quizId, answers, section);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="mt-8 flex flex-col gap-6 pb-20 sm:pb-8">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          index={index}
          mascot={mascot ?? "\u{1F41D}"}
          question={question}
          answer={answers[question.id]}
          onChange={(answer) => setAnswer(question.id, answer)}
        />
      ))}

      {error && (
        <p className="rounded-lg border border-bad bg-bad-soft px-4 py-3 text-sm text-bad">
          {error}
        </p>
      )}

      <div className="sticky bottom-2 z-10 ml-auto flex w-fit max-w-full items-center gap-3 rounded-full bg-[#A9BA4E] py-1.5 pl-1.5 pr-1.5 shadow-[0_6px_18px_rgba(62,74,18,0.30)] ring-1 ring-black/5">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all duration-500"
          style={{ background: "conic-gradient(#E4F76A 0 " + pct + "%, rgba(43,48,16,0.28) 0)" }}
          role="img"
          aria-label={Math.round(pct) + " percent answered"}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#F1F3DF] text-[10px] font-extrabold text-ink">
            {Math.round(pct)}%
          </span>
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-extrabold text-ink">
            {answeredCount}/{total} answered
          </p>
          {secondsLeft !== null ? (
            <p
              className={
                "text-[11px] font-bold tabular-nums " +
                (timeUp ? "text-[#6E1F14]" : timeLow ? "animate-pulse text-[#6E1F14]" : "text-ink/75")
              }
              role="timer"
              aria-label={timeUp ? "Time is up" : "Time left " + formatClock(secondsLeft)}
            >
              {timeUp ? "Time's up!" : "\u23F0 " + formatClock(secondsLeft) + " left"}
            </p>
          ) : (
            <p className="truncate text-[11px] font-bold text-ink/75">{cheer}</p>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          style={submitStyle}
          className={
            "press shrink-0 rounded-full px-4 py-2 text-sm font-extrabold shadow-[0_2px_0_rgba(43,48,16,0.35)] transition-colors duration-500 disabled:opacity-60 " +
            (allDone && !isPending ? "submit-ready" : "")
          }
        >
          {isPending ? "Submitting…" : "Submit quiz"}
        </button>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  answer,
  onChange,
  mascot,
}: {
  index: number;
  mascot: string;
  question: SafeQuestion;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  // Typed-answer questions can also be answered by tapping a word in the word box.
  const blankType =
    question.type === "fill_blank" || question.type === "sentence_completion"
      ? question.type
      : null;
  const typed = answer?.type === "fill_blank" || answer?.type === "sentence_completion" ? answer.text : "";
  // The mascot hops each time a choice changes (for typing, only when the first letter arrives).
  const hopKey = answer ? (blankType ? "typed-" + (typed ? "yes" : "no") : JSON.stringify(answer)) : "none";
  return (
    <div className="rounded-xl2 border-[3px] border-ink bg-surface p-7 shadow-[0_6px_0_#2B3010]">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-block rounded-full bg-tint-butter px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-ink">
          Question {index + 1}
        </p>
        <span
          key={hopKey}
          className={(answer ? "mascot-hop" : "mascot-bob") + " text-3xl leading-none"}
          aria-hidden="true"
        >
          {mascot}
        </span>
      </div>
      <PromptView
        prompt={question.prompt}
        type={question.type}
        picked={typed}
        onPick={blankType ? (w: string) => onChange({ type: blankType, text: w }) : undefined}
      />

      <div className="mt-4">
        {question.type === "multiple_choice" && (
          <MultipleChoiceInput question={question} answer={answer} onChange={onChange} />
        )}
        {question.type === "true_false" && (
          <TrueFalseInput answer={answer} onChange={onChange} />
        )}
        {(question.type === "fill_blank" || question.type === "sentence_completion") && (
          <TextInput questionType={question.type} answer={answer} onChange={onChange} />
        )}
        {question.type === "matching" && (
          <MatchingInput question={question} answer={answer} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

// Splits a question prompt into: an instruction line (e.g. "Choose the best
// linking word."), the question body, and an optional word box, so the student
// sees them as separate blocks. Prompts without a recognisable instruction are
// shown as before.
const INSTRUCTION_RE =
  /^((?:Choose|Read|Match|Write|Complete|Combine|Use|Fill|Rewrite|Add|Make|Decide|Put|Change|Correct|Find|Select|Circle|Order|Answer|Look|Listen|Identify|Rearrange|Join|Transform|Paraphrase|Finish|Unscramble|Mark|Replace|Insert|Underline|Pick|True or [Ff]alse)\b[^.:?!]*[.:])(?:\s+|$)/;

function splitPrompt(prompt: string): {
  instruction: string;
  passage: string;
  body: string;
  words: string[];
} {
  let text = prompt.trim();
  let words: string[] = [];
  const wb = text.match(/\[Word box:\s*([^\]]*)\]\s*$/i);
  if (wb) {
    words = wb[1].split("/").map((w) => w.trim()).filter(Boolean);
    text = text.slice(0, wb.index).trim();
  }
  let instruction = "";
  let passage = "";
  const m = text.match(INSTRUCTION_RE);
  if (m) {
    const rest = text.slice(m[0].length).trim();
    if (rest) {
      instruction = m[1].trim();
      text = rest;
    }
  } else {
    // "Which ...?" on the first line, the material to work with on the next lines.
    const nl = text.indexOf("\n");
    if (nl > 0 && text.slice(0, nl).trim().endsWith("?")) {
      instruction = text.slice(0, nl).trim();
      text = text.slice(nl + 1).trim();
    }
  }
  if (instruction) {
    // Reading text first, the actual question as the last paragraph.
    const blocks = text.split(/\n\s*\n/);
    if (blocks.length >= 2) {
      text = (blocks.pop() ?? "").trim();
      passage = blocks.join("\n\n").trim();
    }
  }
  return { instruction, passage, body: text, words };
}

function PromptView({
  prompt,
  type,
  picked,
  onPick,
}: {
  prompt: string;
  type: string;
  picked?: string;
  onPick?: (word: string) => void;
}) {
  const split = splitPrompt(prompt);
  const { passage, body, words } = split;
  let instruction = split.instruction;
  // Prompts that carry no written instruction get a short standard one.
  if (!instruction) {
    const hasBlank = /_{2,}/.test(body);
    if (type === "true_false") instruction = "True or false?";
    else if (type === "multiple_choice" && hasBlank) instruction = "Choose the best answer to fill the blank.";
    else if ((type === "fill_blank" || type === "sentence_completion") && hasBlank)
      instruction = "Write the missing word(s) in the blank.";
  }
  return (
    <div className="mt-3">
      {instruction && (
        <p className="mb-3 text-base font-extrabold uppercase tracking-wide text-accent-strong">
          {instruction}
        </p>
      )}
      {passage && (
        <div className="mb-4 whitespace-pre-line rounded-2xl border-2 border-ink bg-tint-butter px-4 py-3 text-base font-semibold leading-relaxed text-ink">
          {passage}
        </div>
      )}
      <p
        className={
          (instruction
            ? "border-l-4 border-ink pl-4 font-display text-xl font-bold text-ink"
            : "font-display text-xl font-bold text-ink") + " whitespace-pre-line"
        }
      >
        {body}
      </p>
      {words.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-ink">Word box{onPick ? " · tap a word" : ""}</span>
          {words.map((w, i) =>
            onPick ? (
              <button
                key={i}
                type="button"
                onClick={() => onPick(w)}
                style={{ transform: "rotate(" + ((i % 3) - 1) * 1.5 + "deg)" }}
                className={
                  "press rounded-full border-2 border-ink px-4 py-1.5 text-lg font-bold shadow-[0_3px_0_#2B3010] " +
                  (picked && picked.trim().toLowerCase() === w.toLowerCase()
                    ? "bg-accent text-white"
                    : "bg-tint-butter text-ink")
                }
              >
                {w}
              </button>
            ) : (
              <span
                key={i}
                className="rounded-full border-2 border-ink bg-tint-butter px-3 py-1 text-base font-bold text-ink"
              >
                {w}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
}

function MultipleChoiceInput({
  question,
  answer,
  onChange,
}: {
  question: SafeQuestion;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  const options = (question.data as { options: string[] }).options ?? [];
  const selectedIndex = answer?.type === "multiple_choice" ? answer.selectedIndex : undefined;

  return (
    <div className="flex flex-col gap-2">
      {options.map((option, i) => (
        <label
          key={i}
          className={`press flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-semibold transition-colors ${
            selectedIndex === i
              ? "pick-pop border-accent bg-accent-soft text-ink"
              : "border-line bg-white text-ink hover:border-accent"
          }`}
        >
          <input
            type="radio"
            name={`q-${question.id}`}
            className="accent-[#5B6B1F]"
            checked={selectedIndex === i}
            onChange={() => onChange({ type: "multiple_choice", selectedIndex: i })}
          />
          {option}
        </label>
      ))}
    </div>
  );
}

function TrueFalseInput({
  answer,
  onChange,
}: {
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  const value = answer?.type === "true_false" ? answer.value : undefined;

  return (
    <div className="flex gap-3">
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          onClick={() => onChange({ type: "true_false", value: option })}
          className={`press rounded-full border-2 px-8 py-3 text-lg font-extrabold shadow-[0_3px_0_#CBD1A0] transition-colors ${
            value === option
              ? "pick-pop border-accent bg-accent-soft text-ink"
              : "border-line bg-white text-ink hover:border-accent"
          }`}
        >
          {option ? "True" : "False"}
        </button>
      ))}
    </div>
  );
}

function TextInput({
  questionType,
  answer,
  onChange,
}: {
  questionType: "fill_blank" | "sentence_completion";
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  const text =
    answer?.type === "fill_blank" || answer?.type === "sentence_completion" ? answer.text : "";

  return (
    <input
      type="text"
      value={text}
      onChange={(e) => onChange({ type: questionType, text: e.target.value })}
      placeholder="Type your answer…"
      autoCapitalize="none"
      autoComplete="off"
      spellCheck={false}
      className="w-full rounded-2xl border-[3px] border-ink bg-white px-5 py-4 text-xl font-bold text-ink shadow-[0_4px_0_#CBD1A0] outline-none transition-shadow placeholder:font-semibold placeholder:text-ink-faint focus:border-accent focus:shadow-[0_4px_0_#5B6B1F]"
    />
  );
}

function MatchingInput({
  question,
  answer,
  onChange,
}: {
  question: SafeQuestion;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  const data = question.data as { lefts: string[]; rights: string[] };
  const lefts = data.lefts ?? [];
  const rights = useMemo(() => data.rights ?? [], [data.rights]);
  const matches = answer?.type === "matching" ? answer.matches : {};

  function setMatch(left: string, right: string) {
    onChange({ type: "matching", matches: { ...matches, [left]: right } });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {lefts.map((left) => (
        <div key={left} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm font-medium text-ink">{left}</span>
          <select
            value={matches[left] ?? ""}
            onChange={(e) => setMatch(left, e.target.value)}
            className="w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-accent"
          >
            <option value="" disabled>
              Choose a match…
            </option>
            {rights.map((right) => (
              <option key={right} value={right}>
                {right}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
