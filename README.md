# AXISMCP Portal

Self-service developer portal for AXISMCP — a read-only College ERP API for MCP (Claude, Cursor, VS Code), CLI/TUI, and REST.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript (strict) · TailwindCSS · Supabase Auth + Postgres (`@supabase/ssr`)

## Quick start

```bash
npm install
cp .env.example .env.local        # fill NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev                       # http://localhost:3000
```

Quality gates: `npm run typecheck` (strict TS) · `npm run lint` · `npm run build`. Run all three with `npm run verify`.

## One-time Supabase setup

Run both files in the Supabase **SQL editor** (idempotent — safe to re-run):

1. `supabase/api_keys.sql` — key metadata table + owner-only RLS (the only authorization boundary).
2. `supabase/key_secrets.sql` — owner-only store for live keys so the console can reveal/copy them after reload.

Then in **Authentication → URL Configuration** set the Site URL and add `<domain>/auth/callback` to Redirect URLs.

## Security model

| Layer | Rule |
| --- | --- |
| Supabase RLS | Users can only read/write their own `api_keys` and `key_secrets` rows. The anon key is public by design — policies do the authorization. |
| Key minting | Requires a signed-in Supabase user (Google / GitHub / email OTP). Guests can never mint keys. |
| ERP credentials | The ERP password is validated once and never stored. |
| `key_secrets` | Live keys are stored owner-only so the console can show them. **Tradeoff**: project members, dashboard viewers, backups, or a leaked `service_role` key can read them. Mitigate with minimal collaborators + 2FA + never shipping `service_role` client-side. |
| Revocation | Revoking deletes the stored secret immediately; the key stops working server-side. |
| Browser cache | Key metadata lives in `localStorage` and is wiped on sign-out. Full keys are never cached there. |
| HTTP hardening | CSP, HSTS, frame/mime sniffing blocks, permissions policy, and `no-store` on all `/api/*` responses via `next.config.mjs`. |
| API proxies | `/api/auth/*` validate payloads, reject cross-site requests, and are IP rate-limited (in-memory, or Upstash Redis when configured). Backend key IDs are validated before interpolation. |
| Private pages | `/keys`, `/settings`, and `/auth/*` return `X-Robots-Tag: noindex` and are excluded from `robots.txt`. |

### Production checklist

- [ ] Run `supabase/api_keys.sql` and `supabase/key_secrets.sql`
- [ ] Set all env vars from `.env.example` (plus `NEXT_PUBLIC_SITE_URL`)
- [ ] Configure Upstash Redis (optional but recommended for real rate limiting)
- [ ] Enable 2FA on the Supabase project + hosting account
- [ ] Confirm Supabase Auth providers match what the UI offers

## Project structure

```
app/page.tsx           landing + terminal/MCP/CLI showcase
app/keys/page.tsx      developer console (signed-in only)
app/settings/page.tsx  account, sign-out, danger zone
app/docs/page.tsx      guides and connection snippets
app/terms/page.tsx     terms of use
app/privacy/page.tsx   privacy policy
app/api/**/route.ts    same-origin proxies to the ERP backend (hardened)
lib/security.ts        rate limit, origin check, key validation
lib/upstream.ts        timeout + no-store upstream fetch helpers
lib/erpPayload.ts      server-side ERP payload validation
lib/supabase/          browser + server clients
middleware.ts          session cookie refresh for private routes
supabase/*.sql         database schema + RLS migrations
```

## Deployment (Vercel)

1. Push to GitHub and **Import Project** in Vercel.
2. Add every env var from `.env.example` under **Settings → Environment Variables**.
3. Deploy. `vercel.json` pins the framework; no other config is needed.

To run self-hosted instead: `npm run build && npm start`.

## Env

See `.env.example` — it documents every variable, what is public vs server-only, and the Supabase redirect URLs you must register.
