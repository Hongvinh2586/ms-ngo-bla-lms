-- Adds optional "lesson content" to quizzes: a vocabulary list and a list
-- of grammar/structure notes. Used by the Writing courses (A2/B1/B2),
-- whose quiz page shows three tabs — Từ vựng / Cấu trúc / Kiểm tra — instead
-- of jumping straight into the test. Any quiz without this content (e.g.
-- everything in Vocabulary Builder and IELTS Preparation) keeps behaving
-- exactly as before: no tabs, straight into the quiz.
--
-- Run this once in Supabase -> SQL Editor, after schema.sql (and any
-- earlier migration_00N files, if this is an existing project) have
-- already been run. Safe to run more than once.

alter table public.quizzes add column if not exists vocabulary jsonb;
alter table public.quizzes add column if not exists grammar_notes jsonb;

comment on column public.quizzes.vocabulary is
  'Optional array of {"term": "...", "meaning": "...", "example": "..."} shown on the quiz page''s "Từ vựng" tab. Null/empty = no vocabulary tab.';
comment on column public.quizzes.grammar_notes is
  'Optional array of paragraph strings shown on the quiz page''s "Cấu trúc" tab. Null/empty = no structure tab.';
