"use client";

import { useState, useTransition } from "react";
import { removeAllowedStudent } from "./actions";

export default function RemoveAllowedStudentButton({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await removeAllowedStudent(email);
        if (result.ok) {
          setConfirming(false);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove.");
      }
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-bad">Xoá khỏi danh sách?</span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="rounded-lg bg-bad px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Đang xoá…" : "Xoá"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs font-semibold text-ink-soft"
          >
            Huỷ
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
      className="text-xs font-semibold text-bad hover:underline"
    >
      Xoá
    </button>
  );
}
