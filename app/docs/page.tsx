"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Copy, Check } from "lucide-react";

type Tab = "mcp" | "cli" | "api-keys";

const CODE_BLOCKS = {
  mcp_config_win: `{
  "mcpServers": {
    "axis": {
      "command": "npx.cmd",
      "args": ["--package=axis-erp-mcp@1", "axis-erp-mcp"],
      "env": {
        "AXIS_API_KEY": "axis_your_key_here"
      }
    }
  }
}`,
  mcp_config_mac: `{
  "mcpServers": {
    "axis": {
      "command": "npx",
      "args": ["-y", "--package=axis-erp-mcp@1", "axis-erp-mcp"],
      "env": {
        "AXIS_API_KEY": "axis_your_key_here"
      }
    }
  }
}`,
  cli_install: `# Install globally
npm i -g axiserp

# Run interactive dashboard
axis

# Lab/shared machine (wipes on quit)
axis -- --once`,
  cli_npx: `# No install needed — run directly
npx -y axiserp`,
  get_key_signup: `curl -s -X POST https://api.handlebid.lol/v1/auth/signup \\
  -H 'Content-Type: application/json' \\
  -d '{
    "erpId": "2023BCS084",
    "erpPassword": "YOUR_ERP_PASSWORD",
    "name": "web"
  }'

# Response (key shown ONCE — copy it immediately):
# {
#   "account": "2023BCS084",
#   "id": 7,
#   "key": "axis_live_9794a8c189c349124cb42d53"
# }`,
  get_key_login: `# Create additional keys for different tools
curl -s -X POST https://api.handlebid.lol/v1/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{
    "erpId": "2023BCS084",
    "erpPassword": "YOUR_ERP_PASSWORD",
    "name": "mcp"
  }'`,
  mcp_prompts: `# Once connected, ask your AI naturally:

"Can I skip class tomorrow?"
→ Checks attendance %, calculates safe bunk margin

"What's my timetable for this week?"
→ Returns Mon–Fri lecture grid with rooms

"Any pending fees or notices?"
→ Fetches inbox, dues, exam circulars

"What was my SGPA last semester?"
→ Returns grade sheet and internal marks

"Who is my faculty mentor?"
→ Returns profile with advisor details`,
  tui_shortcuts: `# Keyboard shortcuts inside the TUI:

  [s]  My attendance + safe bunk margin
  [t]  Today's classes with rooms
  [w]  Weekly timetable grid
  [m]  Marks & SGPA
  [i]  Inbox — notices & fee dues
  [p]  Student profile
  [o]  Logout — wipes all session data

  ↑/↓  Navigate menu
  Enter Select option
  b/Esc Go back`,
};

function CodeBlock({ code, lang = "bash", id }: { code: string; lang?: string; id: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting
  const highlight = (line: string) => {
    // Comments
    if (line.trimStart().startsWith("#") || line.trimStart().startsWith("//")) {
      return <span className="text-zinc-500 italic">{line}</span>;
    }
    // JSON keys
    if (lang === "json") {
      return (
        <span
          dangerouslySetInnerHTML={{
            __html: line
              .replace(/"([^"]+)":/g, '<span class="text-sky-400">"$1"</span>:')
              .replace(/: "([^"]+)"/g, ': <span class="text-emerald-400">"$1"</span>')
              .replace(/: (true|false|null)/g, ': <span class="text-amber-400">$1</span>')
          }}
        />
      );
    }
    // Bash-style
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: line
            .replace(/^(\s*)(curl|npm|npx|axis)\b/g, '$1<span class="text-emerald-400 font-bold">$2</span>')
            .replace(/(-[a-zA-Z]+|--[a-zA-Z-]+)/g, '<span class="text-sky-400">$1</span>')
            .replace(/"([^"]+)"/g, '<span class="text-amber-300">"$1"</span>')
            .replace(/(https?:\/\/[^\s'"\\]+)/g, '<span class="text-violet-400 underline">$1</span>')
            .replace(/→/g, '<span class="text-emerald-400">→</span>')
            .replace(/(\[.\])/g, '<span class="text-sky-400 font-bold">$1</span>')
        }}
      />
    );
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0c] overflow-hidden group">
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between">
        <span className="text-[12px] font-mono text-zinc-600 uppercase">{lang}</span>
        <button
          onClick={copy}
          className="text-zinc-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <pre className="p-4 text-[12px] font-mono leading-relaxed overflow-x-auto">
        {code.split("\n").map((line, i) => (
          <div key={i}>{highlight(line)}</div>
        ))}
      </pre>
    </div>
  );
}

