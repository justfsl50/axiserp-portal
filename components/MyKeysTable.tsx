"use client";

import { useState } from "react";
import { ApiKeyItem } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { deleteKey } from "@/lib/api";
import { Key, RotateCw, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";

interface MyKeysTableProps {
  keys: ApiKeyItem[];
  onKeysUpdated: (newKeys: ApiKeyItem[]) => void;
  onRequestReissue: (key: ApiKeyItem) => void;
  /** Live raw session key (memory-only). Without it, backend revoke is impossible. */
  sessionKey: string | null;
  onNeedSessionKey: () => void;
  onRevokeSucceeded?: (row: ApiKeyItem) => void;
}

export function MyKeysTable({ keys, onKeysUpdated, onRequestReissue, sessionKey, onNeedSessionKey, onRevokeSucceeded }: MyKeysTableProps) {
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    if (!sessionKey) {
      // No live secret → cannot touch the backend. Reconnect instead of fake-revoking.
      setRevokeTarget(null);
      onNeedSessionKey();
      return;
    }
    setIsRevoking(true);
    setRevokeError(null);

    try {
      // Real backend revoke — uses the backend's key ID, never a local placeholder.
      await deleteKey(revokeTarget.backendId ?? revokeTarget.id, sessionKey);
      const updated = keys.map(k =>
        k.id === revokeTarget.id ? { ...k, status: "revoked" as const } : k
      );
      onKeysUpdated(updated);
      if (typeof window !== "undefined") {
        localStorage.setItem("axiserp_keys_metadata", JSON.stringify(updated));
      }
      onRevokeSucceeded?.(revokeTarget);
      setRevokeTarget(null);
    } catch (err: any) {
      setRevokeError(err?.message || "Failed to revoke key. It is still active.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-xl">
      <div className="p-5 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">MY API KEYS</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Metadata only. Secrets are hidden and stored as cryptographic hashes.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1.5 text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Active
          </span>
          <span className="flex items-center gap-1.5 text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-zinc-600" /> Revoked
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#c9a0ff]" /> Secret hidden
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-900/50 font-mono text-zinc-400">
              <th className="py-3 px-5 font-semibold">NAME</th>
              <th className="py-3 px-5 font-semibold">KEY PREFIX</th>
              <th className="py-3 px-5 font-semibold">CREATED</th>
              <th className="py-3 px-5 font-semibold">STATUS</th>
              <th className="py-3 px-5 font-semibold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {keys.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
                  No API keys found. Click &quot;+ Link ERP / Create Key&quot; to generate your first key.
                </td>
              </tr>
            ) : (
              keys.map((k) => {
                const isActive = k.status.toLowerCase() === "active";
                return (
                  <tr key={k.id} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="py-3.5 px-5 font-sans font-semibold text-white">
                      {k.name}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[#c9a0ff]">
                        {k.prefix || `ax_••••${k.lastChars || "91"}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-zinc-400 font-sans">
                      {k.created_at || "Sep 12, 2026"}
                    </td>
                    <td className="py-3.5 px-5">
                      {isActive ? (
                        <Badge variant="success" className="font-mono">● ACTIVE</Badge>
                      ) : (
                        <Badge variant="secondary" className="font-mono text-zinc-500">○ REVOKED</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-right font-sans">
                      {isActive ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onRequestReissue(k)}
                            className="text-xs h-7 px-2.5"
                          >
                            <RotateCw className="w-3 h-3 text-[#c9a0ff]" />
                            <span>Re-issue</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setRevokeTarget(k)}
                            className="text-xs h-7 px-2.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Revoke</span>
                          </Button>
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

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-bold mb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>REVOKE &quot;{revokeTarget.name}&quot;?</span>
            </div>
            <p className="text-xs text-zinc-300 mb-5 leading-relaxed">
              This key will immediately stop working. Any MCP servers, terminal dashboards, or custom applications using this key will lose access immediately.
            </p>
            {revokeError && (
              <div className="p-2.5 mb-4 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {revokeError}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setRevokeTarget(null)} disabled={isRevoking}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmRevoke} disabled={isRevoking}>
                {isRevoking ? "Revoking..." : "Revoke Key"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
