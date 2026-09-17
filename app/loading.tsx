export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-500 text-sm font-mono">
        <span className="w-4 h-4 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
        Loading…
      </div>
    </div>
  );
}
