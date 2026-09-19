-- =============================================================
-- Nexura Portal — Live DB migration (2026-09-05)
-- 1) Treat role 'coordinator' as admin-equivalent (backend policies)
-- 2) Add the submissions columns the app already writes/reads
-- 3) Persistent notifications table + RLS + auto-notify triggers
-- Idempotent: safe to run more than once.
-- =============================================================

-- ---------- 1. Roles: coordinator is privileged ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('admin', 'coordinator')
  );
$$;

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
    if new.id is distinct from auth.uid() and not public.is_admin() then
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

-- ---------- 2. submissions: add missing columns ----------

create or replace function public.set_submissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.submissions add column if not exists github_url text;
alter table public.submissions add column if not exists live_url text;
alter table public.submissions add column if not exists notes text;
alter table public.submissions add column if not exists feedback text;
alter table public.submissions add column if not exists attempt integer not null default 1;
alter table public.submissions add column if not exists reviewed_at timestamptz;
alter table public.submissions add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_submissions_set_updated_at on public.submissions;
create trigger trg_submissions_set_updated_at
before update on public.submissions
for each row
execute function public.set_submissions_updated_at();

-- ---------- 3. Persistent notifications ----------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info'
    check (type in ('approved', 'rejected', 'submitted', 'resubmitted', 'removed', 'task', 'reminder', 'pending', 'info')),
  title text not null,
  message text not null default '',
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_time
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Notifications read own" on public.notifications;
create policy "Notifications read own" on public.notifications
for select using (auth.uid() = user_id);

drop policy if exists "Notifications insert own or admin" on public.notifications;
create policy "Notifications insert own or admin" on public.notifications
for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Notifications update own or admin" on public.notifications;
create policy "Notifications update own or admin" on public.notifications
for update using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

drop policy if exists "Notifications delete own or admin" on public.notifications;
create policy "Notifications delete own or admin" on public.notifications
for delete using (auth.uid() = user_id or public.is_admin());

grant select, insert, update, delete on public.notifications to authenticated;

-- Auto-notify (server-side, RLS-free) when submissions change state.
create or replace function public.handle_submission_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task_title text;
  v_student_name text;
  v_student_id uuid;
  v_sub_id uuid;
begin
  v_student_id := coalesce(new.student_id, old.student_id);
  v_sub_id     := coalesce(new.id, old.id);

  select title into v_task_title from public.tasks where id = coalesce(new.task_id, old.task_id);
  select name  into v_student_name from public.profiles where id = v_student_id;

  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, type, title, message, link)
    select p.id, 'submitted', 'New submission',
           coalesce(v_student_name, 'A student') || ' submitted "' || coalesce(v_task_title, 'a task') || '" for review',
           '/coordinator/submissions/' || v_sub_id
    from public.profiles p
    where p.role in ('admin', 'coordinator');
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.status = 'pending' and old.status is distinct from 'pending' then
      insert into public.notifications (user_id, type, title, message, link)
      select p.id, 'resubmitted', 'Resubmission received',
             coalesce(v_student_name, 'A student') || ' resubmitted "' || coalesce(v_task_title, 'a task') || '"',
             '/coordinator/submissions/' || v_sub_id
      from public.profiles p
      where p.role in ('admin', 'coordinator');
    end if;
    if new.status = 'approved' and old.status is distinct from 'approved' then
      insert into public.notifications (user_id, type, title, message, link)
      values (v_student_id, 'approved', 'Submission approved',
              'Your submission for "' || coalesce(v_task_title, 'a task') || '" was approved'
              || case when new.feedback is not null and new.feedback <> ''
                      then ' — "' || new.feedback || '"' else '' end || '.',
              '/student/submissions/' || v_sub_id);
    end if;
    if new.status = 'rejected' and old.status is distinct from 'rejected' then
      insert into public.notifications (user_id, type, title, message, link)
      values (v_student_id, 'rejected', 'Changes requested',
              'Your submission for "' || coalesce(v_task_title, 'a task') || '" was sent back with feedback'
              || case when new.feedback is not null and new.feedback <> ''
                      then ': "' || new.feedback || '"' else '' end || '.',
              '/student/submissions/' || v_sub_id);
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    insert into public.notifications (user_id, type, title, message, link)
    values (v_student_id, 'removed', 'Submission removed',
            'Your submission for "' || coalesce(v_task_title, 'a task') || '" was removed.',
            '/student/tasks');
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_submission_notifications on public.submissions;
create trigger trg_submission_notifications
after insert or update or delete on public.submissions
for each row execute function public.handle_submission_notifications();

-- Include notifications in the realtime publication so open tabs update live.
drop publication if exists supabase_realtime;
create publication supabase_realtime
for table public.profiles, public.tasks, public.submissions, public.notifications;
