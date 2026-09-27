"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ChangePasswordForm({ email }: { email: string }) {
  const supabase = createClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới nhập lại không khớp.");
      return;
    }

    setLoading(true);

    // Xác nhận lại mật khẩu hiện tại trước khi đổi — tránh trường hợp máy
    // tính dùng chung, người khác đổi mật khẩu của học sinh khi họ quên
    // đăng xuất.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (signInError) {
      setLoading(false);
      setError("Mật khẩu hiện tại không đúng.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Đổi mật khẩu thành công!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Mật khẩu hiện tại
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Mật khẩu mới
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
        />
        <span className="text-xs font-normal text-ink-faint">Ít nhất 6 ký tự.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
        Nhập lại mật khẩu mới
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
        />
      </label>

      {error && (
        <p className="rounded-lg border border-bad bg-bad-soft px-3.5 py-2.5 text-sm text-bad">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-lg border border-line bg-accent-soft px-3.5 py-2.5 text-sm text-accent-strong">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
      >
        {loading ? "Đang đổi…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
