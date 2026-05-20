-- 在 Supabase SQL Editor 中执行以下语句

create extension if not exists pgcrypto;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger handle_set_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

alter table public.notes enable row level security;

create policy "Users can view their own notes"
on public.notes
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own notes"
on public.notes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own notes"
on public.notes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own notes"
on public.notes
for delete
to authenticated
using (auth.uid() = user_id);
