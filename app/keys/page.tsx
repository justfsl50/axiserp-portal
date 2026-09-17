"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyKeysTable } from "@/components/MyKeysTable";
import { DangerZone } from "@/components/DangerZone";
import { ErpLinkModal } from "@/components/ErpLinkModal";
import { KeyCreatedModal } from "@/components/KeyCreatedModal";
import { ApiKeyItem, KeySecretRow } from "@/lib/types";
import { listKeysFromBackend, normalizeBackendKey, deleteKey } from "@/lib/api";
import { keyGenGate } from "@/lib/keyGate";
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
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [createdKeyData, setCreatedKeyData] = useState<{ key: string; name: string } | null>(null);
  const [reissueKeyTarget, setReissueKeyTarget] = useState<ApiKeyItem | null>(null);
  /** Which ERP tab the modal opens on — management reconnects land on Existing. */
  const [modalMode, setModalMode] = useState<"signup" | "login">("signup");
  /** Live raw session key — memory only, never persisted. Enables real backend CRUD this tab session. */
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  /** Raw secrets restored from key_secrets, keyed by key_hash. Memory only — never persisted. */
  const [rowSecrets, setRowSecrets] = useState<Record<string, string>>({});
  const [syncError, setSyncError] = useState<string | null>(null);
  /** Revoke confirmed while no live secret existed — auto-runs once a fresh key arrives. */
  const pendingRevokeRef = useRef<ApiKeyItem | null>(null);

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
      // 1. Auth first — signed-out users see NO keys, not even cached ones.
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUser = session?.user ?? null;
      if (sessionUser) setUser(sessionUser);
      const { data: { user } } = await supabase.auth.getUser();
      const effectiveUser = user ?? sessionUser;
      if (!effectiveUser) {
        setKeys([]);
        setSessionKey(null);
        setRowSecrets({});
        return;
      }
      if (user) setUser(user);
      // 2. Paint instantly from local cache — no network wait (signed-in only).
      loadLocalKeys();
      // Fetch key metadata from Supabase (capped — table can grow large)
      const { data: dbKeys } = await supabase
        .from("api_keys")
        .select("id,name,key_prefix,key_hash,created_at,status")
        .order("created_at", { ascending: false })
        .limit(50);

      let rows: ApiKeyItem[] = (dbKeys ?? []).map((k: any) => ({
        id: k.id.toString(),
        name: k.name,
        prefix: k.key_prefix,
        created_at: new Date(k.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: k.status,
        lastChars: k.key_prefix.slice(-2),
        keyHash: k.key_hash,
      }));
      if (rows.length > 0) {
        setKeys(rows);
        if (typeof window !== "undefined") {
          localStorage.setItem("axiserp_keys_metadata", JSON.stringify(rows));
        }
      }
      // 3. Restore a live session from stored secrets — CRUD works across reloads, no reconnect.
      const { data: secrets, error: secretsError } = await supabase
        .from("key_secrets")
        .select("key_hash,raw_key,created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (secretsError) {
        setSyncError(
          secretsError.code === "42P01"
            ? "Live-secret store unreachable (table missing). Run supabase/key_secrets.sql in your Supabase SQL editor, then reload."
            : `Live-secret store unreachable: ${secretsError.message}. Check the key_secrets RLS policies.`
        );
        return;
      }
      const usable = ((secrets ?? []) as KeySecretRow[]).filter(
        (s) => typeof s.raw_key === "string" && s.raw_key.length > 0
      );
      if (usable.length > 0) {
        const byHash: Record<string, string> = {};
        usable.forEach((s) => { byHash[s.key_hash] = s.raw_key; });
        setRowSecrets(byHash);
        const live = usable[0].raw_key;
        setSessionKey(live);
        // Reconcile with backend truth now that we hold a live secret.
        const { rows: synced, error } = await reconcileWithBackend(live, rows.length > 0 ? rows : keys);
        if (error) {
          setSyncError(`Backend sync failed: ${error}`);
        } else {
          persistKeys(synced);
        }
      }
    };

    loadData();

    // Auto-open the ERP modal after a sign-in redirect (?link=1), then clean the URL.
    if (typeof window !== "undefined" && window.location.search.includes("link=1")) {
      setReissueKeyTarget(null);
      setIsErpModalOpen(true);
      window.history.replaceState(null, "", window.location.pathname);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        // Signed out — wipe everything, including the cached rows (shared-machine privacy).
        setKeys([]);
        setSessionKey(null);
        setRowSecrets({});
        setSyncError(null);
        if (typeof window !== "undefined") localStorage.removeItem("axiserp_keys_metadata");
      }
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

    // 1. Persist metadata (hash only) + live secret (owner-RLS). Surface failures loudly.
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
      const { error: secretError } = await supabase.from("key_secrets").insert({
        key_hash: keyHash,
        raw_key: key,
        user_id: user.id,
      });
      if (secretError) {
        setSyncError((prev) =>
          prev
            ? `${prev} Secret store also failed: ${secretError.message}. Live CRUD will need reconnect after reload.`
            : `Key is live, but storing its secret failed: ${secretError.message}. Run the key_secrets migration. Live CRUD will need reconnect after reload.`
        );
      } else {
        setRowSecrets((prev) => ({ ...prev, [keyHash]: key }));
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
    let finalRows = synced;
    // Auto-complete a revoke that was confirmed before the live key existed.
    const pending = pendingRevokeRef.current;
    pendingRevokeRef.current = null;
    if (pending) {
      try {
        await deleteKey(pending.backendId ?? pending.id, key);
        finalRows = synced.map((r) =>
          r.id === pending.id ? { ...r, status: "revoked" as const } : r
        );
        await handleRevokeSucceeded(pending);
      } catch (err: any) {
        setSyncError(
          `Reconnected, but revoking "${pending.name}" failed: ${err?.message || "unknown error"}. It is still active — try Revoke again.`
        );
      }
    }
    persistKeys(finalRows);
  };

  /** After a successful backend revoke, mirror the status and drop the stored secret. */
  const handleRevokeSucceeded = async (row: ApiKeyItem) => {
    if (user && row.keyHash) {
      const { error } = await supabase
        .from("api_keys")
        .update({ status: "revoked" })
        .eq("key_hash", row.keyHash);
      if (error) {
        setSyncError(`Backend revoked the key, but the Supabase status update failed: ${error.message}`);
      }
      // A revoked secret is useless — don't hoard it.
      await supabase.from("key_secrets").delete().eq("key_hash", row.keyHash);
      setRowSecrets((prev) => {
        const next = { ...prev };
        delete next[row.keyHash as string];
        return next;
      });
    }
  };

  const handleAccountForgotten = async () => {
    // Best-effort Supabase cleanup — backend forget already succeeded at this point.
    if (user) {
      await supabase.from("key_secrets").delete().eq("user_id", user.id);
      await supabase.from("api_keys").delete().eq("user_id", user.id);
    }
    persistKeys([]);
    if (typeof window !== "undefined") localStorage.removeItem("axiserp_keys_metadata");
    window.location.href = "/";
  };

  /** Gated open: signed in → modal; signed out → sign-in with return. */
  const openKeyModal = async (target: ApiKeyItem | null, mode: "signup" | "login" = "signup") => {
    const dest = await keyGenGate(supabase, "/keys");
    if (dest) {
      router.push(dest);
      return;
    }
    setModalMode(mode);
    setReissueKeyTarget(target);
    setIsErpModalOpen(true);
  };

  const openReconnect = (forRow?: ApiKeyItem) => {
    // Management reconnect — open on the Existing tab, no accidental key minting.
    // If a revoke was pending, it auto-completes after the fresh key arrives.
    pendingRevokeRef.current = forRow ?? null;
    openKeyModal(null, "login");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onOpenErpModal={() => openKeyModal(null)} />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Developer Console</p>
              <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">My API Keys</h1>
              <p className="text-xs text-zinc-500 mt-1 max-w-md">Create, monitor, and revoke API credentials.</p>
            </div>
            <button
              onClick={() => openKeyModal(null)}
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

          {user ? (
            <>
              <MyKeysTable
                keys={keys}
                onKeysUpdated={persistKeys}
                onRequestReissue={(t: ApiKeyItem) => openKeyModal(t)}
                sessionKey={sessionKey}
                rowSecrets={rowSecrets}
                onNeedSessionKey={openReconnect}
                onRevokeSucceeded={handleRevokeSucceeded}
              />
              {syncError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {syncError}
                </div>
              )}
              {keys.length > 0 && !sessionKey && Object.keys(rowSecrets).length === 0 && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-zinc-500">
                    These rows have no stored secret (created before secret storage). Connect once via{" "}
                    <strong className="text-zinc-300">Existing</strong> to manage live server keys.
                  </span>
              <button
                onClick={() => openReconnect()}
                className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                    <RefreshCw className="w-3.5 h-3.5" /> Reconnect
                  </button>
                </div>
              )}
              <DangerZone
                sessionKey={sessionKey}
                rowSecrets={rowSecrets}
                onNeedSessionKey={openReconnect}
                onAccountForgotten={handleAccountForgotten}
              />
            </>
          ) : (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center space-y-3">
              <p className="text-zinc-300 text-sm font-medium">Sign in to view your API keys</p>
              <p className="text-zinc-600 text-xs max-w-sm mx-auto">
                Keys are private to your account. Sign in with Google, GitHub, or email to manage them.
              </p>
              <Link
                href="/signin?next=%2Fkeys&link=1"
                className="inline-block bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-xs px-5 py-2.5 rounded-lg transition-all"
              >
                Sign In →
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <ErpLinkModal
        isOpen={isErpModalOpen}
        onClose={() => { setIsErpModalOpen(false); setReissueKeyTarget(null); setModalMode("signup"); }}
        onKeyCreated={handleKeyCreated}
        reissueTarget={reissueKeyTarget}
        defaultMode={modalMode}
      />
      {createdKeyData && <KeyCreatedModal apiKey={createdKeyData.key} keyName={createdKeyData.name} onClose={() => setCreatedKeyData(null)} />}
    </div>
  );
}
