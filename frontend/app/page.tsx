"use client";

import { useState, useEffect } from "react";
// Import your awesome neural network background component!
import AnimatedBackground from "@/components/AnimatedBackground"; 

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [diffCode, setDiffCode] = useState("");
  const [aiReview, setAiReview] = useState("");

  // ============================================================================
  // 1. THE WALKIE-TALKIE (SSE) LISTENER
  // ============================================================================
  useEffect(() => {
    // Connect to the backend's Walkie-Talkie stream
    const eventSource = new EventSource("http://localhost:3001/sse");

    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        // If the AI sends a review back, update the UI!
        if (data.result && data.result.content && data.result.content.length > 0) {
          setAiReview(data.result.content[0].text);
          setLoading(false); // Stop the loading spinner
        }
      } catch (err) {
        console.error("Error parsing AI message:", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  // ============================================================================
  // 2. THE BULLETPROOF ANALYZE FUNCTION
  // ============================================================================
  const analyzePR = async () => {
    setError("");
    setDiffCode("");
    setAiReview("");

    // 🛡️ The Bulletproof Regex Parser
    const cleanUrl = url.trim();
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);

    if (!match) {
      setError("Invalid GitHub PR URL. Please paste a direct link to a Pull Request.");
      return;
    }

    const [, owner, repo, pull_number] = match;
    setLoading(true);

    try {
      // Step A: Ask the backend to download the GitHub code
      const diffResponse = await fetch(`http://localhost:3001/diff?owner=${owner}&repo=${repo}&pull_number=${pull_number}`);
      
      if (!diffResponse.ok) {
        throw new Error("Backend failed to fetch the Pull Request code.");
      }

      const diffData = await diffResponse.json();
      setDiffCode(diffData.diff);

      // Step B: Tell the AI Agent to start reviewing the code
      const aiResponse = await fetch("http://localhost:3001/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "tools/call",
          params: { name: "get_pr_diff" }
        })
      });

      if (!aiResponse.ok) {
        throw new Error("Failed to wake up the AI Agent.");
      }

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ============================================================================
  // 3. THE UI LAYOUT
  // ============================================================================
  return (
    <div className="relative min-h-screen bg-[#0B1120] text-white font-sans overflow-hidden">
      
      {/* 🌟 1. THE NEURAL NETWORK ANIMATION (Z-0 so it sits in the back) 🌟 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatedBackground />
      </div>

      {/* 🌟 2. THE MAIN UI (Z-10 so it sits on top and buttons are clickable!) 🌟 */}
      <div className="relative z-10 p-8">
        
        {/* Header Section */}
        <div className="max-w-4xl mx-auto text-center mt-12 mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-gray-100">
            Agentic Code Review
          </h1>
          <p className="text-xl text-gray-400">
            Deploy an autonomous MCP agent to audit and fix your Pull Request.
          </p>
        </div>

        {/* Input Section */}
        <div className="max-w-3xl mx-auto bg-[#0F172A] border border-gray-800 rounded-xl p-6 shadow-2xl">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="https://github.com/owner/repo/pull/123"
              className="flex-1 bg-[#0B1120] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0EA5E9] transition-colors"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyzePR()}
            />
            <button
              onClick={analyzePR}
              disabled={loading}
              className="bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-bold py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Analyzing..." : "Analyze PR"}
            </button>
          </div>
          
          {/* Error Message */}
          {error && (
            <p className="text-red-400 mt-4 text-sm font-medium">
              {error}
            </p>
          )}
        </div>

        {/* Results Section */}
        {(diffCode || aiReview) && (
          <div className="max-w-7xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Side: Original Code */}
            <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
              <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 font-mono text-sm text-gray-400">
                PR Code Diff
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-mono text-sm text-gray-300 whitespace-pre-wrap">
                {diffCode ? diffCode : "Downloading code from GitHub..."}
              </div>
            </div>

            {/* Right Side: AI Review */}
            <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
              <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 font-mono text-sm text-[#0EA5E9] flex justify-between">
                <span>Sentinel AI Thoughts</span>
                {loading && <span className="animate-pulse">Agent is typing...</span>}
              </div>
              <div className="p-4 overflow-y-auto flex-1 font-sans text-gray-200 whitespace-pre-wrap">
                {aiReview ? aiReview : "Waiting for AI Agent to begin review..."}
              </div>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
}