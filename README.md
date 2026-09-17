# AXISMCP Portal

Self-service developer portal for AXISMCP — read-only College ERP API for MCP, CLI/TUI, and REST.

## Stack

Next.js 14 (App Router) + React 18 + TypeScript + TailwindCSS + Supabase (`@supabase/ssr`).

## Getting started

```bash
npm install
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_API_BASE
npm run dev
```

Open `http://localhost:3000`.

## Key flows

- `POST /v1/auth/signup` — first API key (new account). Shown once.
- `POST /v1/auth/login` — additional keys (`mcp`, `cli`, …) for existing accounts.
- `GET /v1/keys` / `DELETE /v1/keys/{id}` / `POST /v1/account/forget` under `X-API-Key`.
- Same-origin proxies live under `app/api/...` (`auth/login`, `auth/signup`, `keys`, `keys/[id]`, `account/forget`) to avoid CORS in the browser.

Raw secrets are never stored. Only `SHA-256(key_hash)` + `key_prefix` go to Supabase `api_keys`. See `app/keys/page.tsx`.

## Security model

- ERP password used once for verification, never saved.
- Failures throw — no silent fake keys, no silent revoke success. See `lib/api.ts`.
- Local `localStorage axiserp_keys_metadata` is a metadata cache only.

## Project structure

```
app/page.tsx        landing + terminal/MCP/CLI showcase
app/keys/page.tsx   developer console
app/connect/page.tsx snippets
app/docs/page.tsx   guides
app/signin/page.tsx Supabase OAuth + OTP
components/         Navbar, ErpLinkModal, MyKeysTable, DangerZone, ...
lib/api.ts          transport (throws on network/server error)
lib/supabase/       browser + server clients
middleware.ts       Supabase session refresh
```

## Env

See `.env.example`. Never commit `.env.local`.
