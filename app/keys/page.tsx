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
import { createClient } from "@/lib/supabase/client";
import { Plus, User as UserIcon } from "lucide-react";

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
    const hex = key.slice(-2);
    const prefix = `axis_••••${hex}`;

    // Save only the hash to Supabase — never the raw secret
    if (user) {
      const keyHash = await hashKey(key);
      await supabase.from("api_keys").insert({
        user_id: user.id,
        name,
        key_prefix: prefix,
        key_hash: keyHash,
        status: "active",
      });
    }

    const newKey: ApiKeyItem = {
      id: `key_${Date.now()}`, name, prefix,
      created_at: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      status: "active", lastChars: hex,
    };
    const updated = [newKey, ...keys];
    setKeys(updated);
    if (typeof window !== "undefined") localStorage.setItem("axiserp_keys_metadata", JSON.stringify(updated));
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

          <MyKeysTable keys={keys} onKeysUpdated={setKeys} onRequestReissue={(t: ApiKeyItem) => { setReissueKeyTarget(t); setIsErpModalOpen(true); }} />
          <DangerZone onAccountForgotten={() => { setKeys([]); window.location.href = "/"; }} />
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
