"use client";

import { useState, useEffect } from "react";
// Import all your beautiful components!
import AnimatedBackground from "@/components/AnimatedBackground";
import DiffViewer from "@/components/DiffViewer";
import ReviewComments from "@/components/ReviewComments";
import ReviewActions from "@/components/ReviewActions";

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
    const eventSource = new EventSource("http://localhost:3001/sse");

    eventSource.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.result && data.result.content && data.result.content.length > 0) {
          setAiReview(data.result.content[0].text);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error parsing AI message:", err);
      }
    });

    return () => eventSource.close();
  }, []);

  // ============================================================================
  // 2. THE ANALYZE FUNCTION
  // ============================================================================
  const analyzePR = async () => {
    setError("");
    setDiffCode("");
    setAiReview("");

    const cleanUrl = url.trim();
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);

    if (!match) {
      setError("Invalid GitHub PR URL. Please paste a direct link to a Pull Request.");
      return;
    }

    const [, owner, repo, pull_number] = match;
    setLoading(true);

    try {
      const diffResponse = await fetch(`http://localhost:3001/diff?owner=${owner}&repo=${repo}&pull_number=${pull_number}`);
      if (!diffResponse.ok) throw new Error("Backend failed to fetch the Pull Request code.");
      
      const diffData = await diffResponse.json();
      setDiffCode(diffData.diff);

      const aiResponse = await fetch("http://localhost:3001/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "tools/call", params: { name: "get_pr_diff" } })
      });

      if (!aiResponse.ok) throw new Error("Failed to wake up the AI Agent.");

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ============================================================================
  // 3. THE MODULAR UI LAYOUT
  // ============================================================================
  return (
    <div className="relative min-h-screen bg-[#0B1120] text-white font-sans overflow-hidden">
      
      {/* Background Animation */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatedBackground />
      </div>

      {/* Main Container */}
      <div className="relative z-10 p-8 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mt-6 mb-10">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 text-gray-100">
            Agentic Code Review
          </h1>
          <p className="text-xl text-gray-400">
            Deploy an autonomous MCP agent to audit and fix your Pull Request.
          </p>
        </div>

        {/* Input Field */}
        <div className="max-w-3xl mx-auto bg-[#0F172A] border border-gray-800 rounded-xl p-6 shadow-2xl mb-12">
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
          {error && <p className="text-red-400 mt-4 text-sm font-medium">{error}</p>}
        </div>

        {/* Results Grid (Powered by your modular components!) */}
        {(diffCode || aiReview) && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DiffViewer diffCode={diffCode} />
              <ReviewComments aiReview={aiReview} loading={loading} />
            </div>
            
            {/* The Action Buttons at the bottom */}
            <ReviewActions />
          </div>
        )}

      </div>
    </div>
  );
}