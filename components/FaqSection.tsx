"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQ = [
  { q: "Why did you build this?", a: "The official ERP portal takes 45 seconds to load, crashes on mobile, and requires 6 clicks to check if you can skip class. We built a 24ms API layer." },
  { q: "Is this official?", a: "No. Student-built, read-only. Zero capability to modify grades or attendance." },
  { q: "Is my password safe?", a: "Yes. Used once over HTTPS to authenticate, then immediately discarded. Never written to disk or logs." },
  { q: "Why show-once keys?", a: "Industry standard (Stripe, GitHub). The raw secret is hashed on creation. Lost it? Click Re-issue." },
  { q: "Safe on lab computers?", a: "Yes. Run `axis -- --once` — wipes all tokens when you quit." },
  { q: "How to connect to Claude/Cursor?", a: "Copy the mcp.json config from the MCP section, paste into your AI client config, restart. Done." },
];

export function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2 mb-8">
        <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">FAQ</p>
        <h3 className="text-2xl sm:text-3xl font-uber uppercase text-white tracking-tight">
          Common Questions
        </h3>
      </div>

      <div className="space-y-1">
        {FAQ.map((item, idx) => (
          <div key={idx} className="rounded-xl overflow-hidden border border-white/[0.04] transition-all">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full p-4 text-left flex items-center justify-between text-sm text-zinc-300 hover:text-white transition-colors"
            >
              <span>{item.q}</span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 ml-3 transition-transform duration-200 ${openIdx === idx ? "rotate-180" : ""}`} />
            </button>
            {openIdx === idx && (
              <div className="px-4 pb-4 text-xs text-zinc-500 leading-relaxed border-t border-white/[0.03]">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
