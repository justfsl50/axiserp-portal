"use client";

import { useState } from "react";
import { Copy, Check, Bot, Shield } from "lucide-react";

interface ToolInfo {
  name: string;
  prompt: string;
  output: Record<string, any>;
}

const TOOLS: ToolInfo[] = [
  { name: "profile", prompt: "Who am I registered as?", output: { account: "2023BCS084", name: "Rahul Verma", program: "B.Tech CSE", semester: 7 } },
  { name: "today", prompt: "What classes do I have today?", output: { date: "Monday", classes: [{ time: "09:00", subject: "Mini Project Lab", room: "Lab 3" }, { time: "09:50", subject: "Cloud Computing", room: "Room 204" }] } },
  { name: "attendance", prompt: "Can I skip class tomorrow?", output: { percentage: 80.95, status: "SAFE", safe_bunks: 3 } },
  { name: "timetable", prompt: "Show my weekly schedule", output: { monday: ["09:00 Mini Project", "09:50 Cloud Computing", "10:50 AI"], tuesday: ["09:00 AI", "09:50 Cloud Computing"] } },
  { name: "exam_results", prompt: "What was my SGPA?", output: { sgpa: 8.42, subjects: [{ name: "Cloud Computing", grade: "A+" }, { name: "AI", grade: "A" }] } },
  { name: "inbox", prompt: "Any pending notices?", output: { dues: 0, notices: [{ title: "Practical Exam Schedule", date: "Sep 12" }] } },
];

export function McpShowcase({ activeKey = "axis_..." }: { activeKey?: string }) {
  const [active, setActive] = useState<ToolInfo>(TOOLS[2]);
  const [platform, setPlatform] = useState<"win" | "posix">("win");
  const [copied, setCopied] = useState(false);

  const config = {
    mcpServers: {
      axis: {
        command: platform === "win" ? "npx.cmd" : "npx",
        args: platform === "win" ? ["--package=axis-erp-mcp@1", "axis-erp-mcp"] : ["-y", "--package=axis-erp-mcp@1", "axis-erp-mcp"],
        env: { AXIS_API_KEY: activeKey }
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-4">
        <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">MCP Integration</p>
        <h2 className="text-2xl sm:text-4xl font-uber uppercase tracking-tight text-white">
          Ask your AI about college
        </h2>
        <p className="text-xs text-zinc-500 max-w-md mx-auto">
          6 tools for Claude Desktop, Cursor, Zed, and Windsurf. Just paste the config.
        </p>
      </div>

      {/* Tool pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {TOOLS.map((t) => (
          <button
            key={t.name}
            onClick={() => setActive(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
              active.name === t.name
                ? "bg-white text-zinc-900 font-bold"
                : "bg-white/[0.04] text-zinc-500 hover:text-white border border-white/[0.06]"
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-4">
          <p className="text-[12px] font-mono text-zinc-500 uppercase tracking-wider">You ask</p>
          <p className="text-sm text-zinc-200">&quot;{active.prompt}&quot;</p>
          <div className="text-[12px] text-zinc-600 font-mono flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Read-only. Zero write capability.
          </div>
        </div>

        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-mono text-zinc-500 uppercase tracking-wider">Response</p>
            <span className="text-[12px] font-mono text-emerald-400">200 OK</span>
          </div>
          <pre className="text-[13px] font-mono text-zinc-400 overflow-x-auto leading-relaxed">
{JSON.stringify(active.output, null, 2)}
          </pre>
        </div>
      </div>

      {/* Config copy */}
      <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-mono text-zinc-500 uppercase tracking-wider">mcp.json config</p>
            <div className="flex gap-1">
              {(["win", "posix"] as const).map((p) => (
                <button key={p} onClick={() => setPlatform(p)} className={`text-[12px] font-mono px-2 py-0.5 rounded transition-all ${platform === p ? "bg-white/[0.08] text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
                  {p === "win" ? "Windows" : "macOS/Linux"}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(JSON.stringify(config, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="text-[13px] font-mono text-zinc-500 overflow-x-auto">
{JSON.stringify(config, null, 2)}
        </pre>
      </div>
    </div>
  );
}
