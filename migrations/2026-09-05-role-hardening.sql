-- Role hardening: every new account must start with the 'student' role, and
-- only an admin may bootstrap or escalate to coordinator/admin.
--
-- The live DB's handle_new_user() was reading the role from client-supplied
-- user metadata (raw_user_meta_data->>'role'), so a signup that passed
-- role='coordinator' created a real coordinator profile. The
-- trg_profiles_role_guard trigger was also missing on the live DB entirely.

-- 1. New profiles must start as 'student' unless an admin is creating them.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.role is null then
      new.role := 'student';
    end if;
    if new.role not in ('student', 'admin', 'coordinator') then
      raise exception 'Invalid role';
    end if;
    -- New accounts are always students; only an admin may bootstrap a
    -- coordinator/admin profile directly.
    if new.role <> 'student' and not public.is_admin() then
      raise exception 'New profiles must start with the student role';
    end if;
    -- auth.uid() is null when this fires from the on_auth_user_created
    -- trigger (no session exists yet) — allow that path. Direct API inserts
    -- must be the user's own row.
    if auth.uid() is not null
       and new.id is distinct from auth.uid()
       and not public.is_admin() then
      raise exception 'Profile creation is restricted to authenticated users';
    end if;
    return new;
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Role escalation is forbidden';
  end if;
  if new.id is distinct from old.id and not public.is_admin() then
    raise exception 'Profile identity cannot be changed';
  end if;
  return new;
end;
$$;

-- 2. handle_new_user: always create the profile with role 'student'.
--    Never trust role values from client-supplied user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do update
    set name = excluded.name;
  return new;
end;
$$;

-- 3. Attach the guard trigger (it was missing on the live DB).
drop trigger if exists trg_profiles_role_guard on public.profiles;
create trigger trg_profiles_role_guard
before insert or update on public.profiles
for each row execute function public.prevent_profile_role_escalation();