'use client';

import AnimatedBackground from '@/components/AnimatedBackground';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#05070A]">
      <AnimatedBackground />
      
      <div className="relative z-10 text-center space-y-8 p-8 max-w-3xl bg-black/40 backdrop-blur-xl border border-cyan-500/30 rounded-3xl shadow-[0_0_40px_rgba(0,240,255,0.15)] animate-fade-in-up">
        
        <div className="inline-block p-4 rounded-full bg-cyan-500/10 mb-4 shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-cyan-500/20">
          <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
          </svg>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.5)]">
          Sentinel AI
        </h1>
        
        <p className="text-xl text-cyan-100/80 font-light tracking-wide">
          Autonomous DevSecOps agent. Detect vulnerabilities and push secure code directly to your GitHub Pull Requests.
        </p>
        
        <button 
          onClick={() => router.push('/dashboard')}
          className="mt-8 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,240,255,0.4)]"
        >
          Initialize Agent Workspace
        </button>
      </div>
    </main>
  );
}