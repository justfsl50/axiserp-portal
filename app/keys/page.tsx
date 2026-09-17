"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyKeysTable } from "@/components/MyKeysTable";
import { DangerZone } from "@/components/DangerZone";
import { ErpLinkModal } from "@/components/ErpLinkModal";
import { KeyCreatedModal } from "@/components/KeyCreatedModal";
import { ApiKeyItem } from "@/lib/types";
import { listKeysFromBackend, normalizeBackendKey } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { Plus, User as UserIcon, RefreshCw, AlertTriangle } from "lucide-react";

/** SHA-256 hash of the raw key — only this is persisted server-side. */
async function hashKey(key: string): Promise<string> {
  const encoded = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function KeysPage() {
  const supabase = useMemo(() => createClient(), []);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<{ key: string; name: string } | null>(null);
  const [reissueKeyTarget, setReissueKeyTarget] = useState<ApiKeyItem | null>(null);
  /** Live raw session key — memory only, never persisted. Enables real backend CRUD this tab session. */
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const persistKeys = (rows: ApiKeyItem[]) => {
    setKeys(rows);
    if (typeof window !== "undefined") {
      localStorage.setItem("axiserp_keys_metadata", JSON.stringify(rows));
    }
  };

  /** Merge local rows with backend truth: attach real backend IDs + statuses, add backend-only rows. */
  const reconcileWithBackend = async (
    rawKey: string,
    base: ApiKeyItem[]
  ): Promise<{ rows: ApiKeyItem[]; error: string | null }> => {
    try {
      const normalized = (await listKeysFromBackend(rawKey)).map(normalizeBackendKey);
      const merged = base.map((row) => {
        const match = normalized.find(
          (b) =>
            b.name.toLowerCase() === row.name.toLowerCase() &&
            row.lastChars &&
            b.lastChars === row.lastChars
        );
        return match ? { ...row, backendId: match.backendId, status: match.status } : row;
      });
      const known = new Set(merged.map((r) => r.backendId).filter(Boolean));
      const backendOnly = normalized.filter((b) => !known.has(b.backendId));
      return { rows: [...backendOnly, ...merged], error: null };
    } catch (err: any) {
      return { rows: base, error: err?.message || "Backend sync failed." };
    }
  };

  // Load user and keys from Supabase
  useEffect(() => {
    const loadLocalKeys = () => {
      if (typeof window !== "undefined") {
        const local = localStorage.getItem("axiserp_keys_metadata");
        if (local) {
          try {
            setKeys(JSON.parse(local));
          } catch {
            setKeys([]);
          }
        } else {
          setKeys([]);
        }
      }
    };

    const loadData = async () => {
      // 1. Paint instantly from local cache — no network wait.
      loadLocalKeys();
      // 2. Fast session read first, then validate in background.
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      if (sessionUser) setUser(sessionUser);
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveUser = user ?? sessionUser;
      if (effectiveUser) {
        if (user) setUser(user);
        // Fetch keys from Supabase (capped — table can grow large)
        const { data: dbKeys } = await supabase
          .from("api_keys")
          .select("id,name,key_prefix,created_at,status")
          .order("created_at", { ascending: false })
          .limit(50);

        if (dbKeys && dbKeys.length > 0) {
          const mapped = dbKeys.map((k: any) => ({
            id: k.id.toString(),
            name: k.name,
            prefix: k.key_prefix,
            created_at: new Date(k.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            status: k.status,
            lastChars: k.key_prefix.slice(-2),
          }));
          setKeys(mapped);
          if (typeof window !== "undefined") {
            localStorage.setItem("axiserp_keys_metadata", JSON.stringify(mapped));
          }
        }
      }
    };

    loadData();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => { authListener?.subscription?.unsubscribe(); };
  }, [supabase]);

  const handleKeyCreated = async (key: string, name: string) => {
    setCreatedKeyData({ key, name });
    setSessionKey(key); // memory only — never persisted. Enables real backend CRUD this tab session.
    setSyncError(null);
    const keyHash = await hashKey(key);
    const hex = key.slice(-2);
    const prefix = `axis_••••${hex}`;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // 1. Persist metadata (hash only — never the raw secret). Surface failures loudly.
    if (user) {
      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name,
        key_prefix: prefix,
        key_hash: keyHash,
        status: "active",
      });
      if (error) {
        setSyncError(`Saved locally, but Supabase rejected the row: ${error.message}. Check the api_keys RLS policies.`);
      }
    }

    // 2. Reconcile with backend truth using the fresh raw key (real IDs + statuses).
    const rows: ApiKeyItem[] = [
      { id: `key_${Date.now()}`, name, prefix, created_at: today, status: "active", lastChars: hex, keyHash },
      ...keys,
    ];
    const { rows: synced, error } = await reconcileWithBackend(key, rows);
    if (error) {
      setSyncError((prev) =>
        prev
          ? `${prev} Backend sync also failed: ${error}`
          : `Saved, but backend sync failed: ${error}. The key itself is live — it will reconcile on next sync.`
      );
    }
    persistKeys(synced);
  };

  /** After a successful backend revoke, mirror the status into our Supabase row (matched by hash). */
  const handleRevokeSucceeded = async (row: ApiKeyItem) => {
    if (user && row.keyHash) {
      const { error } = await supabase
        .from("api_keys")
        .update({ status: "revoked" })
        .eq("key_hash", row.keyHash);
      if (error) {
        setSyncError(`Backend revoked the key, but the Supabase status update failed: ${error.message}`);
      }
    }
  };

  const handleAccountForgotten = async () => {
    // Best-effort Supabase cleanup — backend forget already succeeded at this point.
    if (user) {
      await supabase.from("api_keys").delete().eq("user_id", user.id);
    }
    persistKeys([]);
    if (typeof window !== "undefined") localStorage.removeItem("axiserp_keys_metadata");
    window.location.href = "/";
  };

  const openReconnect = () => {
    setReissueKeyTarget(null);
    setIsErpModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onOpenErpModal={() => setIsErpModalOpen(true)} />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Developer Console</p>
              <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">My API Keys</h1>
              <p className="text-xs text-zinc-500 mt-1 max-w-md">Create, monitor, and revoke API credentials.</p>
            </div>
            <button
              onClick={() => setIsErpModalOpen(true)}
              className="bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Key
            </button>
          </div>

          {/* Account */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/[0.06] text-white font-bold flex items-center justify-center text-sm">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                ) : user?.email?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4 text-zinc-500" />}
              </div>
              <div>
                <p className="text-zinc-200 font-medium">{user?.user_metadata?.full_name || (user ? "Student" : "Guest")}</p>
                <p className="text-zinc-600 font-mono text-[13px]">{user ? user.email : "Sign in to sync keys across devices"}</p>
              </div>
            </div>
            {!user && <Link href="/signin" className="text-xs text-zinc-400 hover:text-white transition-colors">Sign In →</Link>}
          </div>

          <MyKeysTable
            keys={keys}
            onKeysUpdated={persistKeys}
            onRequestReissue={(t: ApiKeyItem) => { setReissueKeyTarget(t); setIsErpModalOpen(true); }}
            sessionKey={sessionKey}
            onNeedSessionKey={openReconnect}
            onRevokeSucceeded={handleRevokeSucceeded}
          />
          {syncError && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {syncError}
            </div>
          )}
          {keys.length > 0 && !sessionKey && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-zinc-500">
                Viewing saved metadata. Link ERP <strong className="text-zinc-300">Existing</strong> to manage live server keys.
              </span>
              <button
                onClick={openReconnect}
                className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reconnect
              </button>
            </div>
          )}
          <DangerZone
            sessionKey={sessionKey}
            onNeedSessionKey={openReconnect}
            onAccountForgotten={handleAccountForgotten}
          />
        </div>
      </main>

      <Footer />

      <ErpLinkModal
        isOpen={isErpModalOpen}
        onClose={() => { setIsErpModalOpen(false); setReissueKeyTarget(null); }}
        onKeyCreated={handleKeyCreated}
        reissueTarget={reissueKeyTarget}
      />
      {createdKeyData && <KeyCreatedModal apiKey={createdKeyData.key} keyName={createdKeyData.name} onClose={() => setCreatedKeyData(null)} />}
    </div>
  );
}
