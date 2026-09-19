"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DangerZone } from "@/components/DangerZone";
import { createClient } from "@/lib/supabase/client";
import { User as UserIcon, LogOut, Key } from "lucide-react";
import { useEffect } from "react";

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data?.session?.user) {
        router.push("/signin?next=%2Fsettings");
        return;
      }
      setUser(data.session.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.push("/signin?next=%2Fsettings");
    });
    return () => listener?.subscription?.unsubscribe();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("axiserp_keys_metadata");
    router.push("/");
  };

  const handleAccountForgotten = async () => {
    // Backend forget already succeeded. Purge our own rows too — scoped to the
    // signed-in user by RLS, so this can only ever delete the caller's data.
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (uid) {
      await supabase.from("key_secrets").delete().eq("user_id", uid);
      await supabase.from("api_keys").delete().eq("user_id", uid);
    }
    await supabase.auth.signOut();
    if (typeof window !== "undefined") localStorage.removeItem("axiserp_keys_metadata");
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 space-y-8">
          <div className="pb-6 border-b border-white/[0.06]">
            <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Account</p>
            <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">Settings</h1>
            <p className="text-xs text-zinc-500 mt-1">Profile, sessions, and danger zone.</p>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center gap-3 text-xs">
            <div className="w-9 h-9 rounded-full bg-white/[0.06] text-white font-bold flex items-center justify-center text-sm">
              {user?.user_metadata?.avatar_url ? (
                // Avatar URLs are user-provided and may come from any host; keep the
                // native image element rather than restricting or proxying providers.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full" />
              ) : user?.email?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4 text-zinc-500" />}
            </div>
            <div className="flex-1">
              <p className="text-zinc-200 font-medium">{user?.user_metadata?.full_name || (user ? "Student" : "…")}</p>
              <p className="text-zinc-600 font-mono text-[13px]">{user ? user.email : "Loading…"}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>

          <Link
            href="/keys"
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-center justify-between gap-3 text-xs hover:bg-white/[0.04] transition-colors"
          >
            <span className="flex items-center gap-2 text-zinc-300">
              <Key className="w-3.5 h-3.5" /> Manage API keys
            </span>
            <span className="text-zinc-600">→</span>
          </Link>

          <DangerZone onAccountForgotten={handleAccountForgotten} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
