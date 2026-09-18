"use client";

import { useState, useEffect, useMemo } from "react";
import { loginOrSignupErp } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { RotateCw, ShieldCheck, X } from "lucide-react";

interface ReissueTarget {
  id: string;
  name: string;
}

interface ErpLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyCreated: (key: string, name: string, backendId?: string) => void;
  reissueTarget?: ReissueTarget | null;
  defaultMode?: "signup" | "login";
}

export function ErpLinkModal({ isOpen, onClose, onKeyCreated, reissueTarget, defaultMode = "signup" }: ErpLinkModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const [erpId, setErpId] = useState("");
  const [erpPassword, setErpPassword] = useState("");
  const [name, setName] = useState("My Laptop");
  const [isSignup, setIsSignup] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(reissueTarget ? reissueTarget.name : "My Laptop");
    setIsSignup(reissueTarget ? false : defaultMode !== "login");
    setError(null);
  }, [reissueTarget, isOpen, defaultMode]);

  if (!isOpen) return null;

  const isReissue = Boolean(reissueTarget);

  const ERP_ID_RE = /^\d{4}[a-z]+\d+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setError("Please sign in first, then generate a key.");
      return;
    }
    const id = erpId.trim().toLowerCase();
    if (!id || !erpPassword.trim()) {
      setError("Please enter your ERP ID and password.");
      return;
    }
    if (!ERP_ID_RE.test(id)) {
      setError("ERP ID looks like 2023bcs084 — year, branch code, then number. No email needed.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const useSignup = reissueTarget ? false : isSignup;
      const response = await loginOrSignupErp(
        {
          erpId: id,
          erpPassword: erpPassword.trim(),
          name: name.trim() || "My Laptop",
        },
        useSignup
      );

      onKeyCreated(response.key, name.trim() || "My Laptop", response.id != null ? String(response.id) : undefined);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate key. Please check your credentials.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#09090b]/70 backdrop-blur-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-5">
          <h3 className="text-base font-medium text-white tracking-tight">
            {isReissue ? "Re-issue key" : "Get API key"}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isReissue && (
            <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-zinc-300">
              Re-issuing <span className="text-white font-medium">{reissueTarget!.name}</span>. The new secret is shown once.
            </div>
          )}

          {!isReissue && (
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-full p-1 border border-white/[0.06] w-fit text-xs">
              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className={`px-3 py-1 rounded-full transition-all ${isSignup ? "bg-white text-zinc-950 font-semibold" : "text-zinc-500 hover:text-white"}`}
              >
                New account
              </button>
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className={`px-3 py-1 rounded-full transition-all ${!isSignup ? "bg-white text-zinc-950 font-semibold" : "text-zinc-500 hover:text-white"}`}
              >
                Existing
              </button>
            </div>
          )}

          <p className="text-xs text-zinc-500 leading-relaxed">
            Your college ERP password is used for one-time credential verification. It is{" "}
            <span className="text-zinc-200 font-medium">never saved</span> or stored on any server.
          </p>

          {error && (
            <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-500">ERP ID</label>
            <input
              value={erpId}
              onChange={(e) => setErpId(e.target.value)}
              placeholder="e.g. 2023bcs084"
              required
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-500">ERP Password</label>
            <input
              type="password"
              value={erpPassword}
              onChange={(e) => setErpPassword(e.target.value)}
              placeholder="Your college ERP password"
              required
              className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-500">Key name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Laptop, Claude Desktop"
              required
              className="w-full h-10 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-white/20 focus:bg-white/[0.04] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-[#c9a0ff] shrink-0" />
            <span>Read-only access. Secret shown strictly once upon creation.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-sm px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="text-sm px-4 py-2 rounded-lg bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? "Generating…" : isReissue ? "Re-issue key" : "Create API key →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
