-- Ms Ngo Bla LMS — database schema
-- Run this once in your Supabase project: Dashboard -> SQL Editor -> New query
-- -> paste this whole file -> Run.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per student, created automatically when they sign up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- security definer so it can check the caller's own role without recursing
-- through the RLS policies below (which call this same function).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin());

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

-- Stops a student from granting themselves admin by calling the API
-- directly: only a request that is already from an admin (checked with
-- is_admin(), which reflects the real caller regardless of this trigger's
-- own elevated privileges) may change the `role` column. Role changes for
-- other people go through the set_user_role(...) function further down,
-- which is what the admin "Students" screen calls.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_trigger on public.profiles;
create trigger protect_profile_role_trigger
  before update on public.profiles
  for each row execute procedure public.protect_profile_role();

-- Lets an admin change someone else's role from the admin "Students" screen.
-- Runs as security definer (bypasses RLS for its own update) but still
-- checks is_admin() itself first, so only an actual admin can call it.
create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles.';
  end if;
  if new_role not in ('student', 'teacher', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;
  update public.profiles set role = new_role where id = target_user_id;
end;
$$;

grant execute on function public.set_user_role(uuid, text) to authenticated;

-- Auto-create a profile row whenever someone signs up through Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  level text,
  -- Which featured course this quiz belongs to on the homepage:
  -- 'vocabulary' | 'ielts' | 'writing' (free text, so you can add more later).
  category text,
  time_limit_minutes int,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.quizzes enable row level security;

create policy "quizzes: read if signed in" on public.quizzes
  for select using (auth.role() = 'authenticated' and is_published = true);

create policy "quizzes: admin read all" on public.quizzes
  for select using (public.is_admin());

create policy "quizzes: admin insert" on public.quizzes
  for insert with check (public.is_admin());

create policy "quizzes: admin update" on public.quizzes
  for update using (public.is_admin());

create policy "quizzes: admin delete" on public.quizzes
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- questions
--
-- `data` holds everything specific to the question type, INCLUDING the
-- correct answer. The app never sends the correct-answer fields to the
-- browser when a student is taking a quiz (see src/app/quizzes/[slug]/page.tsx),
-- so the normal app flow never leaks answers. Because the select policy
-- below is open to any signed-in user, a student who queries Supabase
-- directly (outside the app UI) could still read `data` and see the answer
-- key — acceptable for a small class site, but worth hardening later with a
-- server-only view or an edge function if this ever needs to resist a
-- motivated student. See README "Known limitations".
--
-- Shapes of `data` by `type`:
--   multiple_choice        { "options": string[], "correctIndex": number }
--   true_false             { "correctAnswer": boolean }
--   fill_blank             { "acceptedAnswers": string[] }   (case-insensitive)
--   sentence_completion    { "acceptedAnswers": string[] }   (case-insensitive)
--   matching                { "pairs": [{ "left": string, "right": string }] }
-- ---------------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  order_index int not null default 0,
  type text not null check (
    type in ('multiple_choice', 'true_false', 'fill_blank', 'sentence_completion', 'matching')
  ),
  prompt text not null,
  explanation text,
  points numeric not null default 1,
  data jsonb not null default '{}'::jsonb
);

alter table public.questions enable row level security;

create policy "questions: read if signed in" on public.questions
  for select using (auth.role() = 'authenticated');

create policy "questions: admin insert" on public.questions
  for insert with check (public.is_admin());

create policy "questions: admin update" on public.questions
  for update using (public.is_admin());

create policy "questions: admin delete" on public.questions
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- quiz_attempts: one row per time a student submits a quiz.
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  score numeric not null,
  max_score numeric not null,
  percentage numeric not null,
  submitted_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

create policy "quiz_attempts: read own" on public.quiz_attempts
  for select using (auth.uid() = student_id);

create policy "quiz_attempts: insert own" on public.quiz_attempts
  for insert with check (auth.uid() = student_id);

create policy "quiz_attempts: admin read all" on public.quiz_attempts
  for select using (public.is_admin());

-- ---------------------------------------------------------------------------
-- quiz_answers: the student's answer to each question in an attempt.
-- ---------------------------------------------------------------------------
create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  student_answer jsonb,
  is_correct boolean not null default false,
  points_awarded numeric not null default 0
);

alter table public.quiz_answers enable row level security;

create policy "quiz_answers: read own" on public.quiz_answers
  for select using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.student_id = auth.uid()
    )
  );

create policy "quiz_answers: insert own" on public.quiz_answers
  for insert with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.student_id = auth.uid()
    )
  );

create policy "quiz_answers: admin read all" on public.quiz_answers
  for select using (public.is_admin());

create index if not exists questions_quiz_id_idx on public.questions (quiz_id, order_index);
create index if not exists quiz_attempts_student_idx on public.quiz_attempts (student_id, submitted_at desc);
create index if not exists quiz_answers_attempt_idx on public.quiz_answers (attempt_id);
