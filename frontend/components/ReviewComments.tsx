"use client";

import { useState } from "react";

export default function ReviewComments({ aiReview, loading }: { aiReview: string, loading: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!aiReview) return;
    navigator.clipboard.writeText(aiReview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 font-mono text-sm text-[#0EA5E9] flex justify-between items-center">
        <span>Sentinel AI Thoughts</span>
        
        <div className="flex items-center gap-4">
          {loading && <span className="animate-pulse text-gray-400">Agent is typing...</span>}
          <button 
            onClick={handleCopy}
            disabled={!aiReview}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1 rounded transition-colors disabled:opacity-50"
          >
            {copied ? "Copied!" : "Copy Output"}
          </button>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-1 font-sans text-gray-200 whitespace-pre-wrap">
        {aiReview ? aiReview : "Waiting for AI Agent to begin review..."}
      </div>
    </div>
  );
}