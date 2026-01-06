# Supabase backend guide

This document adds a deployable Supabase backend that pairs with the Vue front-end.

## Quick start
- Prereq: Supabase project + CLI logged in.
- In the project root, run: `supabase db push --file supabase/schema.sql` (or paste the SQL into Supabase SQL Editor).
- Ensure the storage bucket is created by the SQL (`repairs-media`, private).
- In the Vue app `.env.local` (or `.env`), add:
  - `VITE_SUPABASE_URL=<your-supabase-url>`
  - `VITE_SUPABASE_ANON_KEY=<your-anon-key>`
- Front-end auth/session handling (satisfies rubric):
  - `const { data: session } = await supabase.auth.getSession()`
  - `supabase.auth.onAuthStateChange((event, session) => { /* update Pinia + router guard */ })`
  - Keep session across refresh; guard `/app` routes when `!session`.

## Schema (snake_case statuses)
- Core tables: `profiles`, `repairs`, `repair_timeline`, `repair_reports`, `feedback`, `attachments`.
- Status enum is enforced on `repairs.status` with snake_case values:
  - `draft`, `submitted`, `accepted`, `assigned`, `reassigned`, `in_progress`, `resolved`, `closed`, `canceled`
- Urgency: `normal | urgent | emergency`.
- `repair_timeline` records *every* status change (and creation) with `from_status`, `to_status`, `changed_by`, `reason`.
- `attachments` track storage paths; unique `(bucket, path)`.
- Auto profile provisioning trigger on `auth.users` (`handle_new_user`) defaults role to `student` unless provided in user metadata.

## Auth & RBAC
- Supabase Auth (email/password) supports register/login/forgot/logout.
- Roles via `profiles.role` (`student | admin | worker`) and helper `current_user_role()`.
- Session-aware access throughout RLS and RPCs (`auth.uid()`).

## State machine (enforced in DB)
- Trigger `validate_repair_transition` guards all status moves + timestamps:
  - Student: `draft→submitted`, `submitted/accepted→canceled`, `resolved→closed`, `resolved→in_progress` (reject requires `status_reason`).
  - Worker: `assigned→in_progress`, `in_progress→resolved` (must be current assignee).
  - Admin: `submitted→accepted`, `submitted→canceled`, `accepted→assigned`, `accepted→canceled`, `assigned/in_progress→reassigned`.
- `assigned_worker_id` required for assigned/in_progress/resolved states.
- Timeline written by `log_repair_timeline` on insert/update.

## RLS (≥3 security techniques)
Enabled on every table (`profiles`, `repairs`, `repair_timeline`, `repair_reports`, `feedback`, `attachments`):
- Role-scoped policies for select/insert/update/delete.
- Ownership checks (`created_by`, `assigned_worker_id`, `owner_id`).
- Admin bypass via role = `admin`.

## Storage (private bucket)
- Bucket: `repairs-media` (private).
- Path rule: `repairs/{repair_id}/{repair|report|feedback}/{uuid}.jpg`.
- Storage policies:
  - Student: can read/write `repair` or `feedback` images for own repairs.
  - Worker: can read/write `report` images for repairs assigned to them.
  - Admin: full access.
- Objects are authorized by parsing `repair_id` from path and checking against `repairs` + role.

## KPI & export
- RPC `get_repair_kpi()` (security definer, role-aware filters):
  - `total_repairs`, `pending_count`, `in_progress_count`, `resolved_count`, `urgent_repairs_count`, `avg_resolution_time_hours`
  - Student: only own repairs; Worker: assigned; Admin: all.
- RPC `get_repairs_export()` (admin only) returns a wide table suitable for CSV on the front-end.

## Admin workflows
- Add admin/worker accounts via Supabase dashboard/CLI with user metadata `{ "role": "admin" | "worker", "name": "..." }` or update `profiles.role` as admin.
- Assign/reassign uses `repairs.status` transitions; timeline auto-logs.
- Workers submit reports in `repair_reports` and move status to `resolved`.

## Front-end integration notes
- Map PascalCase statuses in the current Vue code to snake_case when calling Supabase.
- Use Supabase client for CRUD:
  - Repairs list: `supabase.from('repairs').select(...)` (RLS auto-filters).
  - State change: `supabase.from('repairs').update({ status: 'in_progress', status_reason: '...' }).eq('id', repairId);`
  - Timeline: `supabase.from('repair_timeline').select('*').eq('repair_id', repairId).order('created_at')`
  - KPI: `supabase.rpc('get_repair_kpi')`
  - Export: `supabase.rpc('get_repairs_export')` then format CSV client-side.
- Storage upload flow:
  1) Upload file to `repairs-media` with path rule.
  2) Insert matching row in `attachments` (enforced RLS ties owner/repair).

## What to hand in for Report Part B
- `supabase/schema.sql` (schema + RLS + storage policies + triggers).
- This `supabase/README.md` (implementation narrative).
- Mention security techniques: Auth + RLS on all tables + Storage policies + role-checked RPCs + status-machine trigger + audit timeline.
