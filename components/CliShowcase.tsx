"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CliShowcase() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const commands = [
    { label: "Install", cmd: "npm i -g axiserp", desc: "Global CLI install" },
    { label: "Run", cmd: "axis", desc: "Interactive TUI dashboard" },
    { label: "Lab mode", cmd: "axis -- --once", desc: "Wipes session on quit" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-4">
        <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Terminal</p>
        <h2 className="text-2xl sm:text-4xl font-uber uppercase tracking-tight text-white">
          CLI &amp; TUI
        </h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          Check attendance, timetable, and marks directly from your terminal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {commands.map((item, idx) => (
          <div key={idx} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-arial-bold text-zinc-300">{item.label}</span>
              <span className="text-[12px] font-mono text-zinc-600">{item.desc}</span>
            </div>
            <div className="flex items-center justify-between bg-[#09090b] border border-white/[0.06] rounded-lg p-2.5 font-mono text-xs">
              <span className="text-zinc-300 select-all">{item.cmd}</span>
              <button onClick={() => copy(item.cmd, `cli_${idx}`)} className="text-zinc-600 hover:text-white ml-2 transition-colors">
                {copiedId === `cli_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
