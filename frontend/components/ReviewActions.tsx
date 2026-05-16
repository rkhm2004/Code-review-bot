'use client';

import React, { useState } from 'react';

export default function ReviewActions({ url }: { url: string }) {
  const [isMerging, setIsMerging] = useState(false);

  const handleApprove = async () => {
    setIsMerging(true);
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
      if (!match) {
        alert("Invalid GitHub Pull Request URL.");
        setIsMerging(false);
        return;
      }
      const [, owner, repo, pull_number] = match;

      // 🚨 UPDATED TO PORT 3005 🚨
      const res = await fetch('http://localhost:3005/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ owner, repo, pull_number })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(`✅ SUCCESS: ${data.message}`);
      } else {
        alert(`❌ PIPELINE ERROR: ${data.error}`);
      }
    } catch (err) {
      console.error("Action Error:", err);
      alert("Failed to reach the backend.");
    }
    setIsMerging(false);
  };

  return (
    <div className="flex gap-4 justify-end">
      <button 
        className="px-6 py-2 rounded-lg text-sm font-medium border border-[#30363d] text-gray-300 hover:bg-[#30363d] transition-colors"
        onClick={() => alert("Change requests would be sent to GitHub review system.")}
      >
        Request Changes
      </button>
      
      <button
        onClick={handleApprove}
        disabled={isMerging}
        className="bg-green-600 hover:bg-green-700 disabled:bg-green-900 text-white font-medium px-6 py-2 rounded-lg text-sm transition-all transform active:scale-95 shadow-lg"
      >
        {isMerging ? 'Merging on GitHub...' : 'Approve & Merge'}
      </button>
    </div>
  );
}