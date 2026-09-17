"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { loginOrSignupErp } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Lock, RotateCw, ShieldCheck, X } from "lucide-react";

interface ReissueTarget {
  id: string;
  name: string;
}

interface ErpLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyCreated: (key: string, name: string) => void;
  reissueTarget?: ReissueTarget | null;
  /** Which tab a fresh modal opens on — management reconnects use "login". */
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

  // Pre-fill the key name when re-issuing an existing key.
  // Re-issue always uses login (additional key with same name).
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
    // Key generation requires a signed-in user (Google / GitHub / email).
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
      // Signup = first key for a new account. Login = additional key for existing account.
      // Re-issue always uses login.
      const useSignup = reissueTarget ? false : isSignup;
      const response = await loginOrSignupErp(
        {
          erpId: id,
          erpPassword: erpPassword.trim(),
          name: name.trim() || "My Laptop",
        },
        useSignup
      );

      onKeyCreated(response.key, name.trim() || "My Laptop");
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to generate key. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
          <div className="flex items-center gap-2">
            {isReissue ? (
              <RotateCw className="w-4 h-4 text-[#c9a0ff]" />
            ) : (
              <Lock className="w-4 h-4 text-[#c9a0ff]" />
            )}
            <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">
              {isReissue ? "RE-ISSUE KEY" : "LINK ERP · GET API KEY"}
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isReissue && (
            <div className="p-2.5 rounded bg-[#c9a0ff]/10 border border-[#c9a0ff]/20 text-xs text-[#c9a0ff]">
              Re-issuing <strong>{reissueTarget!.name}</strong> via login. A new secret will be generated and shown once.
            </div>
          )}

          {!isReissue && (
            <div className="flex items-center gap-1 bg-white/[0.03] rounded-full p-1 border border-white/[0.06] w-fit text-xs">
              <button
                type="button"
                onClick={() => setIsSignup(true)}
                className={`px-3 py-1 rounded-full transition-all ${isSignup ? "bg-white text-zinc-900 font-semibold" : "text-zinc-500 hover:text-white"}`}
              >
                New account
              </button>
              <button
                type="button"
                onClick={() => setIsSignup(false)}
                className={`px-3 py-1 rounded-full transition-all ${!isSignup ? "bg-white text-zinc-900 font-semibold" : "text-zinc-500 hover:text-white"}`}
              >
                Existing
              </button>
            </div>
          )}

          <p className="text-xs text-zinc-400 leading-relaxed">
            Your college ERP password is used for one-time credential verification. It is{" "}
            <strong>never saved</strong> or stored on any server.
          </p>

          {error && (
            <div className="p-2.5 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block font-mono text-xs text-zinc-400 mb-1.5">ERP ID</label>
            <Input
              value={erpId}
              onChange={(e) => setErpId(e.target.value)}
              placeholder="e.g. 2023bcs084"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-zinc-400 mb-1.5">ERP Password</label>
            <Input
              type="password"
              value={erpPassword}
              onChange={(e) => setErpPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-zinc-400 mb-1.5">Key Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Laptop, Claude Desktop"
              required
            />
          </div>

          <div className="flex items-center gap-2 p-2.5 rounded bg-zinc-900/60 border border-zinc-800 text-[13px] text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-[#c9a0ff] shrink-0" />
            <span>Read-only access. Secret shown strictly once upon creation.</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isReissue ? "Re-issuing..." : "Generating Key..."
                : isReissue ? "RE-ISSUE KEY →" : "CREATE API KEY →"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
