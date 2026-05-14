'use client';

import { useState } from "react";
import AnimatedBackground from "@/components/AnimatedBackground";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  
  const [copied, setCopied] = useState(false);
  
  const [diffCode, setDiffCode] = useState<string | null>(null);
  const [review, setReview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getUrlParts = () => {
    const urlParts = url.replace("[https://github.com/](https://github.com/)", "").split("/");
    return { owner: urlParts[0], repo: urlParts[1], pull_number: parseInt(urlParts[3]) };
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setReview(null);
    setDiffCode(null);
    setError(null);
    setPushSuccess(false);
    setCopied(false);

    try {
      const { owner, repo, pull_number } = getUrlParts();
      if (!owner || !repo || !pull_number) throw new Error("Invalid GitHub PR URL.");

      const diffRes = await fetch(`http://localhost:3001/diff?owner=${owner}&repo=${repo}&pull_number=${pull_number}`);
      const diffData = await diffRes.json();
      setDiffCode(diffData.diff);

      const sse = new EventSource("http://localhost:3001/sse");

      sse.addEventListener("endpoint", async (event: any) => {
        const endpoint = event.data;
        const targetUrl = endpoint.startsWith("http") ? endpoint : `http://localhost:3001${endpoint}`;
        
        await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: { name: "get_pr_diff", arguments: { owner, repo, pull_number } }
          })
        });
      });

      sse.addEventListener("message", (event: any) => {
        try {
          const data = JSON.parse(event.data);
          if (data.result && data.result.content && data.result.content[0]) {
            setReview(data.result.content[0].text);
            setIsLoading(false);
            sse.close(); 
          }
        } catch (err) {}
      });

      sse.onerror = () => {
        setError("Lost connection to the AI server.");
        setIsLoading(false);
        sse.close();
      };

    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setIsLoading(false);
    }
  };

  const handleApproveAndPush = async () => {
    setIsPushing(true);
    const { owner, repo, pull_number } = getUrlParts();
    
    try {
      const res = await fetch("http://localhost:3001/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, pull_number, reviewText: review })
      });

      if (res.ok) {
        setPushSuccess(true);
      } else {
        setError("Failed to push to GitHub. Check terminal for details.");
      }
    } catch (err) {
      setError("Failed to reach backend.");
    }
    setIsPushing(false);
  };

  // 🧠 COMPILER-SAFE SMART COPY
  const copyToClipboard = () => {
    if (!review) return;

    // Use the RegExp constructor to hide the backticks from the Next.js compiler
    const codeBlockRegex = new RegExp("```[\\w]*\\n([\\s\\S]*?)```", "g");
    let match;
    const extractedCode = [];

    while ((match = codeBlockRegex.exec(review)) !== null) {
      extractedCode.push(match[1].trim());
    }

    if (extractedCode.length > 0) {
      navigator.clipboard.writeText(extractedCode.join('\n\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); 
    } else {
      navigator.clipboard.writeText(review);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-x-hidden">
      <AnimatedBackground />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl z-10 space-y-8 text-center mt-12 mb-24">
        
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tighter bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
            Agentic Code Review
          </h1>
          <p className="text-slate-400 text-lg">Deploy an autonomous MCP agent to audit and fix your Pull Request.</p>
        </div>

        <div className="glass-card p-8 shadow-2xl shadow-cyan-500/10 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-slate-800 max-w-3xl mx-auto">
          <form onSubmit={handleAnalyze} className="relative flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="[https://github.com/owner/repo/pull/123](https://github.com/owner/repo/pull/123)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              suppressHydrationWarning={true}
              className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl py-4 px-6 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
            <button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-8 rounded-xl disabled:opacity-50 transition-colors">
              {isLoading ? "Analyzing..." : "Analyze PR"}
            </button>
          </form>
          {error && <p className="text-red-400 mt-4 text-sm text-left">{error}</p>}
        </div>

        {(diffCode || review) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-left mt-12">
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-950/80 border border-slate-800 rounded-xl p-6 overflow-hidden flex flex-col">
              <h3 className="text-xl font-bold text-slate-300 mb-4">📄 Original PR Code</h3>
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto overflow-y-auto max-h-[600px] flex-1">
                <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap">{diffCode || "Fetching code..."}</pre>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-6 shadow-[0_0_30px_-10px_rgba(6,182,212,0.2)] flex flex-col">
              
              <h3 className="text-xl font-bold text-cyan-400 mb-4 flex items-center justify-between">
                <span><span className="text-2xl mr-2">🤖</span> Sentinel Fixes</span>
                
                {review && !isLoading && (
                  <button 
                    onClick={copyToClipboard}
                    className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-3 rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <><span>✅</span> Copied Snippets!</>
                    ) : (
                      <><span>📋</span> Copy Code</>
                    )}
                  </button>
                )}
              </h3>
              
              <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto overflow-y-auto max-h-[500px] flex-1 mb-6 border border-slate-800">
                {isLoading ? (
                   <p className="text-cyan-400 animate-pulse font-mono text-sm">Rewriting vulnerable code functions...</p>
                ) : (
                   <div className="text-slate-300 font-mono text-sm whitespace-pre-wrap">{review}</div>
                )}
              </div>

              {review && !isLoading && (
                <button 
                  onClick={handleApproveAndPush}
                  disabled={isPushing || pushSuccess}
                  className={`w-full font-bold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg ${
                    pushSuccess 
                      ? "bg-green-500 text-white shadow-green-500/20 cursor-default" 
                      : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20"
                  }`}
                >
                  {pushSuccess ? "✅ Pushed to GitHub!" : isPushing ? "Pushing..." : "Approve & Push to GitHub PR"}
                </button>
              )}
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}