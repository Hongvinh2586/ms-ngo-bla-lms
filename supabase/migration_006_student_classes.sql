-- Limits a student account to certain class folders (C16D7, A2, C15D6, ...).
-- Run this ONCE in Supabase -> SQL Editor. Safe to run more than once.
-- A student with no row (or an empty list) sees everything; admins and teachers always do.

create table if not exists public.student_classes (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  classes text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.student_classes enable row level security;

drop policy if exists "student_classes: read own" on public.student_classes;
create policy "student_classes: read own" on public.student_classes
  for select using (auth.uid() = student_id);

drop policy if exists "student_classes: admin all" on public.student_classes;
create policy "student_classes: admin all" on public.student_classes
  for all using (public.is_admin()) with check (public.is_admin());
