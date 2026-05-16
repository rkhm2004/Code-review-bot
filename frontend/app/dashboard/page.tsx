'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedBackground from '@/components/AnimatedBackground';
import ReviewActions from '@/components/ReviewActions';

export default function Dashboard() {
  const router = useRouter();
  
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diff, setDiff] = useState('');
  const [displayedThoughts, setDisplayedThoughts] = useState('');
  
  const intentToAnalyze = useRef(false); 
  const fullThoughtsRef = useRef('');

  useEffect(() => {
    const eventSource = new EventSource('http://localhost:3005/sse');

    eventSource.addEventListener('message', (event) => {
      if (!intentToAnalyze.current) return; 

      try {
        const rawData = JSON.parse(event.data);
        if (rawData.type === 'review_complete' || rawData.content) {
          fullThoughtsRef.current = rawData.content;
          setIsAnalyzing(false);
          
          let index = 0;
          setDisplayedThoughts('');
          const interval = setInterval(() => {
            if (index < fullThoughtsRef.current.length) {
              setDisplayedThoughts((prev) => prev + fullThoughtsRef.current.charAt(index));
              index++;
            } else {
              clearInterval(interval);
            }
          }, 3); 
        }
      } catch (err) {
        console.error("❌ Failed to parse streaming line:", err);
      }
    });

    return () => eventSource.close();
  }, []);

  const handleAnalyze = async () => {
    if (!url) return;
    intentToAnalyze.current = true;
    setIsAnalyzing(true);
    setDiff('');
    setDisplayedThoughts('');
    fullThoughtsRef.current = '';

    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (!match) {
        alert("Invalid GitHub Pull Request URL.");
        setIsAnalyzing(false);
        return;
      }
      const [, owner, repo, pull_number] = match;

      const diffRes = await fetch(`http://localhost:3005/diff?owner=${owner}&repo=${repo}&pull_number=${pull_number}`);
      const diffData = await diffRes.json();
      if (diffData.diff) setDiff(diffData.diff);

      await fetch('http://localhost:3005/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: "get_pr_diff" },
          id: 1
        })
      });

    } catch (err) {
      console.error("Pipeline failure:", err);
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen text-[#c9d1d9] p-8 font-sans pb-24 relative overflow-hidden bg-[#05070A]">
      <AnimatedBackground />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></div>
            <h1 className="text-2xl font-mono font-bold text-cyan-400 tracking-widest">
              SYS.SEC.CONSOLE
            </h1>
          </div>
          <button onClick={() => router.push('/')} className="font-mono text-xs text-red-400 hover:text-red-300 transition-colors border border-red-500/30 px-4 py-2 rounded bg-black/50 backdrop-blur-md">
            [ EXIT_SESSION ]
          </button>
        </div>

        {/* INPUT COMMAND BAR */}
        <div className="flex gap-4 max-w-full bg-[#0d1117]/90 backdrop-blur-md p-2 rounded border border-[#30363d] shadow-2xl font-mono">
          <div className="bg-black flex-1 flex items-center px-4 py-3 rounded border border-gray-800">
            <span className="text-green-500 mr-3">➜</span>
            <span className="text-blue-400 mr-2">target_pr</span>
            <span className="text-gray-500 mr-2">=</span>
            <input
              type="text"
              placeholder='"https://github.com/..."'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-transparent text-yellow-300 focus:outline-none text-sm placeholder-gray-700"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/50 text-cyan-400 disabled:opacity-50 font-bold px-8 py-3 rounded text-sm transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
          >
            {isAnalyzing ? '> EXECUTING...' : '> RUN_AUDIT'}
          </button>
        </div>

        {/* TERMINAL PANELS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          
          {/* LEFT: TARGET CODE TERMINAL */}
          <div className="bg-[#0a0a0a]/95 backdrop-blur-xl rounded border border-[#1f2937] shadow-2xl overflow-hidden flex flex-col h-[600px]">
            {/* Terminal Header */}
            <div className="bg-[#111827] px-4 py-2 border-b border-[#1f2937] flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <span className="font-mono text-xs text-gray-400">root@sentinel:~/target/diff.patch</span>
            </div>
            {/* Terminal Body */}
            <div className="p-4 overflow-auto flex-1 font-mono text-xs whitespace-pre text-gray-300 custom-scrollbar leading-relaxed">
              {diff || (
                <div className="text-gray-600">
                  <p>Initializing git diff parser...</p>
                  <p className="animate-pulse mt-1">_waiting for target input...</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: AI AGENT TERMINAL */}
          <div className="bg-[#0a0a0a]/95 backdrop-blur-xl rounded border border-cyan-900/50 shadow-[0_0_30px_rgba(0,240,255,0.05)] overflow-hidden flex flex-col h-[600px]">
             {/* Terminal Header */}
             <div className="bg-[#111827] px-4 py-2 border-b border-cyan-900/50 flex items-center justify-between">
              <div className="flex gap-2">
                <span className="font-mono text-xs text-cyan-500 font-bold">● LIVE TELEMETRY</span>
              </div>
              <span className="font-mono text-xs text-cyan-400/50">/var/log/agent.log</span>
            </div>
            {/* Terminal Body */}
            <div className="p-4 overflow-auto flex-1 font-mono text-sm whitespace-pre-wrap text-cyan-50 custom-scrollbar leading-relaxed">
              {displayedThoughts || (
                <div className="text-cyan-800">
                  {isAnalyzing ? (
                    <>
                      <p className="text-green-400">[{new Date().toLocaleTimeString()}] Accessing Groq Llama-3.3 matrix...</p>
                      <p className="text-green-400">[{new Date().toLocaleTimeString()}] Parsing AST vulnerabilities...</p>
                      <span className="animate-pulse">_</span>
                    </>
                  ) : (
                    <p>Agent standing by.</p>
                  )}
                </div>
              )}
            </div>

            {/* ACTION FOOTER */}
            {displayedThoughts && !isAnalyzing && (
              <div className="bg-[#0d1117] p-4 border-t border-cyan-900/50 flex justify-end">
                <ReviewActions url={url} />
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}