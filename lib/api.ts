import { ApiKeyItem, ErpAuthPayload, ErpAuthResponse, StudentAttendance, TodaySchedule } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.handlebid.lol";

/**
 * Shared transport layer for auth endpoints.
 * - Network errors (fetch throws) → thrown to the caller so the UI can display them.
 *   Never silently fake a key — a fake key looks real and causes confusing failures later.
 * - Server errors (non-2xx) → thrown to the caller so the UI can display them.
 */
async function callAuthEndpoint(
  endpoint: "/v1/auth/signup" | "/v1/auth/login",
  payload: { erpId: string; erpPassword?: string; name: string }
): Promise<ErpAuthResponse> {
  let res: Response;

  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Pure network failure (no internet, CORS preflight blocked, backend down).
    // Throw so the UI shows a real error — never silently fake a key.
    throw new Error(
      `Cannot reach auth server (${endpoint}). Check your connection and try again.`
    );
  }

  const data = await res.json().catch(() => null);

  if (res.ok) return data;

  // Server explicitly rejected the request (bad credentials, rate limit, etc.)
  // Propagate so the modal can display the error — never silently fake a key.
  throw new Error(data?.message ?? `Server error ${res.status}`);
}

/**
 * 1. First key (show once) - POST /v1/auth/signup
 */
export function signupErp(erpId: string, erpPassword?: string, name = "web"): Promise<ErpAuthResponse> {
  return callAuthEndpoint("/v1/auth/signup", { erpId, erpPassword, name });
}

/**
 * 2. Additional keys (one per consumer: mcp, cli, tui...) - POST /v1/auth/login
 */
export function loginErp(erpId: string, erpPassword?: string, name = "mcp"): Promise<ErpAuthResponse> {
  return callAuthEndpoint("/v1/auth/login", { erpId, erpPassword, name });
}

export function loginOrSignupErp(payload: ErpAuthPayload, isSignup = false): Promise<ErpAuthResponse> {
  if (isSignup) {
    return signupErp(payload.erpId, payload.erpPassword, payload.name || "web");
  }
  return loginErp(payload.erpId, payload.erpPassword, payload.name || "mcp");
}

/**
 * 3. List keys - GET /v1/keys under X-API-Key
 */
export async function fetchKeys(apiKey?: string): Promise<ApiKeyItem[]> {
  if (apiKey) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/v1/keys`, {
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
 * 4. Revoke one - DELETE /v1/keys/{id} under X-API-Key
 */
export async function deleteKey(keyId: string | number, apiKey?: string): Promise<boolean> {
  if (apiKey) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/v1/keys/${keyId}`, {
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
 * 5. Forget everything - POST /v1/account/forget under X-API-Key
 */
export async function forgetAccount(apiKey?: string): Promise<boolean> {
  if (apiKey) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/v1/account/forget`, {
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
    res = await fetch(`${API_BASE}/v1/attendance`, {
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
    res = await fetch(`${API_BASE}/v1/today`, {
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
