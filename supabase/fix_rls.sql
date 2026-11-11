-- Fix RLS policies and add admin code redemption function

-- 1. Drop existing policies
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read all admin" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;

-- 2. Recreate policies
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

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles read all admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- 3. Recreate trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Backfill profiles for existing users
insert into public.profiles (id, email, name, role)
select id, email, coalesce(raw_user_meta_data->>'name', email), coalesce(raw_user_meta_data->>'role', 'student')
from auth.users
where id not in (select id from public.profiles)
on conflict (id) do nothing;

-- 5. Access code redemption (admin or mentor). Security definer bypasses RLS.
create or replace function public.redeem_access_code(code text)
returns json as $$
declare
  uid uuid := auth.uid();
  next_role text;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if code = 'GSP-ADMIN-2026' then
    next_role := 'admin';
  elsif code = 'GSP-MENTOR-2026' then
    next_role := 'mentor';
  else
    return json_build_object('ok', false, 'error', 'Invalid access code');
  end if;
  update public.profiles set role = next_role where id = uid;
  return json_build_object('ok', true, 'role', next_role);
end;
$$ language plpgsql security definer;

create or replace function public.redeem_admin_code(code text)
returns json as $$
  select public.redeem_access_code(code);
$$ language sql security definer;

-- 6. Promote yourself via SQL (REPLACE EMAIL)
-- update public.profiles set role = 'admin' where email = 'your@email.com';

-- 7. Verify
select id, email, name, role from public.profiles;
