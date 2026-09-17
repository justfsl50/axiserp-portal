"use client";

import { useState, useEffect } from "react";
import { Copy, Check, CornerDownLeft } from "lucide-react";

type Screen = "menu" | "attendance" | "today" | "timetable" | "marks" | "inbox" | "profile" | "logout";

export function HeroTerminal() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [sel, setSel] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const menu = [
    { label: "My attendance", key: "s", screen: "attendance" as Screen, info: "80.9%" },
    { label: "Today's classes", key: "t", screen: "today" as Screen, info: "5 sessions" },
    { label: "Weekly timetable", key: "w", screen: "timetable" as Screen, info: "Mon–Fri" },
    { label: "My marks", key: "m", screen: "marks" as Screen, info: "SGPA 8.42" },
    { label: "Inbox", key: "i", screen: "inbox" as Screen, info: "0 dues" },
    { label: "Profile", key: "p", screen: "profile" as Screen, info: "2023BCS084" },
    { label: "Logout (wipe)", key: "o", screen: "logout" as Screen, info: "" },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      const k = e.key.toLowerCase();
      if (screen === "menu") {
        if (k === "arrowdown") { e.preventDefault(); setSel((p) => (p + 1) % menu.length); }
        else if (k === "arrowup") { e.preventDefault(); setSel((p) => (p - 1 + menu.length) % menu.length); }
        else if (k === "enter") { e.preventDefault(); setScreen(menu[sel].screen); }
        else { const m = menu.find((x) => x.key === k); if (m) { e.preventDefault(); setScreen(m.screen); } }
      } else if (k === "b" || k === "escape") { e.preventDefault(); setScreen("menu"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, sel]);

  const copy = (t: string, id: string) => { navigator.clipboard.writeText(t); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-[#0c0c0e]">
      {/* Header */}
      <div className="bg-[#0c0c0e] px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="text-zinc-600 text-xs font-mono ml-2">axis terminal</span>
        </div>
        <button onClick={() => copy("npx -y axiserp", "npx")} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-zinc-500 text-[13px] font-mono transition-all">
          <span className="text-emerald-400">$</span> npx -y axiserp
          {copied === "npx" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 min-h-[380px] flex flex-col justify-between font-mono text-xs">
        <div>
          {/* Logo */}
          <div className="text-center mb-5 select-none">
            <div className="text-zinc-500 text-xs font-bold tracking-widest mb-0.5">AXISMCP</div>
            <div className="text-zinc-600 text-[12px]">v1.1.2 · Secure ERP connector</div>
          </div>

          {/* Menu */}
          {screen === "menu" && (
            <div className="max-w-sm mx-auto space-y-1">
              {menu.map((opt, idx) => (
                <button
                  key={opt.key}
                  onClick={() => { setSel(idx); setScreen(opt.screen); }}
                  onMouseEnter={() => setSel(idx)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                    sel === idx ? "bg-white/[0.06] text-white" : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={sel === idx ? "text-emerald-400" : "text-zinc-700"}>&gt;</span>
                    {opt.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-zinc-600 text-[12px] hidden sm:inline">{opt.info}</span>
                    <span className="text-zinc-500 bg-white/[0.04] px-1.5 py-0.5 rounded text-[12px]">[{opt.key}]</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Attendance */}
          {screen === "attendance" && (
            <div className="max-w-md mx-auto rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-white/[0.04]">
                <span className="text-white font-bold">ATTENDANCE</span>
                <span className="text-emerald-400">80.95% SAFE</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[13px]">
                <div><div className="text-zinc-600">Present</div><div className="text-white text-lg font-bold">34</div></div>
                <div><div className="text-zinc-600">Absent</div><div className="text-red-400 text-lg font-bold">8</div></div>
                <div><div className="text-zinc-600">Total</div><div className="text-zinc-300 text-lg font-bold">42</div></div>
              </div>
              <div className="text-[13px] space-y-1 font-sans">
                <div className="flex justify-between py-1 border-b border-white/[0.03]"><span className="text-zinc-400">Cloud Computing</span><span className="text-zinc-300">88.6%</span></div>
                <div className="flex justify-between py-1 border-b border-white/[0.03]"><span className="text-zinc-400">AI</span><span className="text-red-400">75.8% (at risk)</span></div>
                <div className="flex justify-between py-1"><span className="text-zinc-400">Mini Project</span><span className="text-zinc-300">93.3%</span></div>
              </div>
              <div className="text-[13px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded p-2 text-center font-sans">
                3 safe bunks remaining
              </div>
            </div>
          )}

          {/* Today */}
          {screen === "today" && (
            <div className="max-w-md mx-auto rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 space-y-2">
              <div className="text-white font-bold text-xs pb-2 border-b border-white/[0.04]">TODAY — MONDAY</div>
              {[
                { t: "09:00", s: "Mini Project Lab", r: "Lab 3" },
                { t: "09:50", s: "Cloud Computing", r: "Room 204" },
                { t: "10:50", s: "Artificial Intelligence", r: "Room 301" },
              ].map((c, i) => (
                <div key={i} className="flex justify-between py-1.5 text-[13px] border-b border-white/[0.03]">
                  <span className="text-zinc-300"><span className="text-emerald-400 font-mono">{c.t}</span> {c.s}</span>
                  <span className="text-zinc-600">{c.r}</span>
                </div>
              ))}
            </div>
          )}

          {/* Timetable */}
          {screen === "timetable" && (
            <div className="max-w-md mx-auto rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 space-y-2">
              <div className="text-white font-bold text-xs pb-2 border-b border-white/[0.04]">TIMETABLE — B.Tech CSE Sem 7</div>
              <div className="text-[13px] space-y-1.5">
                <div className="text-zinc-300 font-bold">MONDAY</div>
                <div className="text-zinc-500 pl-2">09:00 Mini Project · 09:50 Cloud Computing · 10:50 AI</div>
                <div className="text-zinc-300 font-bold mt-2">TUESDAY</div>
                <div className="text-zinc-500 pl-2">09:00 AI · 09:50 Cloud Computing · 10:50 Renewable Energy</div>
              </div>
            </div>
          )}

          {/* Marks */}
          {screen === "marks" && (
            <div className="max-w-md mx-auto rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 space-y-2">
              <div className="flex justify-between text-xs pb-2 border-b border-white/[0.04]">
                <span className="text-white font-bold">MARKS</span><span className="text-zinc-300">SGPA 8.42</span>
              </div>
              {[
                { s: "Cloud Computing", g: "A+ (94%)" },
                { s: "AI", g: "A (84%)" },
                { s: "Mini Project", g: "O (94%)" },
              ].map((m, i) => (
                <div key={i} className="flex justify-between py-1 text-[13px] border-b border-white/[0.03] font-sans">
                  <span className="text-zinc-400">{m.s}</span><span className="text-zinc-300">{m.g}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inbox */}
          {screen === "inbox" && (
            <div className="max-w-md mx-auto rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 space-y-2">
              <div className="text-white font-bold text-xs pb-2 border-b border-white/[0.04]">INBOX</div>
              <div className="text-[13px] space-y-2 font-sans">
                <div className="p-2 rounded bg-white/[0.01] border border-white/[0.03]">
                  <div className="text-zinc-300">Practical Exam Schedule</div>
                  <div className="text-zinc-600 text-[12px]">Sep 12, 2026 · Exam Cell</div>
                </div>
                <div className="p-2 rounded bg-white/[0.01] border border-white/[0.03]">
                  <div className="text-zinc-300">Fee Cleared — ₹68,500</div>
                  <div className="text-zinc-600 text-[12px]">Receipt #84910</div>
                </div>
              </div>
            </div>
          )}

          {/* Profile */}
          {screen === "profile" && (
            <div className="max-w-sm mx-auto rounded-lg border border-white/[0.05] bg-white/[0.01] p-4 space-y-2">
              <div className="text-white font-bold text-xs pb-2 border-b border-white/[0.04]">PROFILE</div>
              {[
                ["Name", "Rahul Verma"],
                ["Roll", "2023BCS084"],
                ["Program", "B.Tech CSE (Sem 7)"],
                ["Mentor", "Dr. Avinash Kumar"],
              ].map(([k, v], i) => (
                <div key={i} className="flex justify-between py-1 text-[13px] border-b border-white/[0.03] font-sans">
                  <span className="text-zinc-600">{k}</span><span className="text-zinc-300">{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Logout */}
          {screen === "logout" && (
            <div className="max-w-sm mx-auto rounded-lg border border-red-500/20 bg-red-500/5 p-5 text-center space-y-2">
              <div className="text-red-400 font-bold text-sm">SESSION WIPED</div>
              <p className="text-zinc-500 text-xs font-sans">All tokens cleared.</p>
              <button onClick={() => setScreen("menu")} className="text-xs text-zinc-400 hover:text-white transition-colors">[Enter] Restart</button>
            </div>
          )}
        </div>

        {/* Hotkeys */}
        <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[12px] text-zinc-600">
          <div className="flex gap-3">
            {menu.slice(0, 5).map((o) => (
              <button key={o.key} onClick={() => setScreen(o.screen)} className={`hover:text-white transition-colors ${screen === o.screen ? "text-white" : ""}`}>
                [{o.key}]
              </button>
            ))}
          </div>
          {screen !== "menu" && (
            <button onClick={() => setScreen("menu")} className="text-zinc-500 hover:text-white flex items-center gap-1">
              [b] back <CornerDownLeft className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
