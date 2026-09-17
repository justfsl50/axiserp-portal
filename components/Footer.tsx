import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-10 text-xs text-zinc-600 font-arial">
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-uber text-sm text-zinc-400">AXIS<span className="text-zinc-600">ERP</span></span>
          <span className="text-zinc-700">·</span>
          <span>Student-built, read-only, unofficial</span>
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
