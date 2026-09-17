"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizFormInput } from "@/lib/types";

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createQuiz(input: QuizFormInput) {
  const supabase = createClient();
  const slug = normalizeSlug(input.slug || input.title);

  if (!slug) {
    throw new Error("Please provide a title or a slug.");
  }

  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      slug,
      title: input.title.trim(),
      description: input.description.trim() || null,
      level: input.level.trim() || null,
      category: input.category || null,
      time_limit_minutes: input.timeLimitMinutes,
      is_published: input.isPublished,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create quiz.");
  }

  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  revalidatePath("/");
  redirect(`/admin/quizzes/${data.id}`);
}

export async function updateQuiz(quizId: string, input: QuizFormInput) {
  const supabase = createClient();
  const slug = normalizeSlug(input.slug || input.title);

  if (!slug) {
    throw new Error("Please provide a title or a slug.");
  }

  const { error } = await supabase
    .from("quizzes")
    .update({
      slug,
      title: input.title.trim(),
      description: input.description.trim() || null,
      level: input.level.trim() || null,
      category: input.category || null,
      time_limit_minutes: input.timeLimitMinutes,
      is_published: input.isPublished,
    })
    .eq("id", quizId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/quizzes/${quizId}`);
  revalidatePath("/quizzes");
  revalidatePath("/");
}

export async function deleteQuiz(quizId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/quizzes");
  revalidatePath("/quizzes");
  revalidatePath("/");
}
