"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MyKeysTable } from "@/components/MyKeysTable";
import { ErpLinkModal } from "@/components/ErpLinkModal";
import { KeyCreatedModal } from "@/components/KeyCreatedModal";
import { ApiKeyItem, KeySecretRow } from "@/lib/types";
import { listKeysFromBackend, normalizeBackendKey } from "@/lib/api";
import { keyGenGate } from "@/lib/keyGate";
import { createClient } from "@/lib/supabase/client";
import { Plus, AlertTriangle } from "lucide-react";

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
  /** Raw secrets restored from key_secrets, keyed by key_hash. Memory only — never persisted. */
  const [rowSecrets, setRowSecrets] = useState<Record<string, string>>({});
  const [syncError, setSyncError] = useState<string | null>(null);

  const persistKeys = (rows: ApiKeyItem[]) => {
    setKeys(rows);
    if (typeof window !== "undefined") {
      localStorage.setItem("axiserp_keys_metadata", JSON.stringify(rows));
    }
  };

  /** Merge local rows with backend truth: attach real backend IDs + statuses, add backend-only rows.
   *  Backend rows carry no key preview, so local rows link by name (first unmatched wins);
   *  leftovers are appended as backend #id rows. */
  const reconcileWithBackend = async (
    rawKey: string,
    base: ApiKeyItem[]
  ): Promise<{ rows: ApiKeyItem[]; error: string | null }> => {
    try {
      const normalized = (await listKeysFromBackend(rawKey)).map(normalizeBackendKey);
      const taken = new Set<string>();
      const merged = base.map((row) => {
        if (row.backendId) return row;
        // Match by backendId first (if local row already has one), then by keyHash,
        // then by name as last resort. This prevents duplicate-name collisions.
        const match = normalized.find((b) => {
          if (taken.has(b.backendId as string)) return false;
          if (row.backendId && b.backendId === row.backendId) return true;
          if (row.keyHash && b.keyHash === row.keyHash) return true;
          return b.name.toLowerCase() === row.name.toLowerCase();
        });
        if (match) {
          taken.add(match.backendId as string);
          return { ...row, backendId: match.backendId, status: match.status, created_at: match.created_at };
        }
        return row;
      });
      const known = new Set(merged.map((r) => r.backendId).filter(Boolean));
      const backendOnly = normalized.filter((b) => !known.has(b.backendId));
      return { rows: [...backendOnly, ...merged], error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Backend sync failed.";
      return { rows: base, error: message };
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
        setRowSecrets({});
        return;
      }
      if (user) setUser(user);
      // 2. Paint instantly from local cache — no network wait (signed-in only).
      loadLocalKeys();
      // Fetch key metadata from Supabase (capped — table can grow large)
      const { data: dbKeys } = await supabase
        .from("api_keys")
        .select("id,name,key_prefix,key_hash,backend_id,created_at,status")
        .order("created_at", { ascending: false })
        .limit(50);

      interface DbKeyRow {
        id: string | number;
        name: string;
        key_prefix: string;
        key_hash: string;
        backend_id?: string | number | null;
        created_at: string;
        status: ApiKeyItem["status"];
      }
      let rows: ApiKeyItem[] = ((dbKeys ?? []) as DbKeyRow[]).map((k) => ({
        id: k.id.toString(),
        name: k.name,
        prefix: k.key_prefix,
        created_at: new Date(k.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: k.status,
        lastChars: k.key_prefix.slice(-2),
        keyHash: k.key_hash,
        backendId: k.backend_id != null
          ? String(k.backend_id)
          : undefined,
      }));
      if (rows.length > 0) {
        setKeys(rows);
        if (typeof window !== "undefined") {
          localStorage.setItem("axiserp_keys_metadata", JSON.stringify(rows));
        }
      }
      // 3. Load every stored secret for this user. No probing, no pruning —
      // a stored secret is shown until the key is revoked (which deletes it).
      const { data: secrets, error: secretsError } = await supabase
        .from("key_secrets")
        .select("key_hash,raw_key,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (secretsError) {
        setSyncError(
          secretsError.code === "42P01"
            ? "Secret store unreachable (table missing). Run supabase/key_secrets.sql in your Supabase SQL editor, then reload."
            : `Secret store unreachable: ${secretsError.message}. Check the key_secrets RLS policies.`
        );
        return;
      }
      const loaded: Record<string, string> = {};
      for (const s of (secrets ?? []) as KeySecretRow[]) {
        if (typeof s.raw_key === "string" && s.raw_key.length > 0) {
          loaded[s.key_hash] = s.raw_key;
        }
      }
      setRowSecrets(loaded);
      // Reconcile statuses with backend truth. Any stored key authenticates the read.
      const syncKey = Object.values(loaded)[0];
      if (syncKey) {
        const base = rows;
        const { rows: synced, error } = await reconcileWithBackend(syncKey, base);
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
        setRowSecrets({});
        setSyncError(null);
        if (typeof window !== "undefined") localStorage.removeItem("axiserp_keys_metadata");
      }
    });

    return () => { authListener?.subscription?.unsubscribe(); };
  }, [supabase]);

  const handleKeyCreated = async (key: string, name: string, backendId?: string) => {
    setCreatedKeyData({ key, name });
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
        ...(backendId ? { backend_id: backendId } : {}),
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
      { id: `key_${Date.now()}`, name, prefix, created_at: today, status: "active", lastChars: hex, keyHash, backendId },
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

          {user ? (
            <>
              <MyKeysTable
                keys={keys}
                onKeysUpdated={persistKeys}
                onRequestReissue={(t: ApiKeyItem) => openKeyModal(t)}
                rowSecrets={rowSecrets}
                onRevokeSucceeded={handleRevokeSucceeded}
              />
              {syncError && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4 flex items-start gap-2 text-xs text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {syncError}
                </div>
              )}
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
