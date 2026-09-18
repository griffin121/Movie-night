-- Movie-night rotation state.
--
-- Each row = one movie night that was actually held. The picker rotation
-- (see lib/schedule.js) advances by the NUMBER OF ROWS in this table, not
-- by how many calendar weeks have passed. That way, skipping a week never
-- burns anyone's turn: the same person stays "up next" until someone taps
-- the "We watched one" button on the dashboard, which inserts a row here.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor).

create table if not exists movie_nights (
  id          bigint generated always as identity primary key,
  picker_id   uuid references profiles (id),  -- whose turn it was
  logged_by   uuid references profiles (id),  -- who pressed the button
  created_at  timestamptz not null default now()
);

-- Row Level Security. This app talks to Supabase with the public anon key
-- (same as the movies / ratings / comments tables), so allow the anon role
-- to read all nights and to log a new one. No updates or deletes needed.
alter table movie_nights enable row level security;

create policy "anyone can read movie nights"
  on movie_nights for select
  using (true);

create policy "anyone can log a movie night"
  on movie_nights for insert
  with check (true);

-- NOTE: if your other tables (movies, ratings, ...) have RLS DISABLED
-- rather than using policies, you can instead just run:
--   alter table movie_nights disable row level security;
-- and skip the two create policy statements above.
