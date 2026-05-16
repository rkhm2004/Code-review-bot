"use client";

import { useState } from "react";

export default function ReviewActions({ url }: { url: string }) {
  const [merging, setMerging] = useState(false);

  const handleApprove = async () => {
    // 1. Extract the PR details from the URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return;
    
    const [, owner, repo, pull_number] = match;
    setMerging(true);

    try {
      // 2. Send the command to your Fastify backend
      const response = await fetch("http://localhost:3001/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo, pull_number })
      });

      const data = await response.json();

      // 3. Show the result
      if (response.ok) {
        alert(`🎉 PR Successfully Merged in GitHub!\n\nMessage: ${data.message}`);
      } else {
        alert(`❌ GitHub Error: ${data.error}`);
      }
    } catch (err) {
      alert("Failed to reach the backend.");
    }
    
    setMerging(false);
  };

  const handleReject = () => {
    alert("In the future, this will post a comment requesting changes!");
  };

  return (
    <div className="mt-8 flex justify-end gap-4 border-t border-gray-800 pt-6">
      <button 
        onClick={handleReject}
        disabled={merging}
        className="px-6 py-2 bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10 font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        Request Changes
      </button>
      <button 
        onClick={handleApprove}
        disabled={merging}
        className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50"
      >
        {merging ? "Merging on GitHub..." : "Approve & Merge"}
      </button>
    </div>
  );
}