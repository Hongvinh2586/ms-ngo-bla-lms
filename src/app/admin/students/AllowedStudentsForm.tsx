"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addAllowedStudents } from "./actions";

const PLACEHOLDER = `Trần Hà Phương\tphuong@gmail.com
Nguyễn Ngọc Huyền My\tmy@gmail.com`;

/** Paste a whole class list (name + email, one student per line — exactly
 *  what pasting a spreadsheet table gives you) to gate who /signup accepts,
 *  instead of inviting each student one by one. See addAllowedStudents in
 *  ./actions.ts for the exact parsing rules, and
 *  supabase/migration_005_allowed_students.sql for how this is enforced. */
export default function AllowedStudentsForm() {
  const router = useRouter();
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
        const result = await addAllowedStudents(text);
        if (result.ok) {
          const skippedNote =
            result.invalidLines.length > 0
              ? ` Bỏ qua ${result.invalidLines.length} dòng vì không tìm thấy email hợp lệ: ${result.invalidLines.join("; ")}`
              : "";
          setSuccess(`Đã thêm/cập nhật ${result.added} email vào danh sách.${skippedNote}`);
          setText("");
          router.refresh();
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không thêm được danh sách. Vui lòng thử lại.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl2 border border-line bg-surface p-4 shadow-card"
    >
      <p className="text-xs text-ink-soft">
        Dán danh sách học sinh — mỗi dòng 1 em, tên và email cách nhau bằng dấu tab, dấu phẩy, hoặc
        chỉ cần dán nguyên cả bảng từ Excel/Google Sheets vào đây. Chỉ những email có trong danh
        sách này mới đăng ký được ở trang <code className="rounded bg-paper px-1">/signup</code>.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder={PLACEHOLDER}
        className="rounded-lg border border-line bg-paper px-3.5 py-2.5 font-mono text-xs text-ink outline-none focus:border-accent"
      />

      {error && (
        <p className="whitespace-pre-wrap rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}
      {success && (
        <p className="whitespace-pre-wrap rounded-lg border border-line bg-accent-soft px-3.5 py-2.5 text-sm text-accent-strong">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !text.trim()}
        className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
      >
        {isPending ? "Đang thêm…" : "Thêm vào danh sách"}
      </button>
    </form>
  );
}
