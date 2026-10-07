"use client";

import { useMemo, useState, useTransition } from "react";
import type { SafeQuestion, StudentAnswer, StudentAnswers } from "@/lib/types";
import { submitQuizAttempt } from "./actions";

interface Props {
  quizId: string;
  quizSlug: string;
  questions: SafeQuestion[];
  /** Lessons only: score just the basic or just the advanced part of the quiz. */
  section?: "basic" | "advanced" | "structures" | "vocabulary";
}

export default function QuizRunner({ quizId, questions, section }: Props) {
  const [answers, setAnswers] = useState<StudentAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answeredCount = Object.keys(answers).length;

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
    <div className="mt-8 flex flex-col gap-6">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          index={index}
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

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl2 border-[3px] border-ink bg-tint-butter px-6 py-4 shadow-[0_5px_0_#2B3010]">
        <div className="h-3 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{
              width: (questions.length ? (answeredCount / questions.length) * 100 : 0) + "%",
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
        <span className="text-base font-extrabold text-ink">
          {answeredCount} of {questions.length} answered
        </span>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-full bg-accent px-7 py-3 text-base font-extrabold text-white shadow-[0_4px_0_#3E4A12] hover:bg-accent-strong disabled:opacity-60 transition-colors"
        >
          {isPending ? "Submitting…" : "Submit quiz"}
        </button>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  answer,
  onChange,
}: {
  index: number;
  question: SafeQuestion;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  return (
    <div className="rounded-xl2 border-[3px] border-ink bg-surface p-7 shadow-[0_6px_0_#2B3010]">
      <p className="inline-block rounded-full bg-tint-butter px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-ink">
        Question {index + 1}
      </p>
      <PromptView prompt={question.prompt} />

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

function splitPrompt(prompt: string): { instruction: string; body: string; words: string[] } {
  let text = prompt.trim();
  let words: string[] = [];
  const wb = text.match(/\[Word box:\s*([^\]]*)\]\s*$/i);
  if (wb) {
    words = wb[1].split("/").map((w) => w.trim()).filter(Boolean);
    text = text.slice(0, wb.index).trim();
  }
  let instruction = "";
  const m = text.match(INSTRUCTION_RE);
  if (m) {
    const rest = text.slice(m[0].length).trim();
    if (rest) {
      instruction = m[1].trim();
      text = rest;
    }
  }
  return { instruction, body: text, words };
}

function PromptView({ prompt }: { prompt: string }) {
  const { instruction, body, words } = splitPrompt(prompt);
  return (
    <div className="mt-3">
      {instruction && (
        <p className="mb-3 text-base font-extrabold uppercase tracking-wide text-accent-strong">
          {instruction}
        </p>
      )}
      <p
        className={
          instruction
            ? "border-l-4 border-ink pl-4 font-display text-xl font-bold text-ink"
            : "font-display text-xl font-bold text-ink"
        }
      >
        {body}
      </p>
      {words.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold uppercase tracking-widest text-ink">Word box</span>
          {words.map((w, i) => (
            <span
              key={i}
              className="rounded-full border-2 border-ink bg-tint-butter px-3 py-1 text-base font-bold text-ink"
            >
              {w}
            </span>
          ))}
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
          className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-base font-semibold transition-colors ${
            selectedIndex === i
              ? "border-accent bg-accent-soft text-ink"
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
          className={`rounded-full border-2 px-7 py-2.5 text-base font-extrabold transition-colors ${
            value === option
              ? "border-accent bg-accent-soft text-ink"
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
      className="w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-base text-ink outline-none focus:border-accent"
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
