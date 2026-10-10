"use client";

import { useState, useTransition } from "react";
import { CLASS_FOLDERS } from "@/lib/classAccess";
import { setStudentClasses } from "./actions";

/** Tick which class folders a student may open. Nothing ticked = sees everything. */
export default function ClassPicker({
  profileId,
  initial,
}: {
  profileId: string;
  initial: string[];
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(key: string) {
    setError(null);
    const previous = selected;
    const next = previous.includes(key) ? previous.filter((k) => k !== key) : [...previous, key];
    setSelected(next);
    startTransition(async () => {
      try {
        const result = await setStudentClasses(profileId, next);
        if (!result.ok) {
          setSelected(previous);
          setError(result.error);
        }
      } catch (err) {
        setSelected(previous);
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  return (
    <div className="basis-full border-t border-line pt-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">
        Lớp / folder được vào {selected.length === 0 && "(chưa chọn = thấy tất cả)"}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CLASS_FOLDERS.map((folder) => {
          const on = selected.includes(folder.key);
          return (
            <button
              key={folder.key}
              type="button"
              disabled={isPending}
              onClick={() => toggle(folder.key)}
              aria-pressed={on}
              className={
                "rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60 " +
                (on
                  ? "border-accent bg-accent text-white"
                  : "border-line bg-surface text-ink hover:border-ink-soft")
              }
            >
              {on ? "✓ " : ""}
              {folder.label}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}
