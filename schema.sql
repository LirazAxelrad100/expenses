-- Run this once in Supabase: Project > SQL Editor > New query > paste > Run

create table buckets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric not null,
  item text,
  bucket_id uuid references buckets(id) on delete set null,
  place text,
  notes text,
  expense_date date not null default current_date,
  created_at timestamptz default now()
);

-- v1 has no login, so we allow full public access to these two tables.
-- Fine for a personal tool that isn't shared publicly.
alter table buckets enable row level security;
alter table expenses enable row level security;

create policy "public access" on buckets for all using (true) with check (true);
create policy "public access" on expenses for all using (true) with check (true);

-- with "automatically expose new tables" off, the API roles need
-- explicit access granted, on top of the RLS policies above
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on buckets to anon, authenticated;
grant select, insert, update, delete on expenses to anon, authenticated;

-- MIGRATION (2026-08-21): run this once in Supabase SQL Editor if the
-- expenses table already exists and doesn't have expense_date yet.
-- alter table expenses add column expense_date date not null default current_date;

-- MIGRATION (2026-09-03): run this once in Supabase SQL Editor. The
-- bucket_id foreign key originally had no "on delete" behavior, so
-- Postgres blocked deleting any bucket that still had expenses logged
-- under it (with no visible error in the app) instead of nulling it out.
-- alter table expenses drop constraint expenses_bucket_id_fkey;
-- alter table expenses add constraint expenses_bucket_id_fkey
--   foreign key (bucket_id) references buckets(id) on delete set null;

-- starter buckets, edit anytime from the app
insert into buckets (name) values
  ('Groceries'),
  ('Household / Cleaning'),
  ('Eating out'),
  ('Other');
