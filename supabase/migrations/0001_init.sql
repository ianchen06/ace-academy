-- Ace Academy: user progress table
-- One row per authenticated user, mirroring the client-side progress shape
-- (completed lesson/drill ids + best quiz attempts) so cloud sync is a
-- straightforward merge with localStorage.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  completed_lessons text[] not null default '{}',
  completed_drills text[] not null default '{}',
  quiz_attempts jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Users can view their own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can insert their own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_progress_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger progress_set_updated_at
  before update on public.progress
  for each row
  execute function public.set_progress_updated_at();
