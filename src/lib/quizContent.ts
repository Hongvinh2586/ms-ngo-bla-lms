import type { VocabularyItem } from "./types";

/** Turns "term | meaning | example" lines (one per vocabulary entry, blank
 *  lines ignored) into VocabularyItem[]. Returns null when there's nothing
 *  to save, so the "Từ vựng" tab stays hidden. Shared by the quiz form and
 *  the lesson form. */
export function parseVocabularyText(raw: string): VocabularyItem[] | null {
  const items: VocabularyItem[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const parts = line.split("|").map((p) => p.trim());
    const [term, meaning, example] = parts;
    if (!term || !meaning) continue;
    items.push({ term, meaning, example: example || null });
  }
  return items.length > 0 ? items : null;
}

/** Turns blank-line-separated paragraphs into string[]. Returns null when
 *  there's nothing to save, so the "Cấu trúc" tab stays hidden. */
export function parseGrammarNotesText(raw: string): string[] | null {
  const paragraphs = raw
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.length > 0 ? paragraphs : null;
}
