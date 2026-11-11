-- ============================================================================
-- GSP Version 1.0 schema migration
-- Run this once in the Supabase SQL editor (after schema.sql / fix_rls.sql).
-- It is idempotent: safe to run more than once.
-- ============================================================================

-- ---------------------------------------------------------------- roles -----
-- The role check must allow mentors as well as students and admins.
do $$
declare
  c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'mentor', 'admin'));

-- ------------------------------------------------------------- profiles -----
alter table public.profiles
  add column if not exists schools jsonb default '[]'::jsonb,
  add column if not exists activities jsonb default '[]'::jsonb,
  add column if not exists country_of_origin text default '',
  add column if not exists country_of_residence text default '',
  add column if not exists nationality text default '',
  add column if not exists education_level text default 'High school';

-- -------------------------------------------------------- opportunities -----
alter table public.opportunities
  add column if not exists category text default 'Scholarship',
  add column if not exists required_documents text[] default '{}',
  add column if not exists instructions text default '',
  add column if not exists application_link text default '',
  add column if not exists published boolean default true;

-- --------------------------------------------------------------- courses ----
alter table public.courses
  add column if not exists lessons jsonb default '[]'::jsonb,
  add column if not exists resources jsonb default '[]'::jsonb,
  add column if not exists published boolean default true;

-- -------------------------------------------------------------- services ----
alter table public.services
  add column if not exists mentor_id uuid references auth.users(id) on delete set null,
  add column if not exists mentor_name text,
  add column if not exists published boolean default true;

-- ------------------------------------------------------------------ RLS -----
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

create or replace function public.is_mentor()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('mentor', 'admin')
  );
$$ language sql security definer stable;

drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Mentors can read the profiles of students enrolled in their sprints and
-- students who have booked their services.
drop policy if exists "profiles read all mentor" on public.profiles;
create policy "profiles read all mentor" on public.profiles
  for select using (public.is_mentor());

-- ------------------------------------------------------- access code RPC ----
-- Grants admin or mentor access from inside the app. Security definer so it
-- works even while the caller's own role is still "student".
create or replace function public.redeem_access_code(code text)
returns json as $$
declare
  uid uuid := auth.uid();
  next_role text;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  next_role := case upper(trim(code))
    when 'GSP-ADMIN-2026' then 'admin'
    when 'GSP-MENTOR-2026' then 'mentor'
    else null
  end;

  if next_role is null then
    return json_build_object('ok', false, 'error', 'Invalid access code');
  end if;

  update public.profiles set role = next_role where id = uid;
  return json_build_object('ok', true, 'role', next_role);
end;
$$ language plpgsql security definer;

-- Backwards-compatible alias for the earlier admin-only function.
create or replace function public.redeem_admin_code(code text)
returns json as $$
  select public.redeem_access_code(code);
$$ language sql security definer;

-- ------------------------------------------------ platform interaction ------
-- The browser store keeps these entities in localStorage today so the app works
-- without a service-role key. These tables mirror that model so the access
-- layer can be swapped to Supabase without changing any page code.

