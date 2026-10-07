"use client";

import AnimatedBackground from "@/components/AnimatedBackground";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#05070A]">
      <AnimatedBackground />
      <div className="relative z-10 text-center space-y-7 p-8 max-w-3xl bg-black/50 backdrop-blur-xl border border-cyan-500/30 rounded-3xl">
        <p className="font-mono text-xs text-cyan-400 tracking-[0.35em]">CASE STUDY 4 · AIML</p>
        <h1 className="text-5xl md:text-6xl font-black text-white">Secure Code Debugging & Review Assistant</h1>
        <p className="text-lg text-cyan-100/80">
          Evidence-driven code understanding, secure-coding review, MISRA-oriented guidance and human-controlled findings.
        </p>
        <button onClick={() => router.push("/dashboard")}
          className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full">
          Open Review Workspace
        </button>
      </div>
    </main>
  );
}
