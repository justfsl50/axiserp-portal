"use client";

import { useState } from "react";
import { Copy, Check, X } from "lucide-react";

interface KeyCreatedModalProps {
  apiKey: string;
  keyName: string;
  onClose: () => void;
}

export function KeyCreatedModal({ apiKey, keyName, onClose }: KeyCreatedModalProps) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [platform, setPlatform] = useState<"win" | "posix">("win");

  const copyText = async (text: string, which: "key" | "mcp") => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    if (which === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedMcp(true);
      setTimeout(() => setCopiedMcp(false), 2000);
    }
  };

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        axis: {
          command: platform === "win" ? "npx.cmd" : "npx",
          args:
            platform === "win"
              ? ["--package=axis-erp-mcp@1", "axis-erp-mcp"]
              : ["-y", "--package=axis-erp-mcp@1", "axis-erp-mcp"],
          env: {
            AXIS_API_KEY: apiKey,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/[0.08] bg-[#09090b]/70 backdrop-blur-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
          <h3 className="text-base font-medium text-white tracking-tight">Key created</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4">
          <span className="text-zinc-200 font-medium">{keyName}</span> is active. Copy the key now — it is shown once.
        </p>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-3">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">API key</span>
            <button
              onClick={() => copyText(apiKey, "key")}
              className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 hover:text-white transition-colors"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedKey ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="p-3 font-mono text-xs text-[#c9a0ff] break-all select-all">{apiKey}</p>
        </div>

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] overflow-hidden mb-5">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">MCP config</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {(["win", "posix"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={platform === p ? "text-white" : "text-zinc-600 hover:text-zinc-400"}
                  >
                    {p === "win" ? "Windows" : "macOS/Linux"}
                  </button>
                ))}
              </div>
              <button
                onClick={() => copyText(mcpConfig, "mcp")}
                className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors"
              >
                {copiedMcp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedMcp ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <pre className="p-3 font-mono text-[12px] text-zinc-300 overflow-x-auto whitespace-pre">{mcpConfig}</pre>
        </div>

        <button
          onClick={onClose}
          className="w-full text-sm py-2 rounded-lg bg-white text-zinc-950 font-medium hover:bg-zinc-200 transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
}
