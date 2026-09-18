import { ApiKeyItem, ErpAuthPayload, ErpAuthResponse, StudentAttendance, TodaySchedule } from "./types";

/**
 * Browser code must NEVER call the upstream API directly — that triggers
 * CORS preflights (and fails when the backend omits ACAO headers).
 * All requests go through same-origin Next.js proxies in app/api/...,
 * which forward server-to-server (no CORS there).
 */
async function callAuthEndpoint(
  endpoint: "/api/auth/signup" | "/api/auth/login",
  payload: { erpId: string; erpPassword?: string; name: string }
): Promise<ErpAuthResponse> {
  let res: Response;

  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Cannot reach auth server (${endpoint}). Check your connection and try again.`
    );
  }

  const data = await res.json().catch(() => null);

  if (res.ok) return data;

  // Server explicitly rejected the request (bad credentials, rate limit, etc.)
  throw new Error(data?.message ?? `Server error ${res.status}`);
}

/**
 * 1. First key (show once) - POST /api/auth/signup (proxied)
 */
export function signupErp(erpId: string, erpPassword?: string, name = "web"): Promise<ErpAuthResponse> {
  return callAuthEndpoint("/api/auth/signup", { erpId, erpPassword, name });
}

/**
 * 2. Additional keys (one per consumer: mcp, cli, tui...) - POST /api/auth/login (proxied)
 */
export function loginErp(erpId: string, erpPassword?: string, name = "mcp"): Promise<ErpAuthResponse> {
  return callAuthEndpoint("/api/auth/login", { erpId, erpPassword, name });
}

export function loginOrSignupErp(payload: ErpAuthPayload, isSignup = false): Promise<ErpAuthResponse> {
  if (isSignup) {
    return signupErp(payload.erpId, payload.erpPassword, payload.name || "web");
  }
  return loginErp(payload.erpId, payload.erpPassword, payload.name || "mcp");
}

/**
 * 3. List keys - GET /api/keys (proxied) under X-API-Key
 */
export async function fetchKeys(apiKey?: string): Promise<ApiKeyItem[]> {  if (apiKey) {
    let res: Response;
    try {
      res = await fetch("/api/keys", {
        headers: { "X-API-Key": apiKey },
      });
    } catch {
      throw new Error("Cannot reach API server to list keys. Check your connection.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? `Failed to list keys (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data.keys) return data.keys;
    return [];
  }

  // No apiKey → local-only mode (showcase / signed-out). Return cached metadata or empty.
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("axiserp_keys_metadata");
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
  }

  return [];
}

/**
 * Backend truth: list raw key records from api.handlebid.lol (via proxy).
 * Requires a live raw session key — call only when one is held in memory.
 * Accepts both `[...]` and `{ keys: [...] }` response shapes.
 */
/** Raw key record as returned by the backend (vault.list_keys). */
export interface BackendKeyRecord {
  id: number | string;
  name?: string;
  scopes?: string[];
  created_at?: number | string | null;
  createdAt?: number | string | null;
  last_used_at?: number | string | null;
  revoked?: boolean;
  key_preview?: string | null;
}

function isBackendKeyArray(value: unknown): value is BackendKeyRecord[] {
  return Array.isArray(value);
}

/**
 * Backend truth: list raw key records from api.handlebid.lol (via proxy).
 * Requires a live raw key — call only when one is held.
 * Accepts both `[...]` and `{ keys: [...] }` response shapes.
 */
export async function listKeysFromBackend(apiKey: string): Promise<BackendKeyRecord[]> {
  let res: Response;
  try {
    res = await fetch("/api/keys", {
      headers: { "X-API-Key": apiKey },
    });
  } catch {
    throw new Error("Cannot reach API server to list keys. Check your connection.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? `Failed to list keys (HTTP ${res.status})`);
  }
  const data: unknown = await res.json();
  if (isBackendKeyArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { keys?: unknown }).keys)) {
    return (data as { keys: BackendKeyRecord[] }).keys;
  }
  return [];
}

function formatBackendDate(value: unknown): string {
  // Backend sends epoch SECONDS (float). Date() needs ms — heuristic scale-up.
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  try {
    if (value === null || value === undefined || value === "") throw new Error("empty");
    const num = typeof value === "number" ? value : Date.parse(String(value));
    if (Number.isNaN(num)) throw new Error("unparseable");
    const ms = num < 1e12 ? num * 1000 : num;
    return fmt(new Date(ms));
  } catch {
    return fmt(new Date());
  }
}

/**
 * Normalize one backend record. Backend truth (vault.list_keys):
 * { id, name, scopes, created_at (epoch s), last_used_at, revoked: bool, key_preview: null }
 * — there is NO status string and NO key preview, so we map honestly instead of fabricating.
 */
export function normalizeBackendKey(record: BackendKeyRecord): ApiKeyItem {
  const isRevoked = record.revoked === true;
  return {
    id: `backend_${record.id}`,
    name: record.name ?? "unnamed",
    prefix: "axis_••••••••",
    created_at: formatBackendDate(record.created_at ?? record.createdAt),
    status: isRevoked ? "revoked" : "active",
    lastChars: undefined,
    backendId: String(record.id),
  };
}

