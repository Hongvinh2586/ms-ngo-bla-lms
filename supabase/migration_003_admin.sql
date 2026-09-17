-- Adds an admin area: an admin can manage quizzes/questions through the
-- website instead of SQL, see every student's results, and promote other
-- accounts to admin.
--
-- Run this ONCE in Supabase -> SQL Editor, AFTER schema.sql, seed.sql and
-- migration_002_add_category.sql have already been run. (A brand new
-- project doesn't need this file — schema.sql already includes all of it.)
-- Safe to run more than once.

-- 1. profiles gets an `email` column, so the admin "Students" screen can
--    show who's who without querying auth.users directly.
alter table public.profiles add column if not exists email text;

-- Backfill it for accounts created before this column existed. This needs
-- to read auth.users, which only works when run here in the SQL Editor
-- (it runs as the postgres role) — not from the app itself.
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- From now on, new signups get their email copied in automatically too.
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

-- 2. is_admin(): checks the CURRENT signed-in user's own role. security
--    definer so it can read `profiles` without recursing through the RLS
--    policies that call it.
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

-- 3. Close a hole in the existing "profiles: update own" policy: without
--    this trigger, a student could call the Supabase API directly (not
--    through the app's UI) and set their own role to 'admin'. This trigger
--    silently reverts any role change that isn't made by an actual admin.
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

-- 4. set_user_role(...): the only supported way to change someone else's
--    role. Checks the caller is already an admin before doing anything.
--    Called by the admin "Students" screen.
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

-- 5. New RLS policies giving admins full access, alongside (not replacing)
--    the existing student-facing policies.
drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "quizzes: admin read all" on public.quizzes;
create policy "quizzes: admin read all" on public.quizzes
  for select using (public.is_admin());

drop policy if exists "quizzes: admin insert" on public.quizzes;
create policy "quizzes: admin insert" on public.quizzes
  for insert with check (public.is_admin());

drop policy if exists "quizzes: admin update" on public.quizzes;
create policy "quizzes: admin update" on public.quizzes
  for update using (public.is_admin());

drop policy if exists "quizzes: admin delete" on public.quizzes;
create policy "quizzes: admin delete" on public.quizzes
  for delete using (public.is_admin());

drop policy if exists "questions: admin insert" on public.questions;
create policy "questions: admin insert" on public.questions
  for insert with check (public.is_admin());

drop policy if exists "questions: admin update" on public.questions;
create policy "questions: admin update" on public.questions
  for update using (public.is_admin());

drop policy if exists "questions: admin delete" on public.questions;
create policy "questions: admin delete" on public.questions
  for delete using (public.is_admin());

drop policy if exists "quiz_attempts: admin read all" on public.quiz_attempts;
create policy "quiz_attempts: admin read all" on public.quiz_attempts
  for select using (public.is_admin());

drop policy if exists "quiz_answers: admin read all" on public.quiz_answers;
create policy "quiz_answers: admin read all" on public.quiz_answers
  for select using (public.is_admin());

-- 6. Finally, make YOURSELF an admin. Replace the email below with the
--    email of the account you already signed up with in the app, then run
--    just this one statement (select it and click "Run selection", or run
--    the whole file again later after signing up).
-- update public.profiles set role = 'admin' where email = 'you@example.com';
