"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Copy, Check, Terminal, Bot, Globe } from "lucide-react";

interface ConnectionSnippetsProps {
  apiKey?: string;
}

export function ConnectionSnippets({ apiKey = "YOUR_API_KEY" }: ConnectionSnippetsProps) {
  const [activeTab, setActiveTab] = useState<"mcp" | "cli" | "rest">("mcp");
  const [mcpOs, setMcpOs] = useState<"unix" | "win">("unix");
  const [cliShell, setCliShell] = useState<"bash" | "pwsh">("bash");
  const [restLang, setRestLang] = useState<"curl" | "js" | "py">("curl");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyWithFeedback = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 1800);
  };

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        axis: {
          command: mcpOs === "win" ? "npx.cmd" : "npx",
          args: mcpOs === "win" 
            ? ["--package=axis-erp-mcp@1", "axis-erp-mcp"]
            : ["-y", "--package=axis-erp-mcp@1", "axis-erp-mcp"],
          env: {
            AXIS_API_KEY: apiKey
          }
        }
      }
    },
    null,
    2
  );

  const cliEnvSnippet = cliShell === "pwsh"
    ? `$env:AXIS_API_KEY="${apiKey}"`
    : `export AXIS_API_KEY="${apiKey}"`;

  const restSnippet = restLang === "curl"
    ? `curl https://api.handlebid.lol/v1/attendance \\\n  -H "X-API-Key: ${apiKey}"`
    : restLang === "js"
    ? `const res = await fetch("https://api.handlebid.lol/v1/attendance", {\n  headers: { "X-API-Key": "${apiKey}" }\n});\nconst data = await res.json();\nconsole.log(data);`
    : `import httpx\n\nheaders = {"X-API-Key": "${apiKey}"}\nres = httpx.get("https://api.handlebid.lol/v1/attendance", headers=headers)\nprint(res.json())`;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden shadow-xl">
      {/* Tab Navigation */}
      <div className="bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap">
        <button
          onClick={() => setActiveTab("mcp")}
          className={`flex-1 py-3.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "mcp"
              ? "border-[#c9a0ff] text-[#c9a0ff] bg-[#c9a0ff]/5"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>MCP (AI Host)</span>
        </button>

        <button
          onClick={() => setActiveTab("cli")}
          className={`flex-1 py-3.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "cli"
              ? "border-[#c9a0ff] text-[#c9a0ff] bg-[#c9a0ff]/5"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>CLI / TUI</span>
        </button>

        <button
          onClick={() => setActiveTab("rest")}
          className={`flex-1 py-3.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            activeTab === "rest"
              ? "border-[#c9a0ff] text-[#c9a0ff] bg-[#c9a0ff]/5"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>REST API</span>
        </button>
      </div>

      <div className="p-6">
        {/* 1. MCP TAB */}
        {activeTab === "mcp" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-white">Connect your AI Assistant</h4>
                <p className="text-xs text-zinc-400">Add AXISERP to Claude Desktop, Cursor, or Zed with this configuration.</p>
              </div>
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs font-mono">
                <button
                  onClick={() => setMcpOs("unix")}
                  className={`px-3 py-1 rounded transition-colors ${mcpOs === "unix" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  macOS / Linux
                </button>
                <button
                  onClick={() => setMcpOs("win")}
                  className={`px-3 py-1 rounded transition-colors ${mcpOs === "win" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  Windows
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 overflow-hidden font-mono text-xs">
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-[13px]">
                <span>claude_desktop_config.json</span>
                <button
                  onClick={() => copyWithFeedback(mcpConfig, "mcp")}
                  className="flex items-center gap-1 text-[#c9a0ff] hover:underline"
                >
                  {copiedSection === "mcp" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSection === "mcp" ? "Copied" : "Copy config"}</span>
                </button>
              </div>
              <pre className="p-4 text-zinc-300 overflow-x-auto">{mcpConfig}</pre>
            </div>
          </div>
        )}

        {/* 2. CLI TAB */}
        {activeTab === "cli" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-white">Your ERP from the Terminal</h4>
                <p className="text-xs text-zinc-400">Install the CLI globally and set your environment variable.</p>
              </div>
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs font-mono">
                <button
                  onClick={() => setCliShell("bash")}
                  className={`px-3 py-1 rounded transition-colors ${cliShell === "bash" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  Bash / Zsh
                </button>
                <button
                  onClick={() => setCliShell("pwsh")}
                  className={`px-3 py-1 rounded transition-colors ${cliShell === "pwsh" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  PowerShell
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">npm i -g axiserp</span>
                <button onClick={() => copyWithFeedback("npm i -g axiserp", "cli-npm")} className="text-zinc-500 hover:text-[#c9a0ff]">
                  {copiedSection === "cli-npm" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-300">{cliEnvSnippet}</span>
                <button onClick={() => copyWithFeedback(cliEnvSnippet, "cli-env")} className="text-zinc-500 hover:text-[#c9a0ff]">
                  {copiedSection === "cli-env" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900 border border-zinc-800">
                <span className="text-[#39ff14] font-bold">axis</span>
                <button onClick={() => copyWithFeedback("axis", "cli-run")} className="text-zinc-500 hover:text-[#39ff14]">
                  {copiedSection === "cli-run" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-md bg-zinc-900 border border-zinc-800">
                <span className="text-[#c9a0ff]">axis -- --once</span>
                <button onClick={() => copyWithFeedback("axis -- --once", "cli-once")} className="text-zinc-500 hover:text-[#c9a0ff]">
                  {copiedSection === "cli-once" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* ASCII TUI Preview matching Screenshot 1 */}
            <div className="mt-4 rounded-lg border border-zinc-800 bg-black p-4 font-mono text-xs text-zinc-400 overflow-x-auto leading-relaxed">
              <div className="text-center text-[#c9a0ff] font-bold">AXISERP v1.1.2</div>
              <div className="text-center text-zinc-500 text-[12px] mb-3">────── CAMPUS SYSTEMS SIMPLIFIED ──────</div>
              <div className="space-y-0.5 text-zinc-300">
                <div className="text-[#39ff14] font-semibold">&gt; My attendance  <span className="text-[#00f0ff]">(s)</span></div>
                <div>  Today&apos;s classes  <span className="text-[#00f0ff]">(t)</span></div>
                <div>  Weekly timetable  <span className="text-[#00f0ff]">(w)</span></div>
                <div>  My marks  <span className="text-[#00f0ff]">(m)</span></div>
                <div>  Inbox — notices &amp; dues  <span className="text-[#00f0ff]">(i)</span></div>
                <div>  My profile  <span className="text-[#00f0ff]">(p)</span></div>
                <div>  Log out — wipe this session  <span className="text-[#00f0ff]">(o)</span></div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-900 text-[13px] text-zinc-500 flex flex-wrap gap-2">
                <span><strong className="text-[#00f0ff]">[s]</strong> tatus</span>
                <span><strong className="text-[#00f0ff]">[t]</strong> oday</span>
                <span><strong className="text-[#00f0ff]">[w]</strong> eek</span>
                <span><strong className="text-[#00f0ff]">[m]</strong> arks</span>
                <span><strong className="text-[#00f0ff]">[i]</strong> nbox</span>
                <span><strong className="text-[#00f0ff]">[p]</strong> rofile</span>
                <span><strong className="text-[#00f0ff]">[o]</strong> ut</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. REST TAB */}
        {activeTab === "rest" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-white">Direct HTTP Queries</h4>
                <p className="text-xs text-zinc-400">Pass your key in the <code>X-API-Key</code> request header.</p>
              </div>
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-xs font-mono">
                <button
                  onClick={() => setRestLang("curl")}
                  className={`px-3 py-1 rounded transition-colors ${restLang === "curl" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  cURL
                </button>
                <button
                  onClick={() => setRestLang("js")}
                  className={`px-3 py-1 rounded transition-colors ${restLang === "js" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  JavaScript
                </button>
                <button
                  onClick={() => setRestLang("py")}
                  className={`px-3 py-1 rounded transition-colors ${restLang === "py" ? "bg-zinc-800 text-white font-semibold" : "text-zinc-400"}`}
                >
                  Python
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 overflow-hidden font-mono text-xs">
                <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-[13px]">
                  <span>REQUEST</span>
                  <button onClick={() => copyWithFeedback(restSnippet, "rest-code")} className="text-[#c9a0ff] flex items-center gap-1 hover:underline">
                    {copiedSection === "rest-code" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSection === "rest-code" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <pre className="p-4 text-zinc-300 overflow-x-auto whitespace-pre">{restSnippet}</pre>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 overflow-hidden font-mono text-xs">
                <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800 flex items-center justify-between text-zinc-400 text-[13px]">
                  <span>RESPONSE · 200 OK</span>
                  <span className="text-emerald-400">application/json</span>
                </div>
                <pre className="p-4 text-zinc-300 overflow-x-auto">{`{
  "present": 34,
  "absent": 8,
  "total": 42,
  "percentage": 80.9,
  "status": "safe",
  "safe_margin_bunks": 3
}`}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
