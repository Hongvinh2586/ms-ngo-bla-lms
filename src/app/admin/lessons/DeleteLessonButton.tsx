"use client";

import { useState, useTransition } from "react";
import { deleteLesson } from "./actions";

export default function DeleteLessonButton({
  lessonId,
  lessonTitle,
}: {
  lessonId: string;
  lessonTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteLesson(lessonId);
        setConfirming(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not delete lesson.");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-bad">Delete &ldquo;{lessonTitle}&rdquo;?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-lg bg-bad px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Deleting…" : "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs font-semibold text-ink-soft"
          >
            Cancel
          </button>
        </div>
        {error && <span className="text-xs text-bad">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg border border-bad px-3.5 py-2 text-xs font-semibold text-bad hover:bg-bad-soft transition-colors"
    >
      Delete
    </button>
  );
}
