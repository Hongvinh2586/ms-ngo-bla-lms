"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LessonFormInput } from "@/lib/types";
import { parseVocabularyText, parseGrammarNotesText } from "@/lib/quizContent";

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createLesson(input: LessonFormInput) {
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
      description: null,
      level: input.level.trim() || null,
      category: null,
      time_limit_minutes: null,
      is_published: input.isPublished,
      is_lesson: true,
      order_index: input.orderIndex,
      vocabulary: parseVocabularyText(input.vocabularyText),
      grammar_notes: parseGrammarNotesText(input.grammarNotesText),
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create lesson.");
  }

  revalidatePath("/admin/lessons");
  revalidatePath("/lessons");
  redirect(`/admin/lessons/${data.id}`);
}

export async function updateLesson(lessonId: string, input: LessonFormInput) {
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
      level: input.level.trim() || null,
      is_published: input.isPublished,
      order_index: input.orderIndex,
      vocabulary: parseVocabularyText(input.vocabularyText),
      grammar_notes: parseGrammarNotesText(input.grammarNotesText),
    })
    .eq("id", lessonId)
    .eq("is_lesson", true);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/lessons");
  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath("/lessons");
  revalidatePath(`/lessons/${slug}`);
}

export async function deleteLesson(lessonId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", lessonId)
    .eq("is_lesson", true);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/lessons");
  revalidatePath("/lessons");
}
