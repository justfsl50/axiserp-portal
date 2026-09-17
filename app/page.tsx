"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { HeroTerminal } from "@/components/HeroTerminal";
import { McpShowcase } from "@/components/McpShowcase";
import { CliShowcase } from "@/components/CliShowcase";
import { ErpLinkModal } from "@/components/ErpLinkModal";
import { KeyCreatedModal } from "@/components/KeyCreatedModal";
import { FaqSection } from "@/components/FaqSection";
import { Footer } from "@/components/Footer";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { keyGenGate } from "@/lib/keyGate";

const HERO_IMAGE = "/axis-pixel-skyline.png";
const HERO_IMAGE_FALLBACK = "/axis-campus-night.png";

export default function HomePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [isErpModalOpen, setIsErpModalOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<string>("axis_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
  const [createdKeyData, setCreatedKeyData] = useState<{ key: string; name: string } | null>(null);
  const [heroImageSrc, setHeroImageSrc] = useState(HERO_IMAGE);

  const handleKeyCreated = (key: string, name: string) => {
    setActiveKey(key);
    setCreatedKeyData({ key, name });
  };

  /** Gated open: signed in (Google / GitHub / email) → modal; else sign-in first. */
  const openKeyModal = async () => {
    const dest = await keyGenGate(supabase, "/");
    if (dest) {
      router.push(dest);
      return;
    }
    setIsErpModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-arial">
      <Navbar onOpenErpModal={openKeyModal} />

      <main className="flex-1">
        {/* ─── HERO ─── */}
        <section className="relative w-full min-h-[100vh] flex flex-col items-center justify-center overflow-hidden">
          {/* Campus bg — next/image optimizes the 2.4MB PNG (was plain <img>) */}
          <div className="absolute inset-0 z-0">
            <Image
              src={heroImageSrc}
              alt="Axis Colleges Campus — pixel art skyline"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
              onError={() => setHeroImageSrc(HERO_IMAGE_FALLBACK)}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#09090b]/80 via-[#09090b]/40 to-[#09090b]" />
          </div>

          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto py-40">
            <div className="inline-flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 rounded-full text-[13px] text-zinc-400 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>v1.1.2 — Now available</span>
            </div>

            <h1 className="text-5xl sm:text-7xl lg:text-[5.5rem] font-uber uppercase tracking-tight text-white leading-[1.02] mb-6">
              An MCP server
              <br />
              <span className="text-white">for clg. ERP.</span>
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 font-arial max-w-md mx-auto leading-relaxed mb-10">
              Connect attendance, timetable, marks, notices, and campus workflows to AI agents, MCP, CLI, and custom applications.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={openKeyModal}
                className="bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-sm px-7 py-3 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#terminal"
                className="bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-sm font-arial-bold px-6 py-3 rounded-full transition-all border border-white/[0.08] flex items-center gap-2"
              >
                <span>See Showcase</span>
              </a>
            </div>
          </div>
        </section>

        {/* ─── SECTIONS ─── */}
        <div className="space-y-32 pb-24">
          {/* Terminal */}
          <section id="terminal" className="max-w-4xl mx-auto px-4 w-full">
            <div className="text-center space-y-2 mb-10">
              <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Interactive Console</p>
              <h2 className="text-2xl sm:text-4xl font-uber uppercase tracking-tight text-white">
                Try the Terminal
              </h2>
            </div>
            <HeroTerminal />
          </section>

          {/* MCP */}
          <section className="max-w-5xl mx-auto px-4 w-full">
            <McpShowcase activeKey={activeKey} />
          </section>

          {/* CLI */}
          <section className="max-w-5xl mx-auto px-4 w-full">
            <CliShowcase />
          </section>

          {/* FAQ */}
          <section className="max-w-3xl mx-auto px-4 w-full">
            <FaqSection />
          </section>
        </div>
      </main>

      <ErpLinkModal
        isOpen={isErpModalOpen}
        onClose={() => setIsErpModalOpen(false)}
        onKeyCreated={handleKeyCreated}
      />

      {createdKeyData && (
        <KeyCreatedModal
          apiKey={createdKeyData.key}
          keyName={createdKeyData.name}
          onClose={() => setCreatedKeyData(null)}
        />
      )}

      <Footer />
    </div>
  );
}
