-- Hexcraft RPG: characters and the skill embeddings behind skill search.
--
-- These live in the SAME Supabase project as the card collection and the kitchen,
-- so one login covers all three. Everything is prefixed `hexcraft_`, as is this
-- file, so three apps can share a project without colliding.
--
-- Note on access: in its own project the characters table was open to anyone
-- holding the anon key — no user column, and a policy of `using (true)`. Here a
-- character belongs to the account that made it, and RLS says so.

create extension if not exists vector;

create table if not exists public.hexcraft_characters (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references auth.users(id) on delete cascade,
    name       text not null,
    data       jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists hexcraft_characters_user_idx
    on public.hexcraft_characters (user_id, updated_at desc);

create or replace function public.hexcraft_touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists hexcraft_characters_touch on public.hexcraft_characters;
create trigger hexcraft_characters_touch
    before update on public.hexcraft_characters
    for each row execute function public.hexcraft_touch_updated_at();

-- The skill list is shared reference data rather than anyone's property: every
-- signed-in user reads the same skills. Writing is left to the embedding script,
-- which runs with the service role key and bypasses RLS.
create table if not exists public.hexcraft_skill_embeddings (
    id          bigserial primary key,
    skill_name  text not null unique,
    description text,
    embedding   vector(1536),
    created_at  timestamptz not null default now()
);

create index if not exists hexcraft_skill_embeddings_name_idx
    on public.hexcraft_skill_embeddings using btree (skill_name);

create index if not exists hexcraft_skill_embeddings_vec_idx
    on public.hexcraft_skill_embeddings using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

create or replace function public.hexcraft_match_skills(
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
    from public.hexcraft_skill_embeddings s
    where s.embedding is not null
    order by s.embedding <=> query_embedding
    limit match_count;
$$;

-- RLS
alter table public.hexcraft_characters       enable row level security;
alter table public.hexcraft_skill_embeddings enable row level security;

drop policy if exists "hexcraft_characters select own" on public.hexcraft_characters;
create policy "hexcraft_characters select own" on public.hexcraft_characters
    for select using (auth.uid() = user_id);
drop policy if exists "hexcraft_characters insert own" on public.hexcraft_characters;
create policy "hexcraft_characters insert own" on public.hexcraft_characters
    for insert with check (auth.uid() = user_id);
drop policy if exists "hexcraft_characters update own" on public.hexcraft_characters;
create policy "hexcraft_characters update own" on public.hexcraft_characters
    for update using (auth.uid() = user_id);
drop policy if exists "hexcraft_characters delete own" on public.hexcraft_characters;
create policy "hexcraft_characters delete own" on public.hexcraft_characters
    for delete using (auth.uid() = user_id);

drop policy if exists "hexcraft_skill_embeddings read" on public.hexcraft_skill_embeddings;
create policy "hexcraft_skill_embeddings read" on public.hexcraft_skill_embeddings
    for select to authenticated using (true);
