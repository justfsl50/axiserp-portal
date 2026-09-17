"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { Mail, CheckCircle2, AlertCircle } from "lucide-react";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const supabase = useMemo(() => createClient(), []);

  /** Where to land after auth: honors ?next= (open-redirect hardened) + ?link=1. */
  const getReturnTarget = (): string => {
    if (typeof window === "undefined") return "/keys";
    const params = new URLSearchParams(window.location.search);
    const rawNext = params.get("next");
    const next =
      rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/keys";
    return params.get("link") ? `${next}${next.includes("?") ? "&" : "?"}link=1` : next;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      if (data?.session?.user) router.push(getReturnTarget());
    });
  }, [router, supabase]);

  const handleOAuthLogin = async (provider: "google" | "github") => {
    try {
      setIsLoading(true);
      setErrorMsg("");
      const redirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}${getReturnTarget()}` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || `${provider} login failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setErrorMsg("Enter your email"); return; }
    try {
      setIsLoading(true);
      setErrorMsg("");
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}${getReturnTarget()}` : undefined,
        },
      });
      if (error) throw error;
      setIsOtpSent(true);
      setSuccessMsg(`Magic link sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send magic link");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) { setErrorMsg("Enter the code"); return; }
    try {
      setIsLoading(true);
      setErrorMsg("");
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });
      if (error) throw error;
      router.push(getReturnTarget());
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-sm w-full mx-auto px-4 py-32 flex flex-col justify-center">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-uber uppercase tracking-tight text-white">Sign in</h1>
          <p className="text-zinc-500 text-xs mt-1.5">Manage your developer keys and connections.</p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-xs text-red-300">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {successMsg}
            </div>
          )}

          {/* OAuth */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleOAuthLogin("google")}
              className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.4l3.7 2.9C6.5 7.4 9 5 12 5z" />
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                <path fill="#FBBC05" d="M5.6 14.7c-.2-.7-.4-1.5-.4-2.4s.2-1.7.4-2.4L1.9 7C.7 9.4 0 12 0 14.7s.7 5.3 1.9 7.7l3.7-2.9z" />
                <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 17C3.7 20.8 7.5 23.5 12 23.5z" />
              </svg>
              Google
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleOAuthLogin("github")}
              className="w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] text-zinc-300 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
            <div className="relative flex justify-center text-[12px] font-mono"><span className="bg-[#09090b] px-2 text-zinc-600">or email</span></div>
          </div>

          {/* Email OTP */}
          {!isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-600" />
                <input
                  type="email"
                  placeholder="you@college.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-[#09090b] border border-white/[0.08] rounded-lg text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-white/20 transition-colors"
                  disabled={isLoading}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-xs py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? "Sending..." : "Send Magic Link →"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-zinc-500 font-mono">Code sent to {email}</span>
                <button type="button" onClick={() => { setIsOtpSent(false); setSuccessMsg(""); }} className="text-zinc-500 hover:text-white transition-colors">Change</button>
              </div>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full bg-[#09090b] border border-white/[0.08] rounded-lg text-center font-mono tracking-widest text-base py-2.5 text-zinc-200 outline-none focus:border-white/20 transition-colors"
                disabled={isLoading}
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-900 font-arial-bold text-xs py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : "Verify →"}
              </button>
            </form>
          )}

          <div className="pt-3 border-t border-white/[0.04] text-center text-[13px] text-zinc-600 space-y-2">
            <p>Read-only ERP access. No credential storage.</p>
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors block">← Back</Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
