-- Fix RLS policies and add admin code redemption function

-- 1. Drop existing policies
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read all admin" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;

-- 2. Recreate policies
create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles read all admin" on public.profiles
  for select using (public.is_admin());

create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

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

-- 5. Admin code redemption function (security definer = bypasses RLS)
create or replace function public.redeem_admin_code(code text)
returns json as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'Not authenticated');
  end if;
  if code <> 'GSP-ADMIN-2026' then
    return json_build_object('ok', false, 'error', 'Invalid admin code');
  end if;
  update public.profiles set role = 'admin' where id = uid;
  return json_build_object('ok', true);
end;
$$ language plpgsql security definer;

-- 6. Promote yourself via SQL (REPLACE EMAIL)
-- update public.profiles set role = 'admin' where email = 'your@email.com';

-- 7. Verify
select id, email, name, role from public.profiles;
