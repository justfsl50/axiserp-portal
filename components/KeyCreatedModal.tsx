"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Copy, Check, AlertTriangle, X } from "lucide-react";

interface KeyCreatedModalProps {
  apiKey: string;
  keyName: string;
  onClose: () => void;
}

export function KeyCreatedModal({ apiKey, keyName, onClose }: KeyCreatedModalProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"mcp" | "cli" | "rest">("mcp");
  const [platform, setPlatform] = useState<"win" | "posix">("win");

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const cliCommand = `# 1. Install CLI\nnpm i -g axiserp\n\n# 2. Set key & launch\nexport AXIS_API_KEY="${apiKey}"\naxis`;
  const restCommand = `curl -s https://api.handlebid.lol/v1/keys \\\n  -H "X-API-Key: ${apiKey}"`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-xl border border-[#c9a0ff]/40 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-mono text-sm font-bold text-white tracking-wide uppercase">KEY CREATED · SHOWN ONCE</h3>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-3">
          Key for <strong>{keyName}</strong> is generated and active.
        </p>

        {/* Secret Key Display Box */}
        <div className="flex items-center justify-between p-3.5 rounded-lg bg-zinc-900 border border-[#c9a0ff]/50 mb-3 font-mono text-xs text-[#c9a0ff] break-all gap-2">
          <span>{apiKey}</span>
          <Button size="sm" onClick={handleCopy} className="shrink-0 font-sans">
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-950" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPY KEY</span>
              </>
            )}
          </Button>
        </div>

        {/* Warning Callout */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs text-amber-400 mb-5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Copy this now.</strong>
            <p className="text-zinc-400 text-[13px] mt-0.5">
              You will not be able to view this secret token again after closing this window.
            </p>
          </div>
        </div>

        {/* Prefilled Connection Snippets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-mono text-zinc-400 font-semibold uppercase">READY-TO-USE SNIPPETS</span>
            <div className="flex gap-1 flex-wrap">
              {(["mcp", "cli", "rest"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors ${
                    activeTab === tab
                      ? "bg-[#c9a0ff] text-zinc-950 font-bold"
                      : "bg-zinc-900 text-zinc-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Platform toggle — only shown for MCP tab */}
          {activeTab === "mcp" && (
            <div className="flex items-center gap-1">
              <span className="text-[12px] font-mono text-zinc-600 mr-1">Platform:</span>
              {(["win", "posix"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`text-[12px] font-mono px-2 py-0.5 rounded transition-all ${
                    platform === p
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {p === "win" ? "Windows" : "macOS/Linux"}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 font-mono text-[13px] text-zinc-300 overflow-x-auto max-h-[140px]">
            <pre className="whitespace-pre">
              {activeTab === "mcp" && mcpConfig}
              {activeTab === "cli" && cliCommand}
              {activeTab === "rest" && restCommand}
            </pre>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-zinc-800/80 flex justify-end">
          <Button onClick={onClose} className="w-full">
            I have safely copied my key
          </Button>
        </div>
      </div>
    </div>
  );
}
