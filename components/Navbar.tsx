"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Key, Plug, ChevronDown } from "lucide-react";

interface NavbarProps {
  onOpenErpModal?: () => void;
}

export function Navbar({ onOpenErpModal }: NavbarProps) {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Fast: getSession reads local storage, no network. Renders instantly.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data?.session?.user) setUser(data.session.user);
    });
    // Background revalidation (network) — corrects stale sessions silently.
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data?.user) setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsDropdownOpen(false);
  };

  const navLinks = [
    { href: "/", label: "Overview" },
    { href: "/keys", label: "My Keys" },
    { href: "/connect", label: "Connect" },
    { href: "/docs", label: "Docs" },
  ];

  return (
    <header className="fixed top-4 left-0 right-0 z-50 px-4 max-w-5xl mx-auto w-full">
      <nav className="bg-[#09090b]/60 backdrop-blur-2xl rounded-full px-4 sm:px-6 py-2.5 flex items-center justify-between border border-white/[0.06]">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-uber text-sm tracking-tight text-white">AXIS<span className="text-zinc-500">MCP</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5 bg-white/[0.03] rounded-full p-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1 rounded-full text-xs font-arial-bold transition-all ${
                pathname === link.href
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] rounded-full py-1.5 px-3 text-xs text-zinc-300 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-white/10 text-white font-bold flex items-center justify-center text-[12px]">
                  {(user.email?.[0] || "U").toUpperCase()}
                </div>
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/[0.06] bg-[#0c0c0e]/95 backdrop-blur-2xl shadow-2xl p-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-white/[0.05] mb-1">
                    <p className="font-medium text-white truncate">{user.user_metadata?.full_name || "Student"}</p>
                    <p className="text-zinc-500 truncate text-[13px] font-mono">{user.email}</p>
                  </div>
                  <Link href="/keys" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <Key className="w-3.5 h-3.5" /> My Keys
                  </Link>
                  <Link href="/connect" onClick={() => setIsDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                    <Plug className="w-3.5 h-3.5" /> Connect
                  </Link>
                  <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg mt-1 border-t border-white/[0.04] transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/signin" className="text-xs text-zinc-500 hover:text-white transition-colors">Sign In</Link>
          )}

          <button
            onClick={onOpenErpModal || (() => window.location.href = "/keys")}
            className="bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-xs px-4 py-1.5 rounded-full transition-all"
          >
            Get Key
          </button>
        </div>
      </nav>
    </header>
  );
}
