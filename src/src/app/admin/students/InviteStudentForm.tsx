"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inviteStudent } from "./actions";

/** Lets an admin pre-add a student by email only. Supabase emails that
 *  address a one-time invite link; the student clicks it and picks their
 *  own password on /set-password — the admin never sees or sets it. */
export default function InviteStudentForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await inviteStudent(email, fullName);
        setSuccess(`Đã gửi lời mời đến ${email}. Học viên bấm vào link trong email để tự đặt mật khẩu.`);
        setEmail("");
        setFullName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Không gửi được lời mời. Vui lòng thử lại.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl2 border border-line bg-surface p-4 shadow-card"
    >
      <label className="flex flex-1 min-w-[160px] flex-col gap-1.5 text-sm font-medium text-ink">
        Họ tên (không bắt buộc)
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-1 min-w-[200px] flex-col gap-1.5 text-sm font-medium text-ink">
        Email học viên
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
      >
        {isPending ? "Đang gửi…" : "Gửi lời mời"}
      </button>

      {error && (
        <p className="w-full rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}
      {success && (
        <p className="w-full rounded-lg border border-line bg-accent-soft px-3.5 py-2.5 text-sm text-accent-strong">
          {success}
        </p>
      )}
    </form>
  );
}
