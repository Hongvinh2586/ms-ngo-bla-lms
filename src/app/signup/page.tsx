"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // Check the teacher's allowlist first (see is_email_allowed() in
    // supabase/migration_005_allowed_students.sql) so someone whose email
    // isn't on the class list gets a clear reason immediately, instead of
    // whatever generic message Supabase's Auth API would otherwise send back
    // — a database trigger also blocks account creation itself either way,
    // this is just what makes the rejection legible to a student.
    const { data: allowed, error: allowedError } = await supabase.rpc("is_email_allowed", {
      check_email: email,
    });

    if (allowedError) {
      setLoading(false);
      setError(allowedError.message);
      return;
    }

    if (!allowed) {
      setLoading(false);
      setError(
        "Email này chưa có trong danh sách học sinh của lớp. Vui lòng liên hệ giáo viên để được thêm vào danh sách trước khi đăng ký."
      );
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // When Supabase's "Confirm email" setting is turned off, signUp()
    // already comes back with a live, signed-in session — there's no email
    // step at all in that case. Skip the "check your email" screen and take
    // the student straight to the quizzes instead of making them retype the
    // password they just chose on the login page. If email confirmation is
    // still on, there's no session yet, and the message below still applies.
    if (data.session) {
      router.push("/quizzes");
      router.refresh();
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">Check your email</h1>
        <p className="mt-3 text-ink-soft">
          We sent a confirmation link to <strong>{email}</strong>. Open it, then come back and
          log in.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-strong transition-colors"
        >
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">Create your account</h1>
      <p className="mt-2 text-ink-soft">Set up your student account to start taking quizzes.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Full name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-accent"
          />
          <span className="text-xs font-normal text-ink-faint">At least 6 characters.</span>
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
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent">
          Log in
        </Link>
      </p>
    </div>
  );
}
