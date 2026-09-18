import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "What we collect",
    body: [
      "Sign-in identity: when you sign in with Google, GitHub, or email, we store your Supabase user ID, email, and display name.",
      "Key metadata: key name, creation date, status, and a SHA-256 hash of each key. The hash cannot be reversed into the key.",
      "ERP link: your ERP ID (and nothing else from the ERP login) so the backend can read your own attendance, timetable, marks, and inbox.",
      "Live secrets: while you use the console, the full key for each row you create is kept in an owner-protected table so you can copy it later. It is deleted when you revoke the key or wipe it in Settings.",
    ],
  },
  {
    title: "What we never collect",
    body: [
      "Your ERP password is never stored, logged, or written to any database — it is forwarded once to the backend for verification and discarded.",
      "Full API keys are never stored in plain text in key metadata, and never appear in analytics or logs.",
    ],
  },
  {
    title: "How data is used",
    body: [
      "Your data is used only to run the service: authenticating you, listing your keys, and serving your own ERP data back to you through the API.",
      "We do not sell, share, or analyze your data. There are no third-party trackers on this site.",
    ],
  },
  {
    title: "Deletion and control",
    body: [
      "Revoke any key in My Keys — its secret is deleted immediately and the key dies server-side.",
      "Use Settings → Forget account to purge all keys, secrets, and the ERP link. After that, nothing about your account remains.",
      "Signing out wipes cached key data from the browser on shared machines.",
    ],
  },
  {
    title: "Contact",
    body: [
      "This is a student-built, non-commercial project. For privacy questions, reach out on X (@faisalansari50a).",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-[13px] font-mono text-zinc-500 uppercase tracking-widest">Legal</p>
          <h1 className="text-3xl sm:text-4xl font-uber uppercase text-white tracking-tight mt-1">Privacy</h1>
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
            See also our <Link href="/terms" className="text-zinc-300 hover:text-white underline underline-offset-2">Terms of Use</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
