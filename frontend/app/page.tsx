'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReviewActions from '@/components/ReviewActions';

export default function Home() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diff, setDiff] = useState('');
  const [displayedThoughts, setDisplayedThoughts] = useState('');
  const fullThoughtsRef = useRef('');

  useEffect(() => {
    // 1. UPDATED TO PORT 3005
    const eventSource = new EventSource('http://localhost:3005/sse');

    eventSource.addEventListener('message', (event) => {
      try {
        const rawData = JSON.parse(event.data);
        console.log("📥 Stream incoming payload:", rawData);

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

    eventSource.onerror = (err) => {
      console.error("⚠️ SSE Stream Connection dropped:", err);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleAnalyze = async () => {
    if (!url) return;
    setIsAnalyzing(true);
    setDiff('');
    setDisplayedThoughts('');
    fullThoughtsRef.current = '';

    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (!match) {
        alert("Invalid GitHub Pull Request URL configuration.");
        setIsAnalyzing(false);
        return;
      }
      const [, owner, repo, pull_number] = match;

      // 2. UPDATED TO PORT 3005
      const diffRes = await fetch(`http://localhost:3005/diff?owner=${owner}&repo=${repo}&pull_number=${pull_number}`);
      const diffData = await diffRes.json();
      
      if (diffData.diff) {
        setDiff(diffData.diff);
      }

      // 3. UPDATED TO PORT 3005
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
      console.error("❌ Execution pipeline failure:", err);
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9] p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Agentic Code Review</h1>
          <p className="text-gray-400">Deploy an autonomous MCP agent to audit and fix your Pull Request.</p>
        </div>

        <div className="flex gap-4 max-w-2xl mx-auto bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-2xl">
          <input
            type="text"
            placeholder="Enter GitHub PR URL (e.g., https://github.com/owner/repo/pull/1)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 bg-[#0d1117] border border-[#30363d] px-4 py-2 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
          />
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium px-6 py-2 rounded-lg text-sm transition-all transform active:scale-95"
          >
            {isAnalyzing ? '⚡ Auditing Code...' : 'Analyze PR'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 space-y-4 shadow-lg">
            <h2 className="text-lg font-semibold text-white border-b border-[#30363d] pb-2">PR Code Diff</h2>
            <div className="bg-[#0d1117] rounded-lg p-4 overflow-auto h-[450px] font-mono text-xs whitespace-pre text-gray-300 border border-[#21262d]">
              {diff || "Awaiting target codebase initialization..."}
            </div>
          </div>

          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-6 space-y-4 shadow-lg flex flex-col justify-between h-[530px]">
            <div className="space-y-4 overflow-hidden flex-1 flex flex-col">
              <h2 className="text-lg font-semibold text-white border-b border-[#30363d] pb-2 flex justify-between items-center">
                <span>Sentinel AI Thoughts</span>
                {isAnalyzing && <span className="text-xs text-blue-400 animate-pulse">Agent thinking...</span>}
              </h2>
              <div className="text-sm text-gray-300 overflow-auto flex-1 whitespace-pre-wrap font-sans pr-2">
                {displayedThoughts || (isAnalyzing ? "🧠 Reading security matrix layers..." : "Waiting for AI Agent to begin review...")}
              </div>
            </div>

            {displayedThoughts && !isAnalyzing && (
              <div className="pt-4 border-t border-[#30363d] bg-[#161b22]">
                <ReviewActions url={url} />
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}