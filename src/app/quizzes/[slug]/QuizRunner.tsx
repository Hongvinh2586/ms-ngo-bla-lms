"use client";

import { useMemo, useState, useTransition } from "react";
import type { SafeQuestion, StudentAnswer, StudentAnswers } from "@/lib/types";
import { submitQuizAttempt } from "./actions";

interface Props {
  quizId: string;
  quizSlug: string;
  questions: SafeQuestion[];
}

export default function QuizRunner({ quizId, questions }: Props) {
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
        await submitQuizAttempt(quizId, answers);
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

      <div className="flex items-center justify-between rounded-xl2 border border-line bg-paper-alt px-6 py-5">
        <span className="text-sm text-ink-soft">
          {answeredCount} of {questions.length} answered
        </span>
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
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
}: {
  index: number;
  question: SafeQuestion;
  answer: StudentAnswer | undefined;
  onChange: (answer: StudentAnswer) => void;
}) {
  return (
    <div className="rounded-xl2 border border-line bg-surface p-7 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
        Question {index + 1}
      </p>
      <p className="mt-2 font-display text-lg font-semibold text-ink">{question.prompt}</p>

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
          className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
            selectedIndex === i
              ? "border-accent bg-accent-soft text-ink"
              : "border-line text-ink-soft hover:border-ink-soft"
          }`}
        >
          <input
            type="radio"
            name={`q-${question.id}`}
            className="accent-[#9C6B22]"
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
          className={`rounded-lg border px-6 py-2.5 text-sm font-semibold transition-colors ${
            value === option
              ? "border-accent bg-accent-soft text-ink"
              : "border-line text-ink-soft hover:border-ink-soft"
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
      className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
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
            className="w-full rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
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
