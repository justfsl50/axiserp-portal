"use client";

import { useEffect, useMemo, useState } from "react";
import { forgetAccount } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DangerZoneProps {
  /** Called only after the backend forget succeeded. */
  onAccountForgotten: () => void | Promise<void>;
}

/**
 * Irreversible account deletion.
 *
 * The backend requires a live API key to authorize the forget, so this
 * component reads one from the owner-only `key_secrets` table on open
 * (Row Level Security means only the signed-in owner's rows are visible)
 * instead of relying on a key being held in page state.
 */
export function DangerZone({ onAccountForgotten }: DangerZoneProps) {
  const supabase = useMemo(() => createClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [liveSecret, setLiveSecret] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [forgetError, setForgetError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsChecking(true);
    supabase
      .from("key_secrets")
      .select("raw_key")
      .limit(1)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setForgetError(`Could not load a key to authorize deletion: ${error.message}`);
          setLiveSecret(null);
        } else {
          const row = (data ?? [])[0] as { raw_key?: string } | undefined;
          setLiveSecret(row?.raw_key ?? null);
        }
        setIsChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  const handleForget = async () => {
    if (confirmInput.trim() !== "FORGET" || !liveSecret) return;
    setIsDeleting(true);
    setForgetError(null);

    try {
      // Real backend forget — invalidates every live key server-side.
      await forgetAccount(liveSecret);
      if (typeof window !== "undefined") {
        localStorage.removeItem("axiserp_keys_metadata");
      }
      setIsOpen(false);
      setConfirmInput("");
      await onAccountForgotten();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to forget account. Nothing was deleted.";
      setForgetError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setConfirmInput("");
    setForgetError(null);
  };
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/[0.02] p-6">
      <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
        <span className="bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">Danger zone</span>
        <span>Forget AXISMCP account</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-3">
        <p className="max-w-xl text-xs text-zinc-400 leading-relaxed">
          Removes your AXISMCP connection and every generated API key. All keys stop working
          immediately and your stored data is deleted. This cannot be undone.
        </p>

        <button
          onClick={() => setIsOpen(true)}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors"
        >
          <span className="inline-flex items-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Forget account
          </span>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#09090b]/80 backdrop-blur-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                <span>Forget account?</span>
              </div>
              <button onClick={close} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              This permanently purges your AXISMCP session and invalidates all active API keys.
            </p>

            {isChecking && (
              <p className="text-[11px] text-zinc-500 mb-4">Checking for a key to authorize…</p>
            )}
            {!isChecking && !liveSecret && (
              <p className="text-[11px] text-amber-300/90 mb-4">
                No stored key can authorize this. Create a key in My Keys first, then come back.
              </p>
            )}

            {forgetError && (
              <div className="p-2.5 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {forgetError}
              </div>
            )}

            <div className="space-y-2 mb-5">
              <label className="block text-xs text-zinc-500">
                Type <span className="text-red-400 font-medium">FORGET</span> to confirm
              </label>
              <input
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="FORGET"
                autoFocus
                className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={close}
                disabled={isDeleting}
                className="text-sm px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForget}
                disabled={confirmInput.trim() !== "FORGET" || isDeleting || isChecking || !liveSecret}
                className="text-sm px-4 py-2 rounded-lg bg-red-500/90 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {isDeleting ? "Purging…" : "Forget account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
