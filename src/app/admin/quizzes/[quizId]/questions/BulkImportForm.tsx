"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { bulkCreateQuestions } from "./actions";

const PLACEHOLDER = `1. What is the capital of Vietnam?
A. Ho Chi Minh City
B. Hanoi
C. Da Nang
D. Hue
Đáp án: B

2. She ___ to school every day.
A. go
B. goes
C. going
D. gone
Đáp án: B`;

/** Paste a whole ready-made multiple-choice test at once instead of adding
 *  questions one by one — see bulkCreateQuestions in ./actions.ts for the
 *  exact format this parses. */
export default function BulkImportForm({
  quizId,
  nextOrderIndex,
  title = "Dán nhiều câu hỏi cùng lúc",
}: {
  quizId: string;
  nextOrderIndex: number;
  /** Button / heading text — lets the same form appear twice (e.g. for Advanced Practice). */
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await bulkCreateQuestions(quizId, text, nextOrderIndex);
        if (result.ok) {
          setSuccess(`Đã thêm ${result.count} câu hỏi.`);
          setText("");
          router.refresh();
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không nhập được câu hỏi. Vui lòng thử lại.");
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-line px-3.5 py-2 text-xs font-semibold text-ink hover:border-ink-soft transition-colors"
      >
        {title}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-3 rounded-xl2 border border-line bg-paper-alt/40 p-4"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">
          {title}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Mỗi câu: 1 dòng câu hỏi (đánh số hay không đều được), rồi 4 dòng đáp án bắt đầu bằng A. B.
          C. D., cuối cùng thêm 1 dòng{" "}
          <code className="rounded bg-paper px-1">Đáp án: B</code> ghi chữ cái đúng. Để 1 dòng trống
          giữa các câu.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        placeholder={PLACEHOLDER}
        className="rounded-lg border border-line bg-surface px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-accent"
      />

      {error && (
        <p className="whitespace-pre-wrap rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-line bg-accent-soft px-3.5 py-2.5 text-sm text-accent-strong">
          {success}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !text.trim()}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
        >
          {isPending ? "Đang nhập…" : "Nhập câu hỏi"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-ink-soft hover:text-ink"
        >
          Đóng
        </button>
      </div>
    </form>
  );
}
