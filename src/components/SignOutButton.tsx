"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-full border-2 border-line bg-surface px-4 py-2 text-sm font-bold text-ink hover:border-ink-soft transition-colors"
    >
      Sign out
    </button>
  );
}
