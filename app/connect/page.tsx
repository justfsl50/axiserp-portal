"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ConnectionSnippets } from "@/components/ConnectionSnippets";
import { fetchKeys } from "@/lib/api";
import { ApiKeyItem } from "@/lib/types";

export default function ConnectPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("axis_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys()
      .then((data) => {
        setKeys(data);
        const active = data.find((k) => k.status.toLowerCase() === "active");
        if (active) setSelectedKey(`axis_••••${active.lastChars || "––"}`);
      })
      .catch((err) => {
        setLoadError(err?.message || "Failed to load keys");
      });
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-5xl mx-auto px-4 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-white/[0.06]">
            <div>
              <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Integrations</p>
              <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">Connect</h1>
              <p className="text-xs text-zinc-500 mt-1 max-w-md">
                Copy-paste snippets for MCP, CLI, and REST.
              </p>
            </div>
            <Link href="/keys" className="text-xs text-zinc-500 hover:text-white transition-colors font-mono">
              Manage keys →
            </Link>
          </div>

          {/* Key selector */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">
              Using key:{" "}
              {keys.length === 0 && (
                <span className="text-zinc-600">(demo placeholder — create a key in My Keys)</span>
              )}
            </span>
            {loadError && <span className="text-red-400">{loadError}</span>}
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="bg-[#09090b] border border-white/[0.08] text-zinc-300 text-xs font-mono px-3 py-1.5 rounded-lg outline-none focus:border-white/20"
            >
              {keys.length === 0 ? (
                <option value={selectedKey}>demo key ({selectedKey.slice(0, 12)}…)</option>
              ) : (
                keys.map((k) => (
                  <option key={k.id} value={`axis_••••${k.lastChars || "––"}`}>
                    {k.name} ({k.prefix || `axis_••••${k.lastChars}`})
                  </option>
                ))
              )}
            </select>
          </div>

          <ConnectionSnippets apiKey={selectedKey} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
