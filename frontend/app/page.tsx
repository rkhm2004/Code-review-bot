'use client';

import PRInput from "@/components/PRInput";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion } from "framer-motion";

export default function DashboardPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden">
      <AnimatedBackground />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl z-10 space-y-8 text-center"
      >
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Agentic Code Review
          </h1>
          <p className="text-slate-400 text-lg">
            Deploy an autonomous MCP agent to audit your Pull Request for bugs and security flaws.
          </p>
        </div>

        <div className="glass-card p-8 shadow-2xl shadow-cyan-500/10">
          <PRInput />
        </div>

        <div className="flex items-center justify-center gap-8 text-xs font-mono text-slate-500 uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            MCP Server: Online
          </span>
          <span>Engine: GPT-4o / Claude 3.5</span>
        </div>
      </motion.div>
    </div>
  );
}