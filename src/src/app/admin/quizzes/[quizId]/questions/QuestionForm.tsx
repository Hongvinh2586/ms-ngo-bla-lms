"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { MatchingPair, QuestionFormInput, QuestionRow, QuestionType } from "@/lib/types";
import { createQuestion, updateQuestion } from "./actions";

const TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple choice" },
  { value: "true_false", label: "True / False" },
  { value: "fill_blank", label: "Fill in the blank" },
  { value: "sentence_completion", label: "Sentence completion" },
  { value: "matching", label: "Matching" },
];

const inputClass =
  "rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent";

function questionToInput(question: QuestionRow | undefined, defaultOrderIndex: number): QuestionFormInput {
  const data = (question?.data ?? {}) as Record<string, unknown>;
  return {
    type: question?.type ?? "multiple_choice",
    prompt: question?.prompt ?? "",
    explanation: question?.explanation ?? "",
    points: question?.points ?? 1,
    orderIndex: question?.order_index ?? defaultOrderIndex,
    options: (data.options as string[] | undefined) ?? ["", ""],
    correctIndex: (data.correctIndex as number | undefined) ?? 0,
    correctBoolean: (data.correctAnswer as boolean | undefined) ?? true,
    acceptedAnswers: (data.acceptedAnswers as string[] | undefined) ?? [""],
    pairs: (data.pairs as MatchingPair[] | undefined) ?? [
      { left: "", right: "" },
      { left: "", right: "" },
    ],
  };
}

export default function QuestionForm({
  quizId,
  question,
  nextOrderIndex,
}: {
  quizId: string;
  question?: QuestionRow;
  nextOrderIndex?: number;
}) {
  const [input, setInput] = useState<QuestionFormInput>(() =>
    questionToInput(question, nextOrderIndex ?? 1)
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof QuestionFormInput>(key: K, value: QuestionFormInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        if (question) {
          await updateQuestion(question.id, quizId, input);
        } else {
          await createQuestion(quizId, input);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-2xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Type">
          <select
            value={input.type}
            onChange={(e) => update("type", e.target.value as QuestionType)}
            className={inputClass}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Order" hint="Where this question appears in the quiz.">
          <input
            type="number"
            min={1}
            value={input.orderIndex}
            onChange={(e) => update("orderIndex", Number(e.target.value))}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Prompt">
        <textarea
          required
          rows={2}
          value={input.prompt}
          onChange={(e) => update("prompt", e.target.value)}
          className={inputClass}
        />
      </Field>

      {input.type === "multiple_choice" && (
        <OptionsEditor
          options={input.options}
          correctIndex={input.correctIndex}
          onChange={(options, correctIndex) => {
            update("options", options);
            update("correctIndex", correctIndex);
          }}
        />
      )}

      {input.type === "true_false" && (
        <Field label="Correct answer">
          <div className="flex gap-3">
            {[true, false].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => update("correctBoolean", val)}
                className={`rounded-lg border px-6 py-2.5 text-sm font-semibold transition-colors ${
                  input.correctBoolean === val
                    ? "border-accent bg-accent-soft text-ink"
                    : "border-line text-ink-soft hover:border-ink-soft"
                }`}
              >
                {val ? "True" : "False"}
              </button>
            ))}
          </div>
        </Field>
      )}

      {(input.type === "fill_blank" || input.type === "sentence_completion") && (
        <ListEditor
          label="Accepted answers"
          hint="Any of these count as correct (matched case-insensitively)."
          addLabel="+ Add answer"
          items={input.acceptedAnswers}
          onChange={(items) => update("acceptedAnswers", items)}
        />
      )}

      {input.type === "matching" && (
        <PairsEditor pairs={input.pairs} onChange={(pairs) => update("pairs", pairs)} />
      )}

      <Field label="Explanation" hint="Shown to the student after grading (optional).">
        <textarea
          rows={2}
          value={input.explanation}
          onChange={(e) => update("explanation", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label="Points">
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={input.points}
          onChange={(e) => update("points", Number(e.target.value))}
          className={inputClass}
        />
      </Field>

      {error && (
        <p className="rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-fit rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
      >
        {isPending ? "Saving…" : question ? "Save question" : "Add question"}
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-ink-faint">{hint}</span>}
    </label>
  );
}

function OptionsEditor({
  options,
  correctIndex,
  onChange,
}: {
  options: string[];
  correctIndex: number;
  onChange: (options: string[], correctIndex: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">Options — pick the correct one</span>
      {options.map((option, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            name="correct-option"
            checked={correctIndex === i}
            onChange={() => onChange(options, i)}
          />
          <input
            value={option}
            onChange={(e) => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next, correctIndex);
            }}
            placeholder={`Option ${i + 1}`}
            className={`flex-1 ${inputClass}`}
          />
          {options.length > 2 && (
            <button
              type="button"
              onClick={() => {
                const next = options.filter((_, idx) => idx !== i);
                let nextCorrect = correctIndex;
                if (correctIndex === i) nextCorrect = 0;
                else if (correctIndex > i) nextCorrect = correctIndex - 1;
                onChange(next, nextCorrect);
              }}
              className="text-xs font-semibold text-bad"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...options, ""], correctIndex)}
        className="w-fit text-xs font-semibold text-accent"
      >
        + Add option
      </button>
    </div>
  );
}

function ListEditor({
  label,
  hint,
  addLabel,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  addLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      {hint && <span className="-mt-1 text-xs font-normal text-ink-faint">{hint}</span>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className={`flex-1 ${inputClass}`}
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-xs font-semibold text-bad"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="w-fit text-xs font-semibold text-accent"
      >
        {addLabel}
      </button>
    </div>
  );
}

function PairsEditor({
  pairs,
  onChange,
}: {
  pairs: MatchingPair[];
  onChange: (pairs: MatchingPair[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-ink">Matching pairs</span>
      {pairs.map((pair, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={pair.left}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...next[i], left: e.target.value };
              onChange(next);
            }}
            placeholder="Left"
            className={`flex-1 ${inputClass}`}
          />
          <span className="text-ink-faint">→</span>
          <input
            value={pair.right}
            onChange={(e) => {
              const next = [...pairs];
              next[i] = { ...next[i], right: e.target.value };
              onChange(next);
            }}
            placeholder="Right"
            className={`flex-1 ${inputClass}`}
          />
          {pairs.length > 2 && (
            <button
              type="button"
              onClick={() => onChange(pairs.filter((_, idx) => idx !== i))}
              className="text-xs font-semibold text-bad"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...pairs, { left: "", right: "" }])}
        className="w-fit text-xs font-semibold text-accent"
      >
        + Add pair
      </button>
    </div>
  );
}
