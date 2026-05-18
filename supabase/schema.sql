-- Tracelog — Supabase schema
-- Run this in the Supabase SQL editor

-- Enable pgvector if you want vector search later
-- create extension if not exists vector;

-- Enable full-text search
create extension if not exists pg_trgm;

-- Notes table
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default '',
  content     text not null default '',
  topic       text not null default 'Web'
              check (topic in ('Redes','Web','Malware','CTF','OSINT','Reversing')),
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Links table (wiki-style [[note]] relationships)
create table if not exists public.links (
  source_note_id uuid not null references public.notes(id) on delete cascade,
  target_note_id uuid not null references public.notes(id) on delete cascade,
  primary key (source_note_id, target_note_id)
);

-- Full-text search index on title + content
create index if not exists notes_fts_idx
  on public.notes
  using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Trigram index for fuzzy title search
create index if not exists notes_title_trgm_idx
  on public.notes
  using gin (title gin_trgm_ops);

-- Trigram index on tags (array cast to text)
create index if not exists notes_tags_idx
  on public.notes using gin (tags);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row execute function update_updated_at();

-- RLS policies
alter table public.notes enable row level security;
alter table public.links enable row level security;

-- Users can only see and modify their own notes
create policy "notes_select" on public.notes
  for select using (auth.uid() = user_id);

create policy "notes_insert" on public.notes
  for insert with check (auth.uid() = user_id);

create policy "notes_update" on public.notes
  for update using (auth.uid() = user_id);

create policy "notes_delete" on public.notes
  for delete using (auth.uid() = user_id);

-- Links: visible if you own either side
create policy "links_select" on public.links
  for select using (
    exists (select 1 from public.notes where id = source_note_id and user_id = auth.uid())
  );

create policy "links_insert" on public.links
  for insert with check (
    exists (select 1 from public.notes where id = source_note_id and user_id = auth.uid())
  );

create policy "links_delete" on public.links
  for delete using (
    exists (select 1 from public.notes where id = source_note_id and user_id = auth.uid())
  );

-- Full-text search function
create or replace function search_notes(
  query text,
  uid uuid
)
returns table (
  id uuid,
  title text,
  topic text,
  tags text[],
  snippet text,
  rank real
)
language sql
stable
as $$
  select
    n.id,
    n.title,
    n.topic,
    n.tags,
    ts_headline(
      'english',
      coalesce(n.content, ''),
      plainto_tsquery('english', query),
      'StartSel=«,StopSel=»,MaxWords=15,MinWords=5'
    ) as snippet,
    ts_rank(
      to_tsvector('english', coalesce(n.title,'') || ' ' || coalesce(n.content,'')),
      plainto_tsquery('english', query)
    ) as rank
  from public.notes n
  where
    n.user_id = uid
    and (
      to_tsvector('english', coalesce(n.title,'') || ' ' || coalesce(n.content,''))
      @@ plainto_tsquery('english', query)
      or n.title ilike '%' || query || '%'
      or query = any(n.tags)
    )
  order by rank desc
  limit 30;
$$;
