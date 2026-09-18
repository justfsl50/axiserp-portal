/**
 * Server-side validation for ERP auth payloads.
 *
 * The browser form validates too, but the proxy is a public endpoint: without
 * this, `/api/auth/*` becomes an unauthenticated relay that will forward
 * arbitrary JSON (and arbitrary field sizes) straight to the college ERP.
 */

/** Same shape the UI enforces: 2023bcs084 — year, branch code, number. */
const ERP_ID_RE = /^\d{4}[a-z]{1,8}\d{1,8}$/;
const MAX_PASSWORD = 200;
const MAX_NAME = 60;

export interface ErpAuthPayload {
  erpId: string;
  erpPassword: string;
  name: string;
}

type Parsed = { ok: true; data: ErpAuthPayload } | { ok: false; error: string };

/** Strip control characters so nothing can smuggle headers/log lines. */
function cleanText(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
}

export function parseErpAuthPayload(body: unknown, defaultName: string): Parsed {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }
  const raw = body as Record<string, unknown>;

  if (typeof raw.erpId !== "string" || typeof raw.erpPassword !== "string") {
    return { ok: false, error: "erpId and erpPassword are required." };
  }

  const erpId = cleanText(raw.erpId).toLowerCase();
  if (erpId.length < 4 || erpId.length > 32 || !ERP_ID_RE.test(erpId)) {
    return { ok: false, error: "ERP ID looks like 2023bcs084 — year, branch code, then number." };
  }

  const erpPassword = raw.erpPassword;
  if (erpPassword.length < 1 || erpPassword.length > MAX_PASSWORD) {
    return { ok: false, error: `Password must be 1-${MAX_PASSWORD} characters.` };
  }

  const name =
    typeof raw.name === "string" && cleanText(raw.name).length > 0
      ? cleanText(raw.name).slice(0, MAX_NAME)
      : defaultName;

  return { ok: true, data: { erpId, erpPassword, name } };
}

/** Backend key IDs are numeric — anything else must never reach the URL path. */
export function isValidBackendId(id: string): boolean {
  return /^\d{1,12}$/.test(id);
}