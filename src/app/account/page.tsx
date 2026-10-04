import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-3xl font-bold text-ink">Your account</h1>
      <p className="mt-2 text-ink-soft">Change your password whenever you like.</p>
      <div className="mt-8">
        <ChangePasswordForm email={user.email ?? ""} />
      </div>
    </div>
  );
}
