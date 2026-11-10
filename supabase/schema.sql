-- GSP — Campfire Commons database schema (run this in the Supabase SQL editor)

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text default 'student' check (role in ('student','admin')),
  first_name text default '',
  last_name text default '',
  bio text default '',
  gpa numeric,
  sat int,
  act int,
  intended_major text default '',
  graduation_year int,
  first_gen boolean default false,
  low_income boolean default false,
  urm boolean default false,
  interests text[] default '{}',
  target_schools text[] default '{}',
  location text default '',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Opportunities
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  match int default 80,
  tags text[] default '{}',
  award text,
  award_icon text default 'workspace_premium',
  summary text,
  deadline text,
  days_left int default 30,
  full_ride boolean default false,
  fly_in boolean default false,
  no_essay boolean default false,
  eligibility jsonb default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text default 'foundations',
  modules int default 4,
  price numeric,
  free boolean default true,
  topics text[] default '{}',
  stats jsonb default '[]',
  cta text default 'View Syllabus',
  cta_icon text default 'arrow_forward',
  gradient text,
  icon text default 'auto_stories',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- Services
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text default 'writing',
  price text,
  price_unit text,
  badge text,
  badge_icon text,
  badge_tone text default 'neutral',
  features jsonb default '[]',
  cta text default 'Book now',
  cta_tone text default 'primary',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.courses enable row level security;
alter table public.services enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read all admin" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles read all admin" on public.profiles for select using (public.is_admin());
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

-- opportunities
drop policy if exists "opps read all" on public.opportunities;
drop policy if exists "opps admin write" on public.opportunities;
create policy "opps read all" on public.opportunities for select using (true);
create policy "opps admin write" on public.opportunities for all using (public.is_admin());

-- courses
drop policy if exists "courses read all" on public.courses;
drop policy if exists "courses admin write" on public.courses;
create policy "courses read all" on public.courses for select using (true);
create policy "courses admin write" on public.courses for all using (public.is_admin());

-- services
drop policy if exists "services read all" on public.services;
drop policy if exists "services admin write" on public.services;
create policy "services read all" on public.services for select using (true);
create policy "services admin write" on public.services for all using (public.is_admin());
