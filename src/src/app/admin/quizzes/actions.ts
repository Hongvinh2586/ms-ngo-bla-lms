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

// Turns "term | meaning | example" lines (one per vocabulary entry, blank
// lines ignored) into VocabularyItem[]. Returns null when there's nothing
// to save, so the "Từ vựng" tab stays hidden for quizzes that don't use it.
function parseVocabularyText(text: string): { term: string; meaning: string; example: string | null }[] | null {
  const items = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [term, meaning, example] = line.split("|").map((part) => part.trim());
      return { term: term || "", meaning: meaning || "", example: example || null };
    })
    .filter((item) => item.term && item.meaning);

  return items.length > 0 ? items : null;
}

// Turns blank-line-separated paragraphs into string[]. Returns null when
// there's nothing to save, so the "Cấu trúc" tab stays hidden.
function parseGrammarNotesText(text: string): string[] | null {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return paragraphs.length > 0 ? paragraphs : null;
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
      vocabulary: parseVocabularyText(input.vocabularyText),
      grammar_notes: parseGrammarNotesText(input.grammarNotesText),
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
      vocabulary: parseVocabularyText(input.vocabularyText),
      grammar_notes: parseGrammarNotesText(input.grammarNotesText),
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
