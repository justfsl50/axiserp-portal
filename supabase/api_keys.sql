-- AXISMCP: key metadata table + Row Level Security.
--
-- Run once in the Supabase SQL editor (idempotent — safe to re-run).
-- This is the ONLY authorization boundary for key metadata: the browser talks
-- to Postgres directly with the anon key, so every user must be limited to
-- their own rows by policy, never by client-side filtering.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_prefix text not null default '',
  key_hash text not null,
  backend_id text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);

-- Add this column when upgrading an existing api_keys table.
alter table public.api_keys add column if not exists backend_id text;

-- Unique hash per user: the same key can never be recorded twice for one account.
create unique index if not exists api_keys_user_hash_idx
  on public.api_keys (user_id, key_hash);

-- Fast "newest first" listing (the console query).
create index if not exists api_keys_user_created_idx
  on public.api_keys (user_id, created_at desc);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_owner_select" on public.api_keys;
create policy "api_keys_owner_select"
  on public.api_keys for select
  using (auth.uid() = user_id);

drop policy if exists "api_keys_owner_insert" on public.api_keys;
create policy "api_keys_owner_insert"
  on public.api_keys for insert
  with check (auth.uid() = user_id);

drop policy if exists "api_keys_owner_update" on public.api_keys;
create policy "api_keys_owner_update"
  on public.api_keys for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "api_keys_owner_delete" on public.api_keys;
create policy "api_keys_owner_delete"
  on public.api_keys for delete
  using (auth.uid() = user_id);

-- Verification checklist (run as a signed-in user, not as the dashboard owner):
--   1. select * from public.api_keys;                        -- must show ONLY your rows
--   2. select * from public.api_keys where user_id <> auth.uid();  -- must return 0 rows
--   3. insert into public.api_keys (user_id, name, key_hash)
--        values (gen_random_uuid(), 'x', 'h');              -- must be REJECTED by RLS

-- Hardening reminders (dashboard, not SQL):
--   * Keep the service_role key server-side only — it bypasses every policy above.
--   * Limit project collaborators and require 2FA on the Supabase + Vercel accounts.
--   * Keep public sign-ups limited to the providers you actually use (Google/GitHub/email OTP).