/**
 * Resolve a table row to a REAL backend key ID. Never invent one:
 * local/Supabase placeholder IDs (key_*, uuids) must not be sent as {kid}.
 * Returns null with a human reason when unresolvable.
 */
export function resolveBackendId(row: ApiKeyItem): { id: string | null; reason: string | null } {
  if (row.backendId && /^\d+$/.test(row.backendId)) return { id: row.backendId, reason: null };
  const m = /^backend_(\d+)$/.exec(row.id);
  if (m) return { id: m[1], reason: null };
  return {
    id: null,
    reason: `"${row.name}" has no backend ID yet — sync with a live key first (it will attach automatically).`,
  };
}

/**
 * Revoke + mandatory verification: 2xx alone never proves death.
 * Re-lists and asserts the target is gone/revoked before resolving.
 * selfAuth=true (actor is the target itself): a post-delete 401 IS the proof.
 */
export async function revokeAndVerify(
  backendId: string,
  secret: string,
  selfAuth: boolean
): Promise<void> {
  await deleteKey(backendId, secret);
  let rows: ApiKeyItem[];
  try {
    rows = (await listKeysFromBackend(secret)).map(normalizeBackendKey);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (selfAuth && /401/.test(message)) return; // actor dead → target (itself) dead. Verified.
    throw new Error(
      `Revoke sent, but verification failed: ${message || "unknown error"}. Target state unknown — re-sync before trusting the table.`
    );
  }
  const found = rows.find((r) => r.backendId === backendId);
  if (found && found.status !== "revoked") {
    throw new Error(
      `Backend still reports "${found.name}" as ACTIVE after revoke. Nothing was revoked — target state kept.`
    );
  }
}

/**
 * 4. Revoke one - DELETE /api/keys/{id} (proxied) under X-API-Key
 */
export async function deleteKey(keyId: string | number, apiKey?: string): Promise<boolean> {
  if (apiKey) {
    let res: Response;
    try {
      res = await fetch(`/api/keys/${keyId}`, {
        method: "DELETE",
        headers: { "X-API-Key": apiKey },
      });
    } catch {
      throw new Error("Cannot reach API server to revoke key. Key NOT revoked remotely.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? `Failed to revoke key (HTTP ${res.status})`);
    }
    return true;
  }
  // Local-only mode (no raw key available) — caller handles localStorage update.
  return true;
}

/**
 * 5. Forget everything - POST /api/account/forget (proxied) under X-API-Key
 */
export async function forgetAccount(apiKey?: string): Promise<boolean> {
  if (apiKey) {
    let res: Response;
    try {
      res = await fetch("/api/account/forget", {
        method: "POST",
        headers: { "X-API-Key": apiKey },
      });
    } catch {
      throw new Error("Cannot reach API server to forget account. Nothing was deleted remotely.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message ?? `Failed to forget account (HTTP ${res.status})`);
    }
    return true;
  }
  return true;
}

export const DEMO_ATTENDANCE: StudentAttendance = {
  present: 34,
  absent: 8,
  total: 42,
  percentage: 80.95,
  status: "safe",
  safe_margin_bunks: 3,
};

export async function fetchAttendance(apiKey?: string): Promise<StudentAttendance> {
  if (!apiKey) return DEMO_ATTENDANCE; // showcase mode, clearly demo data
  let res: Response;
  try {
    res = await fetch("/api/attendance", {
      headers: { "X-API-Key": apiKey },
    });
  } catch {
    throw new Error("Cannot reach API server for attendance.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? `Attendance request failed (HTTP ${res.status})`);
  }
  return await res.json();
}

export const DEMO_SCHEDULE: TodaySchedule = {
  date: new Date().toISOString().split("T")[0],
  total_sessions: 5,
  classes: [
    { time: "09:00 AM - 09:50 AM", subject: "Mini Project Or Internship Assessment*", room: "Lab 3", instructor: "Vijay Kumar Verma · LAB" },
    { time: "09:50 AM - 10:40 AM", subject: "Cloud Computing", room: "Room 204", instructor: "Shreoshi Roy · LECTURE" },
    { time: "10:40 AM - 10:50 AM", subject: "LUNCH BREAK", room: "Cafeteria", instructor: "Campus" },
    { time: "10:50 AM - 11:40 AM", subject: "Artificial Intelligence", room: "Room 301", instructor: "Avinash Kumar · LECTURE" },
    { time: "11:40 AM - 01:20 PM", subject: "EMPLOYABILITY TRAINING", room: "Auditorium", instructor: "Nitin Saxena · LECTURE" },
  ],
};

export async function fetchTodaySchedule(apiKey?: string): Promise<TodaySchedule> {
  if (!apiKey) return DEMO_SCHEDULE; // showcase mode, clearly demo data
  let res: Response;
  try {
    res = await fetch("/api/today", {
      headers: { "X-API-Key": apiKey },
    });
  } catch {
    throw new Error("Cannot reach API server for schedule.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.message ?? `Schedule request failed (HTTP ${res.status})`);
  }
  return await res.json();
}
