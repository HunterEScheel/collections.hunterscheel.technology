-- G&D RPG — Supabase schema
-- Run this in the Supabase SQL editor for a fresh project.

create extension if not exists vector;

create table if not exists public.skill_embeddings (
    id          bigserial primary key,
    skill_name  text not null unique,
    description text,
    embedding   vector(1536),
    created_at  timestamptz not null default now()
);

create index if not exists skill_embeddings_name_idx
    on public.skill_embeddings using btree (skill_name);

create index if not exists skill_embeddings_vec_idx
    on public.skill_embeddings using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

create or replace function public.match_skills(
    query_embedding vector(1536),
    match_count int default 12
)
returns table (
    id          bigint,
    name        text,
    description text,
    similarity  float
)
language sql stable
as $$
    select
        s.id,
        s.skill_name as name,
        s.description,
        1 - (s.embedding <=> query_embedding) as similarity
    from public.skill_embeddings s
    where s.embedding is not null
    order by s.embedding <=> query_embedding
    limit match_count;
$$;

create table if not exists public.characters (
    id         uuid primary key default gen_random_uuid(),
    name       text not null,
    data       jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists characters_touch on public.characters;
create trigger characters_touch
    before update on public.characters
    for each row execute function public.touch_updated_at();

-- RLS
alter table public.skill_embeddings enable row level security;
alter table public.characters       enable row level security;

drop policy if exists skill_embeddings_read on public.skill_embeddings;
create policy skill_embeddings_read on public.skill_embeddings
    for select using (true);

drop policy if exists characters_anon_all on public.characters;
create policy characters_anon_all on public.characters
    for all using (true) with check (true);
-- Tighten characters_anon_all once auth is added.
