import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. What AXISMCP is",
    body: [
      "AXISMCP is an unofficial, student-built developer portal. It lets you generate an API key tied to your own college ERP account and use it with AI tools (Claude, Cursor, VS Code) and other clients via the Model Context Protocol.",
      "AXISMCP is not affiliated with, endorsed by, or officially connected to your college in any way.",
    ],
  },
  {
    title: "2. Your account and keys",
    body: [
      "You are responsible for the keys you create. Keys are shown once at creation — store them safely.",
      "Anyone holding your key can read data from your ERP account. Do not share keys, commit them to git, or paste them into public places. If a key leaks, revoke it in My Keys immediately.",
      "You may only connect your own ERP account. Connecting, querying, or automating someone else's account is strictly prohibited.",
    ],
  },
  {
    title: "3. Acceptable use",
    body: [
      "The API is read-only: it can view attendance, schedule, timetable, marks, exam results, and inbox. It cannot modify any college record.",
      "Do not use AXISMCP to scrape data at scale, build a public service on top of the college's ERP, or automate actions that could destabilize college infrastructure.",
      "Abuse may lead to your keys being revoked and your access being blocked without notice.",
    ],
  },
  {
    title: "4. Availability and data",
    body: [
      "AXISMCP depends on the college ERP being up. If the ERP is down or changes, the service may stop working without notice.",
      "We store the minimum needed to run the service: your sign-in identity (from Supabase auth), key names and hashes (never full keys), and a connection record linking your account to your ERP ID.",
      "Full keys live only in your browser session and an owner-protected secrets table until you delete them.",
    ],
  },
  {
    title: "5. No warranty",
    body: [
      "AXISMCP is provided \u201cas is\u201d with no warranty of any kind. You use it at your own risk.",
      "We are not liable for any damages, data inaccuracies, academic consequences, or losses arising from use of the service or reliance on its data.",
    ],
  },
  {
    title: "6. Changes",
    body: [
      "These terms may change as the service evolves. Material changes will be reflected on this page — check back when in doubt.",
      "Continuing to use AXISMCP after a change means you accept the updated terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">Terms of Use</h1>
          <p className="text-xs text-zinc-500 mt-1">Last updated: September 18, 2026</p>

          <div className="mt-8 space-y-6">
            {SECTIONS.map((s) => (
              <section key={s.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h2 className="text-sm font-semibold text-white mb-2">{s.title}</h2>
                <div className="space-y-2">
                  {s.body.map((p, i) => (
                    <p key={i} className="text-xs text-zinc-400 leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="text-xs text-zinc-600 mt-8">
            Questions? Read the <Link href="/docs" className="text-zinc-300 hover:text-white underline underline-offset-2">Docs</Link> or reach out on{" "}
            <a href="https://x.com/faisalansari50a" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline underline-offset-2">X</a>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
