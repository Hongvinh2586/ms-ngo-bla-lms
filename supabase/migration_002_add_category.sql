-- Adds course categories (Vocabulary Builder, IELTS Preparation, Writing
-- Courses) so the homepage can show them as featured courses.
--
-- Run this ONCE in Supabase -> SQL Editor, AFTER you've already run
-- schema.sql and seed.sql. If you are setting up a brand new project instead,
-- you don't need this file — schema.sql already includes the `category`
-- column and seed.sql already tags the sample quiz with it.

alter table public.quizzes
  add column if not exists category text;

-- Tag the existing sample quiz as "vocabulary" so it shows up under the
-- Vocabulary Builder course card on the homepage.
update public.quizzes
set category = 'vocabulary'
where slug = 'vocabulary-builders-unit-1' and category is null;
