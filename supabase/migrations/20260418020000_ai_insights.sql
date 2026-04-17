-- KI-Insights pro Entity. Phase 1a: nur kind='lead_score' für contacts.
-- Später additiv: 'match' (property↔contact), 'brief' (daily).
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('contact','property','deal')),
  entity_id uuid not null,
  kind text not null check (kind in ('lead_score')),
  score int,
  score_label text,
  signals jsonb not null default '[]'::jsonb,
  next_action jsonb,
  input_hash text not null,
  tokens_in int,
  tokens_out int,
  cost_eur numeric(8,6),
  computed_at timestamptz not null default now(),
  unique (user_id, entity_type, entity_id, kind)
);

create index if not exists ai_insights_entity_idx on public.ai_insights (user_id, entity_type, entity_id);
create index if not exists ai_insights_computed_at_idx on public.ai_insights (user_id, computed_at desc);

alter table public.ai_insights enable row level security;

drop policy if exists ai_insights_select on public.ai_insights;
drop policy if exists ai_insights_insert on public.ai_insights;
drop policy if exists ai_insights_update on public.ai_insights;
drop policy if exists ai_insights_delete on public.ai_insights;

create policy ai_insights_select on public.ai_insights
  for select using (auth.uid() = user_id);
create policy ai_insights_insert on public.ai_insights
  for insert with check (auth.uid() = user_id);
create policy ai_insights_update on public.ai_insights
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy ai_insights_delete on public.ai_insights
  for delete using (auth.uid() = user_id);
