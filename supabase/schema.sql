-- Supabase backend schema for USM Dormitory Facilities Repair and Feedback System
-- Run this file in your Supabase project (SQL editor or supabase db push).

--------------------------------------------------------------------------------
-- Extensions
--------------------------------------------------------------------------------
create extension if not exists "pgcrypto";

--------------------------------------------------------------------------------
-- Profiles (RBAC anchor)
--------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student','admin','worker')),
  name text,
  phone text,
  department text,
  status text check (status in ('available','busy','offline')),
  created_at timestamptz not null default now()
);

-- Convenience: current user role
create or replace function public.current_user_role()
returns text
language sql stable
security definer
set search_path = public
set row_security = off
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Auto-provision profile on signup (default role = student)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, role, name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::text, 'student'),
    coalesce(new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

--------------------------------------------------------------------------------
-- Repairs core tables
--------------------------------------------------------------------------------
create table if not exists public.repairs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location text not null,
  urgency text not null check (urgency in ('normal','urgent','emergency')),
  status text not null check (
    status in (
      'draft',
      'submitted',
      'accepted',
      'assigned',
      'reassigned',
      'in_progress',
      'resolved',
      'closed',
      'canceled'
    )
  ),
  status_reason text,
  scheduled_time timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  assigned_worker_id uuid references public.profiles(id),
  resolved_at timestamptz,
  closed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists repairs_created_by_idx on public.repairs(created_by);
create index if not exists repairs_assigned_worker_idx on public.repairs(assigned_worker_id);

create table if not exists public.repair_timeline (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid not null references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists repair_timeline_repair_idx on public.repair_timeline(repair_id);

create table if not exists public.repair_reports (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs(id) on delete cascade unique,
  worker_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs(id) on delete cascade unique,
  student_id uuid not null references public.profiles(id),
  rating int not null check (rating between 1 and 5),
  content text,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  repair_id uuid not null references public.repairs(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  type text not null check (type in ('repair','report','feedback')),
  bucket text not null default 'repairs-media',
  path text not null,
  created_at timestamptz not null default now(),
  constraint attachments_path_unique unique(bucket, path)
);
create index if not exists attachments_repair_idx on public.attachments(repair_id);
create index if not exists attachments_owner_idx on public.attachments(owner_id);

--------------------------------------------------------------------------------
-- Status transition guard + timeline logging
--------------------------------------------------------------------------------
create or replace function public.validate_repair_transition()
returns trigger
language plpgsql
as $$
declare
  role text;
  allowed boolean := false;
begin
  role := current_user_role();
  if role is null then
    raise exception 'Profile not found for user %', auth.uid();
  end if;

  if new.id <> old.id or new.created_by <> old.created_by then
    raise exception 'Immutable fields changed';
  end if;

  -- Always keep updated_at fresh
  new.updated_at := now();

  -- If status unchanged, allow other updates that pass RLS
  if new.status = old.status then
    return new;
  end if;

  if role = 'student' then
    if new.created_by <> auth.uid() then
      raise exception 'Students can only change their own repairs';
    end if;
    allowed := (old.status = 'draft' and new.status = 'submitted')
            or (old.status = 'submitted' and new.status = 'canceled')
            or (old.status = 'accepted' and new.status = 'canceled')
            or (old.status = 'resolved' and new.status = 'closed')
            or (old.status = 'resolved' and new.status = 'in_progress');

    if old.status = 'resolved' and new.status = 'in_progress' and coalesce(new.status_reason, '') = '' then
      raise exception 'Rejecting a repair requires a reason';
    end if;

  elsif role = 'worker' then
    if old.assigned_worker_id is distinct from auth.uid() then
      raise exception 'Worker not assigned to this repair';
    end if;
    allowed := (old.status = 'assigned' and new.status = 'in_progress')
            or (old.status = 'in_progress' and new.status = 'resolved');

  elsif role = 'admin' then
    allowed := (old.status = 'submitted' and new.status = 'accepted')
            or (old.status = 'accepted' and new.status = 'assigned')
            or (old.status = 'accepted' and new.status = 'canceled')
            or (old.status = 'assigned' and new.status = 'reassigned')
            or (old.status = 'in_progress' and new.status = 'reassigned');
  end if;

  if not allowed then
    raise exception 'Invalid status transition: % -> % for role %', old.status, new.status, role;
  end if;

  -- Additional field checks per status
  if new.status in ('assigned','reassigned','in_progress','resolved') and new.assigned_worker_id is null then
    raise exception 'assigned_worker_id required for % status', new.status;
  end if;
  if new.status = 'resolved' then
    new.resolved_at := coalesce(new.resolved_at, now());
  elsif new.status = 'closed' then
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status = 'canceled' then
    new.canceled_at := coalesce(new.canceled_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_repair_transition on public.repairs;
create trigger trg_validate_repair_transition
before update on public.repairs
for each row
execute function public.validate_repair_transition();

-- Log every status change into repair_timeline
create or replace function public.log_repair_timeline()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.repair_timeline(repair_id, from_status, to_status, changed_by, reason)
    values (new.id, null, new.status, coalesce(auth.uid(), new.created_by), new.status_reason);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.repair_timeline(repair_id, from_status, to_status, changed_by, reason)
    values (new.id, old.status, new.status, coalesce(auth.uid(), new.created_by), new.status_reason);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_repair_timeline on public.repairs;
create trigger trg_log_repair_timeline
after insert or update on public.repairs
for each row
execute function public.log_repair_timeline();

--------------------------------------------------------------------------------
-- KPI + admin export helpers
--------------------------------------------------------------------------------
create or replace function public.get_repair_kpi()
returns table (
  total_repairs bigint,
  pending_count bigint,
  in_progress_count bigint,
  resolved_count bigint,
  urgent_repairs_count bigint,
  avg_resolution_time_hours numeric
)
language plpgsql
security definer set search_path = public
as $$
declare
  role text := current_user_role();
  uid uuid := auth.uid();
begin
  if role is null then
    raise exception 'Profile not found';
  end if;

  return query
  with scoped as (
    select *
    from public.repairs r
    where
      case
        when role = 'student' then r.created_by = uid
        when role = 'worker' then r.assigned_worker_id = uid
        else true
      end
  )
  select
    count(*) as total_repairs,
    count(*) filter (where status in ('submitted','accepted','assigned','reassigned')) as pending_count,
    count(*) filter (where status = 'in_progress') as in_progress_count,
    count(*) filter (where status = 'resolved') as resolved_count,
    count(*) filter (where urgency = 'urgent') as urgent_repairs_count,
    avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric as avg_resolution_time_hours
  from scoped;
end;
$$;

-- Admin-only export view (use to stream CSV)
create or replace function public.get_repairs_export()
returns table (
  repair_id uuid,
  title text,
  status text,
  urgency text,
  created_at timestamptz,
  updated_at timestamptz,
  scheduled_time timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  canceled_at timestamptz,
  created_by uuid,
  created_by_name text,
  assigned_worker_id uuid,
  assigned_worker_name text
)
language plpgsql
security definer set search_path = public
as $$
begin
  if current_user_role() <> 'admin' then
    raise exception 'Admin only';
  end if;

  return query
  select
    r.id,
    r.title,
    r.status,
    r.urgency,
    r.created_at,
    r.updated_at,
    r.scheduled_time,
    r.resolved_at,
    r.closed_at,
    r.canceled_at,
    r.created_by,
    p_created.name,
    r.assigned_worker_id,
    p_worker.name
  from public.repairs r
  left join public.profiles p_created on p_created.id = r.created_by
  left join public.profiles p_worker on p_worker.id = r.assigned_worker_id;
end;
$$;

--------------------------------------------------------------------------------
-- RLS
--------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.repairs enable row level security;
alter table public.repair_timeline enable row level security;
alter table public.repair_reports enable row level security;
alter table public.feedback enable row level security;
alter table public.attachments enable row level security;

-- profiles
drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
for select using (id = auth.uid());

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
for select using (current_user_role() = 'admin');

drop policy if exists profiles_timeline_participant_select on public.profiles;
create policy profiles_timeline_participant_select on public.profiles
for select using (
  exists (
    select 1
    from public.repair_timeline t
    join public.repairs r on r.id = t.repair_id
    where t.changed_by = profiles.id
      and (
        current_user_role() = 'admin'
        or r.created_by = auth.uid()
        or r.assigned_worker_id = auth.uid()
      )
  )
);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
for update using (id = auth.uid());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
for update using (current_user_role() = 'admin');

-- repairs
drop policy if exists repairs_student_select on public.repairs;
create policy repairs_student_select on public.repairs
for select using (created_by = auth.uid());

drop policy if exists repairs_worker_select on public.repairs;
create policy repairs_worker_select on public.repairs
for select using (assigned_worker_id = auth.uid());

drop policy if exists repairs_admin_select on public.repairs;
create policy repairs_admin_select on public.repairs
for select using (current_user_role() = 'admin');

drop policy if exists repairs_student_insert on public.repairs;
create policy repairs_student_insert on public.repairs
for insert with check (
  current_user_role() = 'student'
  and created_by = auth.uid()
  and status in ('draft','submitted')
);

drop policy if exists repairs_admin_insert on public.repairs;
create policy repairs_admin_insert on public.repairs
for insert with check (current_user_role() = 'admin');

drop policy if exists repairs_student_update on public.repairs;
create policy repairs_student_update on public.repairs
for update using (current_user_role() = 'student' and created_by = auth.uid());

drop policy if exists repairs_worker_update on public.repairs;
create policy repairs_worker_update on public.repairs
for update using (current_user_role() = 'worker' and assigned_worker_id = auth.uid());

drop policy if exists repairs_admin_update on public.repairs;
create policy repairs_admin_update on public.repairs
for update using (current_user_role() = 'admin');

drop policy if exists repairs_admin_delete on public.repairs;
create policy repairs_admin_delete on public.repairs
for delete using (current_user_role() = 'admin');

-- repair_timeline
drop policy if exists timeline_participant_select on public.repair_timeline;
create policy timeline_participant_select on public.repair_timeline
for select using (
  exists (
    select 1 from public.repairs r
    where r.id = repair_timeline.repair_id
      and (
        r.created_by = auth.uid()
        or r.assigned_worker_id = auth.uid()
        or current_user_role() = 'admin'
      )
  )
);

drop policy if exists timeline_admin_insert on public.repair_timeline;
create policy timeline_admin_insert on public.repair_timeline
for insert with check (current_user_role() = 'admin');

-- repair_reports
drop policy if exists reports_participant_select on public.repair_reports;
create policy reports_participant_select on public.repair_reports
for select using (
  exists (
    select 1 from public.repairs r
    where r.id = repair_reports.repair_id
      and (
        r.created_by = auth.uid()
        or r.assigned_worker_id = auth.uid()
        or current_user_role() = 'admin'
      )
  )
);

drop policy if exists reports_worker_insert on public.repair_reports;
create policy reports_worker_insert on public.repair_reports
for insert with check (
  current_user_role() = 'worker'
  and exists (
    select 1 from public.repairs r
    where r.id = repair_reports.repair_id
      and r.assigned_worker_id = auth.uid()
  )
);

drop policy if exists reports_admin_insert on public.repair_reports;
create policy reports_admin_insert on public.repair_reports
for insert with check (current_user_role() = 'admin');

-- feedback
drop policy if exists feedback_participant_select on public.feedback;
create policy feedback_participant_select on public.feedback
for select using (
  exists (
    select 1 from public.repairs r
    where r.id = feedback.repair_id
      and (
        r.created_by = auth.uid()
        or r.assigned_worker_id = auth.uid()
        or current_user_role() = 'admin'
      )
  )
);

drop policy if exists feedback_student_insert on public.feedback;
create policy feedback_student_insert on public.feedback
for insert with check (
  current_user_role() = 'student'
  and student_id = auth.uid()
  and exists (
    select 1 from public.repairs r
    where r.id = feedback.repair_id
      and r.created_by = auth.uid()
      and r.status = 'closed'
  )
);

drop policy if exists feedback_admin_insert on public.feedback;
create policy feedback_admin_insert on public.feedback
for insert with check (current_user_role() = 'admin');

-- attachments
drop policy if exists attachments_participant_select on public.attachments;
create policy attachments_participant_select on public.attachments
for select using (
  exists (
    select 1 from public.repairs r
    where r.id = attachments.repair_id
      and (
        r.created_by = auth.uid()
        or r.assigned_worker_id = auth.uid()
        or current_user_role() = 'admin'
      )
  )
);

drop policy if exists attachments_student_insert on public.attachments;
create policy attachments_student_insert on public.attachments
for insert with check (
  current_user_role() = 'student'
  and owner_id = auth.uid()
  and exists (
    select 1 from public.repairs r
    where r.id = attachments.repair_id
      and r.created_by = auth.uid()
  )
);

drop policy if exists attachments_worker_insert on public.attachments;
create policy attachments_worker_insert on public.attachments
for insert with check (
  current_user_role() = 'worker'
  and owner_id = auth.uid()
  and exists (
    select 1 from public.repairs r
    where r.id = attachments.repair_id
      and r.assigned_worker_id = auth.uid()
  )
);

drop policy if exists attachments_admin_insert on public.attachments;
create policy attachments_admin_insert on public.attachments
for insert with check (current_user_role() = 'admin');

--------------------------------------------------------------------------------
-- Storage bucket + policies (repairs-media)
--------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('repairs-media', 'repairs-media', false)
on conflict (id) do nothing;

-- Helper: parse repair_id and folder from object path repairs/{repair_id}/{segment}/{file}
create or replace function public.storage_repair_id(obj storage.objects)
returns uuid
language sql immutable
as $$
  select nullif(split_part(obj.name, '/', 2), '')::uuid;
$$;

create or replace function public.storage_segment(obj storage.objects)
returns text
language sql immutable
as $$
  select split_part(obj.name, '/', 3);
$$;

-- Read policies
drop policy if exists storage_admin_read on storage.objects;
create policy storage_admin_read on storage.objects
for select using (
  bucket_id = 'repairs-media' and current_user_role() = 'admin'
);

drop policy if exists storage_student_read on storage.objects;
create policy storage_student_read on storage.objects
for select using (
  bucket_id = 'repairs-media'
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.created_by = auth.uid()
  )
);

drop policy if exists storage_worker_read on storage.objects;
create policy storage_worker_read on storage.objects
for select using (
  bucket_id = 'repairs-media'
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.assigned_worker_id = auth.uid()
  )
);

-- Write policies (path must match required folders)
drop policy if exists storage_admin_write on storage.objects;
create policy storage_admin_write on storage.objects
for insert with check (bucket_id = 'repairs-media' and current_user_role() = 'admin');

drop policy if exists storage_student_write on storage.objects;
create policy storage_student_write on storage.objects
for insert with check (
  bucket_id = 'repairs-media'
  and storage_segment(objects) in ('repair','feedback')
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.created_by = auth.uid()
  )
);

drop policy if exists storage_worker_write on storage.objects;
create policy storage_worker_write on storage.objects
for insert with check (
  bucket_id = 'repairs-media'
  and storage_segment(objects) = 'report'
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.assigned_worker_id = auth.uid()
  )
);

-- Allow updating (replace) with same rules as insert
drop policy if exists storage_admin_update on storage.objects;
create policy storage_admin_update on storage.objects
for update using (bucket_id = 'repairs-media' and current_user_role() = 'admin')
with check (bucket_id = 'repairs-media' and current_user_role() = 'admin');

drop policy if exists storage_student_update on storage.objects;
create policy storage_student_update on storage.objects
for update using (
  bucket_id = 'repairs-media'
  and storage_segment(objects) in ('repair','feedback')
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.created_by = auth.uid()
  )
)
with check (
  bucket_id = 'repairs-media'
  and storage_segment(objects) in ('repair','feedback')
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.created_by = auth.uid()
  )
);

drop policy if exists storage_worker_update on storage.objects;
create policy storage_worker_update on storage.objects
for update using (
  bucket_id = 'repairs-media'
  and storage_segment(objects) = 'report'
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.assigned_worker_id = auth.uid()
  )
)
with check (
  bucket_id = 'repairs-media'
  and storage_segment(objects) = 'report'
  and exists (
    select 1 from public.repairs r
    where r.id = public.storage_repair_id(objects)
      and r.assigned_worker_id = auth.uid()
  )
);
