"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createQuiz, updateQuiz } from "./actions";
import type { AdminQuizRow, QuizFormInput } from "@/lib/types";

const CATEGORY_OPTIONS = [
  { value: "", label: "— No course —" },
  { value: "vocabulary", label: "Vocabulary Builder" },
  { value: "ielts", label: "IELTS Preparation" },
  { value: "writing-a2", label: "A2 Writing Course" },
  { value: "writing-b1", label: "B1 Writing Course" },
  { value: "writing-b2", label: "B2 Writing Course" },
];

const inputClass =
  "rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent";

export default function QuizForm({
  mode,
  quiz,
}: {
  mode: "create" | "edit";
  quiz?: AdminQuizRow;
}) {
  const [slug, setSlug] = useState(quiz?.slug ?? "");
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [level, setLevel] = useState(quiz?.level ?? "");
  const [category, setCategory] = useState(quiz?.category ?? "");
  const [timeLimit, setTimeLimit] = useState(
    quiz?.time_limit_minutes != null ? String(quiz.time_limit_minutes) : ""
  );
  const [isPublished, setIsPublished] = useState(quiz?.is_published ?? true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const input: QuizFormInput = {
      slug,
      title,
      description,
      level,
      category,
      timeLimitMinutes: timeLimit.trim() ? Number(timeLimit) : null,
      isPublished,
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createQuiz(input);
        } else if (quiz) {
          await updateQuiz(quiz.id, input);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-xl flex-col gap-4">
      <Field label="Title">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field
        label="Slug"
        hint="Used in the URL, e.g. /quizzes/your-slug. Leave blank to generate it from the title."
      >
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto-generated-from-title"
          className={inputClass}
        />
      </Field>

      <Field label="Description">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Level" hint="e.g. A2–B1">
          <input value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Suggested time (minutes)">
          <input
            type="number"
            min={0}
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Course" hint="Which homepage card this quiz shows up under.">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
        />
        Published (visible to students)
      </label>

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
        {isPending ? "Saving…" : mode === "create" ? "Create quiz" : "Save changes"}
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
