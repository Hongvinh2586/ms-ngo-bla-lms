"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Landing page for an admin's email invite (see InviteStudentForm). The
 *  Supabase browser client auto-detects the one-time token in the URL on
 *  load and turns it into a real (but password-less) session — this page
 *  just waits for that, then lets the student pick their own password. */
export default function SetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setHasSession(true);
        const metaName = (user.user_metadata?.full_name as string | undefined) ?? "";
        setFullName(metaName);
      }
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Hai mật khẩu bạn nhập không khớp nhau.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
      error: updateError,
    } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName || undefined },
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (user && fullName.trim()) {
      await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    }

    setDone(true);
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-ink-soft">
        Đang kiểm tra lời mời…
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Link không hợp lệ</h1>
        <p className="mt-3 text-ink-soft">
          Link mời này không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ giáo viên để được gửi lại lời
          mời.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Đã tạo mật khẩu!</h1>
        <p className="mt-3 text-ink-soft">Bạn có thể bắt đầu học ngay bây giờ.</p>
        <button
          onClick={() => {
            router.push("/quizzes");
            router.refresh();
          }}
          className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
        >
          Vào học ngay
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">Tạo mật khẩu của bạn</h1>
      <p className="mt-2 text-ink-soft">Đặt mật khẩu để hoàn tất tài khoản học viên.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Họ tên
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Mật khẩu mới
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
          />
          <span className="text-xs font-normal text-ink-faint">Ít nhất 6 ký tự.</span>
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Xác nhận mật khẩu
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

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60 transition-colors"
        >
          {loading ? "Đang lưu…" : "Hoàn tất"}
        </button>
      </form>
    </div>
  );
}