export default function DocsPage() {
  const [tab, setTab] = useState<Tab>("mcp");
  const [platform, setPlatform] = useState<"win" | "mac">("win");

  const tabs: { id: Tab; label: string }[] = [
    { id: "mcp", label: "MCP Setup" },
    { id: "cli", label: "CLI & TUI" },
    { id: "api-keys", label: "API Keys" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          {/* Header */}
          <div className="pb-6 border-b border-white/[0.06]">
            <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Guides</p>
            <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">
              Getting Started
            </h1>
            <p className="text-sm text-zinc-500 mt-2 max-w-lg">
              Connect your college ERP to your favourite tools in under 2 minutes.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.02] rounded-full p-1 border border-white/[0.06] w-fit">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-arial-bold transition-all ${
                  tab === t.id ? "bg-white text-zinc-900" : "text-zinc-500 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── MCP TAB ─── */}
          {tab === "mcp" && (
            <div className="space-y-8">
              <div className="space-y-2">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">1. Get your API key</h2>
                <p className="text-sm text-zinc-400">
                  Link your ERP account to get a key. It&apos;s shown <strong className="text-white">once</strong> — copy it immediately.
                </p>
                <div className="flex gap-2 mt-3">
                  <a href="/keys" className="bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-xs px-4 py-2 rounded-lg transition-all">
                    Get Key from Dashboard →
                  </a>
                  <button onClick={() => setTab("api-keys")} className="text-xs text-zinc-500 hover:text-white px-3 py-2 transition-colors">
                    or via curl
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">2. Add MCP config</h2>
                <p className="text-sm text-zinc-400">
                  Paste this into your AI client&apos;s MCP configuration file.
                  Works with <strong className="text-white">Claude Desktop</strong>, <strong className="text-white">Cursor</strong>, <strong className="text-white">Zed</strong>, and <strong className="text-white">Windsurf</strong>.
                </p>

                <div className="flex items-center gap-1 bg-white/[0.02] rounded-full p-1 border border-white/[0.06] w-fit">
                  <button onClick={() => setPlatform("win")} className={`px-3 py-1 rounded-full text-[13px] font-mono transition-all ${platform === "win" ? "bg-white/[0.08] text-white" : "text-zinc-600"}`}>
                    Windows
                  </button>
                  <button onClick={() => setPlatform("mac")} className={`px-3 py-1 rounded-full text-[13px] font-mono transition-all ${platform === "mac" ? "bg-white/[0.08] text-white" : "text-zinc-600"}`}>
                    macOS / Linux
                  </button>
                </div>

                <CodeBlock
                  code={platform === "win" ? CODE_BLOCKS.mcp_config_win : CODE_BLOCKS.mcp_config_mac}
                  lang="json"
                  id="mcp-config"
                />

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-zinc-400 space-y-2">
                  <p className="text-zinc-300 font-medium">Where to paste:</p>
                  <ul className="list-disc list-inside space-y-1 text-zinc-500">
                    <li><strong className="text-zinc-300">Claude Desktop:</strong> Settings → Developer → Edit Config</li>
                    <li><strong className="text-zinc-300">Cursor:</strong> Settings → MCP → Add Server</li>
                    <li><strong className="text-zinc-300">Zed:</strong> settings.json → &quot;context_servers&quot;</li>
                    <li><strong className="text-zinc-300">Windsurf:</strong> Settings → MCP → Paste config</li>
                  </ul>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">3. Ask naturally</h2>
                <p className="text-sm text-zinc-400">
                  Once connected, your AI has 6 tools: <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">profile</code>, <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">today</code>, <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">attendance</code>, <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">timetable</code>, <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">exam_results</code>, <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">inbox</code>.
                </p>
                <CodeBlock code={CODE_BLOCKS.mcp_prompts} lang="text" id="mcp-prompts" />
              </div>
            </div>
          )}

          {/* ─── CLI TAB ─── */}
          {tab === "cli" && (
            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">Install &amp; Run</h2>
                <p className="text-sm text-zinc-400">
                  Full interactive TUI in your terminal. Keyboard-driven, zero browser needed.
                </p>
                <CodeBlock code={CODE_BLOCKS.cli_install} lang="bash" id="cli-install" />
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">One-shot (no install)</h2>
                <p className="text-sm text-zinc-400">
                  Try it instantly without installing anything globally.
                </p>
                <CodeBlock code={CODE_BLOCKS.cli_npx} lang="bash" id="cli-npx" />
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">Keyboard Shortcuts</h2>
                <p className="text-sm text-zinc-400">
                  Navigate the TUI entirely with your keyboard.
                </p>
                <CodeBlock code={CODE_BLOCKS.tui_shortcuts} lang="text" id="tui-shortcuts" />
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-zinc-400 space-y-2">
                <p className="text-zinc-300 font-medium">Lab machine safety</p>
                <p className="text-zinc-500">
                  Use <code className="text-zinc-300 bg-white/[0.06] px-1.5 py-0.5 rounded">axis -- --once</code> on shared computers. 
                  All session tokens, keys, and cached data are wiped the moment you press quit. Zero footprint.
                </p>
              </div>
            </div>
          )}

          {/* ─── API KEYS TAB ─── */}
          {tab === "api-keys" && (
            <div className="space-y-8">
              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">First key (signup)</h2>
                <p className="text-sm text-zinc-400">
                  Generate your primary API key. The raw secret is returned <strong className="text-white">strictly once</strong>.
                </p>
                <CodeBlock code={CODE_BLOCKS.get_key_signup} lang="bash" id="key-signup" />
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-uber uppercase text-white tracking-tight">Additional keys</h2>
                <p className="text-sm text-zinc-400">
                  Create separate keys for each consumer (MCP, CLI, TUI, custom apps).
                </p>
                <CodeBlock code={CODE_BLOCKS.get_key_login} lang="bash" id="key-login" />
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs text-zinc-400 space-y-2">
                <p className="text-zinc-300 font-medium">Security model</p>
                <ul className="list-disc list-inside space-y-1 text-zinc-500">
                  <li>Keys are hashed after creation — we can never see the raw secret again</li>
                  <li>Lost a key? Click <strong className="text-zinc-300">Re-issue</strong> in the dashboard or create a new one</li>
                  <li>All access is <strong className="text-zinc-300">read-only</strong> — zero write capability to your ERP</li>
                  <li>Your ERP password is used once for auth and immediately discarded</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
