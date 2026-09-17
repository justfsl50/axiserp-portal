import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-10 text-xs text-zinc-600 font-arial">
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-uber text-sm text-zinc-400">AXIS<span className="text-zinc-600">MCP</span></span>
          <span className="text-zinc-700">·</span>
          <span>Student-built, read-only, unofficial</span>
          <span className="text-zinc-700">·</span>
          <span>
            Built by{" "}
            <a
              href="https://x.com/faisalansari50a"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1"
            >
              faisl
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/keys" className="hover:text-white transition-colors">Keys</Link>
          <Link href="/connect" className="hover:text-white transition-colors">Connect</Link>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
        </div>
      </div>
    </footer>
  );
}
