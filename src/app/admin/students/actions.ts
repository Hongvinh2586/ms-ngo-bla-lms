"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setUserRole(profileId: string, newRole: string) {
  const supabase = createClient();

  const { error } = await supabase.rpc("set_user_role", {
    target_user_id: profileId,
    new_role: newRole,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/students");
}
