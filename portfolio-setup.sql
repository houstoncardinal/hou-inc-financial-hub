-- ============================================================
-- HOU INC Portfolio — Supabase Setup
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- 1. Tables -------------------------------------------------

create table if not exists portfolio_projects (
  id          uuid         primary key default gen_random_uuid(),
  title       text         not null,
  category    text         not null default 'Luxury Residential',
  location    text         not null default '',
  sqft        text,
  year        text         not null default extract(year from now())::text,
  description text,
  featured    boolean      not null default false,
  cover_url   text,
  sort_order  integer      not null default 0,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

create table if not exists portfolio_media (
  id           uuid         primary key default gen_random_uuid(),
  project_id   uuid         not null references portfolio_projects(id) on delete cascade,
  url          text         not null,
  storage_path text         not null,
  media_type   text         not null check (media_type in ('image','video')),
  sort_order   integer      not null default 0,
  created_at   timestamptz  not null default now()
);

-- 2. Row-level security ------------------------------------

alter table portfolio_projects enable row level security;
alter table portfolio_media    enable row level security;

-- Public can read (portfolio page is public)
drop policy if exists "public read portfolio_projects" on portfolio_projects;
create policy "public read portfolio_projects"
  on portfolio_projects for select using (true);

drop policy if exists "public read portfolio_media" on portfolio_media;
create policy "public read portfolio_media"
  on portfolio_media for select using (true);

-- Anon can write (PIN-gated admin protects the UI layer)
drop policy if exists "anon write portfolio_projects" on portfolio_projects;
create policy "anon write portfolio_projects"
  on portfolio_projects for all using (true) with check (true);

drop policy if exists "anon write portfolio_media" on portfolio_media;
create policy "anon write portfolio_media"
  on portfolio_media for all using (true) with check (true);

-- 3. Storage bucket ----------------------------------------

-- Create the public "portfolio" bucket (safe to run again)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio', 'portfolio', true,
  524288000,   -- 500 MB per file (adjust if needed)
  array['image/jpeg','image/png','image/webp','image/gif','image/heic',
        'video/mp4','video/quicktime','video/webm','video/x-msvideo']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 524288000;

-- Storage policies
drop policy if exists "public read portfolio storage"  on storage.objects;
create policy "public read portfolio storage"
  on storage.objects for select using (bucket_id = 'portfolio');

drop policy if exists "anon insert portfolio storage"  on storage.objects;
create policy "anon insert portfolio storage"
  on storage.objects for insert to anon with check (bucket_id = 'portfolio');

drop policy if exists "anon update portfolio storage"  on storage.objects;
create policy "anon update portfolio storage"
  on storage.objects for update to anon using (bucket_id = 'portfolio');

drop policy if exists "anon delete portfolio storage"  on storage.objects;
create policy "anon delete portfolio storage"
  on storage.objects for delete to anon using (bucket_id = 'portfolio');

-- Done!
