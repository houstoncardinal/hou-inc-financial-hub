-- Map pins for the Client Map admin tab
create table if not exists public.map_pins (
  id             uuid default gen_random_uuid() primary key,
  name           text not null,
  client_company text,
  city           text not null default '',
  state          text not null default 'TX',
  lng            double precision not null,
  lat            double precision not null,
  project_type   text,
  status         text not null default 'active' check (status in ('active','completed','planning')),
  value_million  numeric,
  sqft           text,
  description    text,
  year           integer,
  region         text not null default 'texas',
  created_at     timestamptz default now(),
  deleted_at     timestamptz
);

alter table public.map_pins enable row level security;

create policy "map_pins_all" on public.map_pins
  for all using (true) with check (true);
