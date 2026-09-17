"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { forgetAccount } from "@/lib/api";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DangerZoneProps {
  onAccountForgotten: () => void | Promise<void>;
  /** Live raw session key (memory-only). Without it, backend forget is impossible. */
  sessionKey: string | null;
  /** Stored raw secrets by key_hash (memory-only). Any one authorizes forget. */
  rowSecrets: Record<string, string>;
  onNeedSessionKey: () => void;
}

export function DangerZone({ onAccountForgotten, sessionKey, rowSecrets, onNeedSessionKey }: DangerZoneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [forgetError, setForgetError] = useState<string | null>(null);

  const handleForget = async () => {
    if (confirmInput.trim() !== "FORGET") return;
    // Any stored live secret authorizes the backend forget (session key preferred).
    const liveSecret = sessionKey ?? Object.values(rowSecrets)[0] ?? null;
    if (!liveSecret) {
      // No live secret → cannot touch the backend. Reconnect instead of fake-forgetting.
      setIsOpen(false);
      setConfirmInput("");
      onNeedSessionKey();
      return;
    }
    setIsDeleting(true);
    setForgetError(null);

    try {
      // Real backend forget — invalidates every live key server-side.
      await forgetAccount(liveSecret);
      if (typeof window !== "undefined") {
        localStorage.removeItem("axiserp_keys_metadata");
        localStorage.removeItem("axiserp_supabase_user");
      }
      setIsOpen(false);
      await onAccountForgotten();
    } catch (err: any) {
      setForgetError(err?.message || "Failed to forget account. Nothing was deleted.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6">
      <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
        <span className="bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">DANGER ZONE</span>
        <span>FORGET AXISMCP ACCOUNT</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
        <div className="max-w-xl text-xs text-zinc-400 leading-relaxed">
          <p>
            Remove your AXISMCP connection and associated credentials. All generated API keys will be immediately purged and deactivated across connected MCP, CLI, and REST tools.
          </p>
          <p className="text-red-400/90 font-medium mt-1">⚠️ This action cannot be undone.</p>
        </div>

        <Button variant="danger" size="sm" onClick={() => setIsOpen(true)}>
          <Trash2 className="w-3.5 h-3.5" />
          <span>Forget account</span>
        </Button>
      </div>

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-red-500/40 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2 text-red-400 font-mono text-sm font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>FORGET ACCOUNT?</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              This will permanently purge your AXISMCP session and invalidate all active API keys.
            </p>

            {forgetError && (
              <div className="p-2.5 mb-4 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {forgetError}
              </div>
            )}

            <div className="space-y-2 mb-5">
              <label className="block text-xs font-mono text-zinc-400">
                Type <strong className="text-red-400 font-mono">FORGET</strong> to confirm:
              </label>
              <Input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="FORGET"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setIsOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={confirmInput.trim() !== "FORGET" || isDeleting}
                onClick={handleForget}
              >
                {isDeleting ? "Purging..." : "Forget account"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
