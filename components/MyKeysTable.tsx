"use client";

import { useState } from "react";
import { ApiKeyItem } from "@/lib/types";
import { Badge } from "./ui/badge";
import { resolveBackendId, revokeAndVerify } from "@/lib/api";
import {
  Key,
  RotateCw,
  Trash2,
  AlertTriangle,
  Copy,
  Check,
  Eye,
  EyeOff,
  MoreHorizontal,
} from "lucide-react";

interface MyKeysTableProps {
  keys: ApiKeyItem[];
  onKeysUpdated: (newKeys: ApiKeyItem[]) => void;
  onRequestReissue: (key: ApiKeyItem) => void;
  /** Raw secrets by key_hash (owner-only Supabase table) — the source of truth for view/copy. */
  rowSecrets: Record<string, string>;
  onRevokeSucceeded?: (row: ApiKeyItem) => void;
}

export function MyKeysTable({
  keys,
  onKeysUpdated,
  onRequestReissue,
  rowSecrets,
  onRevokeSucceeded,
}: MyKeysTableProps) {
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const secretFor = (row: ApiKeyItem): string | null =>
    row.keyHash && rowSecrets[row.keyHash] ? rowSecrets[row.keyHash] : null;

  /** Masked fallback when a secret is not stored (older keys) — never fabricated. */
  const maskedFor = (row: ApiKeyItem): string => {
    const raw = secretFor(row);
    if (raw) return `${raw.slice(0, 8)}••••••••${raw.slice(-4)}`;
    return row.prefix;
  };

  const copySecret = async (row: ApiKeyItem) => {
    const raw = secretFor(row);
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = raw;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopiedId(row.id);
    setTimeout(() => setCopiedId((v) => (v === row.id ? null : v)), 1800);
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    const rowSecret = secretFor(revokeTarget);
    if (!rowSecret) {
      setRevokeError("No stored secret for this key, so it cannot be authenticated for revoke. Re-issue it to get a fresh key.");
      return;
    }
    setIsRevoking(true);
    setRevokeError(null);
    try {
      const resolved = resolveBackendId(revokeTarget);
      if (!resolved.id) throw new Error(resolved.reason ?? "Row has no backend ID.");
      await revokeAndVerify(resolved.id, rowSecret, true);
      const updated = keys.map((k) =>
        k.id === revokeTarget.id ? { ...k, status: "revoked" as const } : k
      );
      onKeysUpdated(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("axiserp_keys_metadata", JSON.stringify(updated));
      }
      onRevokeSucceeded?.(revokeTarget);
      setRevokeTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke key. It is still active.";
      setRevokeError(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  const activeKeys = keys.filter((k) => k.status.toLowerCase() === "active");
  const visibleKeys = activeKeys;
  const closeMenu = () => setOpenMenuId(null);

  const onMenuAction = (action: "copy" | "reveal" | "reissue" | "revoke", row: ApiKeyItem) => {
    closeMenu();
    if (action === "copy") void copySecret(row);
    else if (action === "reveal") setRevealed((v) => ({ ...v, [row.id]: !v[row.id] }));
    else if (action === "reissue") onRequestReissue(row);
    else if (action === "revoke") {
      setRevokeError(null);
      setRevokeTarget(row);
    }
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">My API keys</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeKeys.length} active. Reveal or copy a key any time.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/50 font-mono text-zinc-400">
              <th className="py-3 px-5 font-semibold">Name</th>
              <th className="py-3 px-5 font-semibold">Key</th>
              <th className="py-3 px-5 font-semibold">Created</th>
              <th className="py-3 px-5 font-semibold">Status</th>
              <th className="py-3 px-5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {visibleKeys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  {keys.length === 0
                    ? 'No API keys found. Click "+ Link ERP / Create Key" to generate your first key.'
                    : "No active keys. Re-issue one, or show revoked below."}
                </td>
              </tr>
            ) : (
              visibleKeys.map((k) => {
                const isActive = k.status.toLowerCase() === "active";
                const raw = secretFor(k);
                const show = !!revealed[k.id];
                const menuOpen = openMenuId === k.id;
                return (
                  <tr key={k.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-3.5 px-5 text-white font-semibold font-sans">
                      {k.name}
                    </td>
                    <td className="py-3.5 px-5">
                      {raw ? (

                        <div className="flex items-center gap-1.5 max-w-[300px]">

                          <code

                            className="flex-1 truncate bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[#c9a0ff] text-xs font-mono"

                            title={show ? raw : undefined}

                          >

                            {show ? raw : maskedFor(k)}

                          </code>

                          <button

                            onClick={() => setRevealed((v) => ({ ...v, [k.id]: !v[k.id] }))}

                            className="text-zinc-500 hover:text-white transition-colors p-1"

                            title={show ? "Hide" : "Reveal full key"}

                            aria-label={show ? "Hide key" : "Reveal key"}

                          >

                            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}

                          </button>

                          <button

                            onClick={() => copySecret(k)}

                            className="text-zinc-500 hover:text-white transition-colors p-1"

                            title="Copy full key"

                            aria-label="Copy full key"

                          >

                            {copiedId === k.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}

                          </button>

                        </div>

                      ) : (

                        <span className="inline-block font-mono text-xs bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-zinc-500">

                          {k.prefix}

                        </span>

                      )}
                    </td>
                    <td className="py-3.5 px-5 text-zinc-400 font-sans">
                      {k.created_at || "Sep 12, 2026"}
                    </td>
                    <td className="py-3.5 px-5">
                      {isActive ? (
                        <Badge variant="success" className="font-mono">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-zinc-500">Revoked</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-sans">
                      {isActive ? (
                        <div className="relative inline-block">
                          <button
                            onClick={() => setOpenMenuId(menuOpen ? null : k.id)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                            title="Key actions"
                            aria-label={`Actions for ${k.name}`}
                            aria-expanded={menuOpen}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {menuOpen && (
                            <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl animate-in fade-in zoom-in-95">
                              <button
                                onClick={() => onMenuAction("copy", k)}
                                disabled={!raw}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Copy className="w-3.5 h-3.5" /> Copy key
                              </button>
                              <button
                                onClick={() => onMenuAction("reveal", k)}
                                disabled={!raw}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                {show ? "Hide key" : "Reveal key"}
                              </button>
                              <button
                                onClick={() => onMenuAction("reissue", k)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06]"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-[#c9a0ff]" /> Re-issue
                              </button>
                              <button
                                onClick={() => onMenuAction("revoke", k)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Revoke
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs font-mono">Revoked</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-bold mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>Revoke &quot;{revokeTarget.name}&quot;?</span>
            </div>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              This key will immediately stop working everywhere it is used.
            </p>
            {!secretFor(revokeTarget) && (
              <p className="text-[11px] text-amber-300/90 mb-4">
                No live secret for this row — confirming will connect first, then revoke.
              </p>
            )}
            {revokeError && (
              <div className="p-2.5 mb-4 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {revokeError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={isRevoking}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRevoke}
                disabled={isRevoking}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
              >
                {isRevoking ? "Revoking..." : "Revoke key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {keys.length === 0 && (
        <div className="hidden">
          <Key className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
