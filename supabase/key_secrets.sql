-- AXISMCP: live-secret store for backend CRUD across reloads.
-- Raw secrets at rest — owner-only RLS. Run once in the Supabase SQL editor.
--
-- Residual risk (accepted, documented in README): project members, dashboard
-- viewers, backups, or a leaked service_role key can read live secrets.
-- Mitigate with minimal collaborators + 2FA + never shipping service_role client-side.

create table if not exists public.key_secrets (
  key_hash text primary key,
  raw_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.key_secrets enable row level security;

drop policy if exists "key_secrets_owner_all" on public.key_secrets;
create policy "key_secrets_owner_all"
  on public.key_secrets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Verify (as an authenticated user you must see ONLY your own rows):
--   select key_hash, created_at from public.key_secrets;
--
-- This table stores raw keys. It is an accepted tradeoff so the console can
-- reveal/copy a key after reload. Residual risk: project members, dashboard
-- viewers, backups, or a leaked service_role key can read live secrets.
-- Mitigate with minimal collaborators + 2FA + never shipping service_role
-- client-side. Revoking a key deletes its row immediately.
--
-- Extra index: the janitor-free loader reads newest-first per user.
create index if not exists key_secrets_user_created_idx
  on public.key_secrets (user_id, created_at desc);