create table if not exists public.live_sessions (
  id text primary key,
  title text not null,
  description text default '',
  host text default '',
  date text,
  time text,
  meeting_link text default '',
  opportunity_id text default '',
  audience text default 'all',
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.session_rsvps (
  user_id uuid references auth.users(id) on delete cascade,
  session_id text,
  created_at timestamptz default now(),
  primary key (user_id, session_id)
);

create table if not exists public.sprints (
  id text primary key,
  title text not null,
  description text default '',
  duration text default '',
  dates text default '',
  spots text default '',
  capacity int default 50,
  objectives jsonb default '[]'::jsonb,
  milestones jsonb default '[]'::jsonb,
  mentor_ids jsonb default '[]'::jsonb,
  mentor_names jsonb default '[]'::jsonb,
  live_session_ids jsonb default '[]'::jsonb,
  published boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.sprint_enrollments (
  user_id uuid references auth.users(id) on delete cascade,
  sprint_id text,
  created_at timestamptz default now(),
  primary key (user_id, sprint_id)
);

create table if not exists public.mentor_tracks (
  user_id uuid references auth.users(id) on delete cascade primary key,
  tracks jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists public.posts (
  id text primary key,
  title text not null,
  body text default '',
  excerpt text default '',
  tags jsonb default '[]'::jsonb,
  author_id uuid references auth.users(id) on delete set null,
  author_name text default '',
  author_role text default 'student',
  badge text,
  votes int default 0,
  replies int default 0,
  pinned boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.post_replies (
  id text primary key,
  post_id text,
  author_id uuid references auth.users(id) on delete set null,
  author_name text default '',
  author_role text default 'student',
  body text not null,
  votes int default 0,
  created_at timestamptz default now()
);

create table if not exists public.service_bookings (
  id text primary key,
  service_id text,
  service_title text default '',
  student_id uuid references auth.users(id) on delete cascade,
  student_name text default '',
  mentor_id uuid references auth.users(id) on delete set null,
  mentor_name text default '',
  date text,
  time text,
  notes text default '',
  status text default 'requested'
    check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  type text default 'system',
  title text default '',
  body text default '',
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.saved_opportunities (
  user_id uuid references auth.users(id) on delete cascade,
  opportunity_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, opportunity_id)
);

create table if not exists public.lesson_progress (
  user_id uuid references auth.users(id) on delete cascade,
  lesson_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, lesson_id)
);

-- Full app objects are mirrored in a jsonb column so the client can round-trip
-- fields that are not worth their own column (badges, tones, display text).
alter table public.live_sessions add column if not exists data jsonb default '{}'::jsonb;
alter table public.sprints add column if not exists data jsonb default '{}'::jsonb;
alter table public.posts add column if not exists data jsonb default '{}'::jsonb;

-- Seed content is referenced by text ids without a foreign key, so RSVPs,
-- enrollments and replies can be stored even for seeded (non-DB) items.
alter table public.session_rsvps drop constraint if exists session_rsvps_session_id_fkey;
alter table public.sprint_enrollments drop constraint if exists sprint_enrollments_sprint_id_fkey;
alter table public.post_replies drop constraint if exists post_replies_post_id_fkey;

-- RLS -----------------------------------------------------------------------
alter table public.live_sessions enable row level security;
alter table public.session_rsvps enable row level security;
alter table public.sprints enable row level security;
alter table public.sprint_enrollments enable row level security;
alter table public.mentor_tracks enable row level security;
alter table public.posts enable row level security;
alter table public.post_replies enable row level security;
alter table public.service_bookings enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_opportunities enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "sessions read all" on public.live_sessions;
create policy "sessions read all" on public.live_sessions
  for select using (true);
drop policy if exists "sessions admin write" on public.live_sessions;
create policy "sessions admin write" on public.live_sessions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "rsvps own" on public.session_rsvps;
create policy "rsvps own" on public.session_rsvps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sprints read all" on public.sprints;
create policy "sprints read all" on public.sprints
  for select using (true);
drop policy if exists "sprints admin write" on public.sprints;
create policy "sprints admin write" on public.sprints
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "enrollments own" on public.sprint_enrollments;
create policy "enrollments own" on public.sprint_enrollments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "enrollments read mentor" on public.sprint_enrollments;
drop policy if exists "enrollments read all" on public.sprint_enrollments;
create policy "enrollments read all" on public.sprint_enrollments
  for select using (true);

drop policy if exists "tracks read all" on public.mentor_tracks;
create policy "tracks read all" on public.mentor_tracks
  for select using (true);
drop policy if exists "tracks own write" on public.mentor_tracks;
create policy "tracks own write" on public.mentor_tracks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "tracks admin write" on public.mentor_tracks;
create policy "tracks admin write" on public.mentor_tracks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "posts read all" on public.posts;
create policy "posts read all" on public.posts
  for select using (true);
drop policy if exists "posts authenticated insert" on public.posts;
create policy "posts authenticated insert" on public.posts
  for insert with check (auth.uid() = author_id);
drop policy if exists "posts author or admin update" on public.posts;
create policy "posts author or admin update" on public.posts
  for update using (auth.uid() = author_id or public.is_admin());
drop policy if exists "posts author or admin delete" on public.posts;
create policy "posts author or admin delete" on public.posts
  for delete using (auth.uid() = author_id or public.is_admin());

drop policy if exists "replies read all" on public.post_replies;
create policy "replies read all" on public.post_replies
  for select using (true);
drop policy if exists "replies authenticated insert" on public.post_replies;
create policy "replies authenticated insert" on public.post_replies
  for insert with check (auth.uid() = author_id);
drop policy if exists "replies author or admin delete" on public.post_replies;
create policy "replies author or admin delete" on public.post_replies
  for delete using (auth.uid() = author_id or public.is_admin());

drop policy if exists "bookings own or mentor" on public.service_bookings;
create policy "bookings own or mentor" on public.service_bookings
  for select using (auth.uid() = student_id or auth.uid() = mentor_id or public.is_admin());
drop policy if exists "bookings student insert" on public.service_bookings;
create policy "bookings student insert" on public.service_bookings
  for insert with check (auth.uid() = student_id);
drop policy if exists "bookings update involved" on public.service_bookings;
create policy "bookings update involved" on public.service_bookings
  for update using (auth.uid() = student_id or auth.uid() = mentor_id or public.is_admin());
drop policy if exists "bookings admin delete" on public.service_bookings;
create policy "bookings admin delete" on public.service_bookings
  for delete using (public.is_admin());

drop policy if exists "notifications own" on public.notifications;
drop policy if exists "notifications read own" on public.notifications;
drop policy if exists "notifications insert authenticated" on public.notifications;
drop policy if exists "notifications update own" on public.notifications;
drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications insert authenticated" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id);
create policy "notifications delete own" on public.notifications
  for delete using (auth.uid() = user_id);

drop policy if exists "saved own" on public.saved_opportunities;
create policy "saved own" on public.saved_opportunities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress own" on public.lesson_progress;
create policy "progress own" on public.lesson_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------ verification --
-- select id, email, name, role from public.profiles order by created_at;
