'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, GitPullRequest } from 'lucide-react';

export default function PRInput() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (match) {
      const [, owner, repo, prNumber] = match;
      router.push(`/review/${owner}/${repo}/${prNumber}`);
    } else {
      alert("Please enter a valid GitHub Pull Request URL.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleAnalyze} className="relative group">
      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
        <GitPullRequest size={20} />
      </div>
      <input
        type="text"
        placeholder="https://github.com/owner/repo/pull/123"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-4 pl-12 pr-32 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm font-mono"
      />
      <button
        type="submit"
        disabled={!url || loading}
        className="absolute right-2 top-2 bottom-2 px-6 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:hover:bg-cyan-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
      >
        {loading ? "Initializing..." : "Analyze"}
        <ArrowRight size={14} />
      </button>
    </form>
  );
}