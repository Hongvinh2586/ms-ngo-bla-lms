"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { createLesson, updateLesson } from "./actions";
import type { AdminQuizRow, LessonFormInput, VocabularyItem } from "@/lib/types";
import { VOCAB_FOLDERS } from "@/lib/types";

const inputClass =
  "rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent";

function vocabularyToText(items?: VocabularyItem[] | null): string {
  if (!items || items.length === 0) return "";
  return items
    .map((it) => (it.example ? `${it.term} | ${it.meaning} | ${it.example}` : `${it.term} | ${it.meaning}`))
    .join("\n");
}

function grammarNotesToText(notes?: string[] | null): string {
  if (!notes || notes.length === 0) return "";
  return notes.join("\n\n");
}

export default function LessonForm({
  mode,
  lesson,
}: {
  mode: "create" | "edit";
  lesson?: AdminQuizRow;
}) {
  const [slug, setSlug] = useState(lesson?.slug ?? "");
  const [title, setTitle] = useState(lesson?.title ?? "");
  const [level, setLevel] = useState(lesson?.level ?? "");
  const [category, setCategory] = useState(lesson?.category ?? "");
  const [orderIndex, setOrderIndex] = useState(
    lesson?.order_index != null ? String(lesson.order_index) : ""
  );
  const [isPublished, setIsPublished] = useState(lesson?.is_published ?? true);
  const [vocabularyText, setVocabularyText] = useState(vocabularyToText(lesson?.vocabulary));
  const [grammarNotesText, setGrammarNotesText] = useState(grammarNotesToText(lesson?.grammar_notes));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const input: LessonFormInput = {
      slug,
      title,
      level,
      category,
      orderIndex: orderIndex.trim() ? Number(orderIndex) : null,
      isPublished,
      vocabularyText,
      grammarNotesText,
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createLesson(input);
        } else if (lesson) {
          await updateLesson(lesson.id, input);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-2xl flex-col gap-4">
      <Field label="Tên bài học">
        <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      </Field>

      <Field
        label="Slug"
        hint="Dùng trong đường dẫn, ví dụ /lessons/ten-slug. Để trống sẽ tự tạo từ tên bài học."
      >
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="tu-dong-tao-tu-ten"
          className={inputClass}
        />
      </Field>

      <Field label="Mục hiển thị" hint="Chọn Vocabulary Builder để bài học hiện trong mục Vocabulary Builder (có tab Flashcards).">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
          <option value="">Lessons for Academic Writing</option>
          <option value="vocabulary">Vocabulary Builder</option>
          {VOCAB_FOLDERS.map((f) => (
            <option key={f.category} value={f.category}>
              Vocabulary Builder / {f.title}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Trình độ" hint="Ví dụ: A2–B1">
          <input value={level} onChange={(e) => setLevel(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Thứ tự hiển thị" hint="Số nhỏ hơn hiện trước. Để trống nếu không cần.">
          <input
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Từ vựng"
        hint="Mỗi từ một dòng, dạng: từ | nghĩa | ví dụ (ví dụ có thể bỏ trống)."
      >
        <textarea
          value={vocabularyText}
          onChange={(e) => setVocabularyText(e.target.value)}
          rows={8}
          placeholder={
            "similar | giống nhau | These two paintings are similar.\nunlike | không giống như | Unlike his brother, he is very quiet."
          }
          className={inputClass}
        />
      </Field>

      <Field label="Cấu trúc / Ngữ pháp" hint="Mỗi đoạn cách nhau bằng 1 dòng trống.">
        <textarea
          value={grammarNotesText}
          onChange={(e) => setGrammarNotesText(e.target.value)}
          rows={8}
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        Xuất bản (học sinh nhìn thấy được)
      </label>

      {error && (
        <p className="rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-fit rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
      >
        {isPending ? "Đang lưu…" : mode === "create" ? "Tạo bài học" : "Lưu thay đổi"}
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
