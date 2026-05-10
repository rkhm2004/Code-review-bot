'use client';

import { useParams } from 'next/navigation';
import DiffViewer from '@/components/DiffViewer';
import ToolCallLog from '@/components/ToolCallLog';
import ReviewActions from '@/components/ReviewActions';
import ReviewComments from '@/components/ReviewComments';
import { motion } from 'framer-motion';

export default function ReviewPage() {
  const params = useParams();
  const { owner, repo, prNumber } = params;

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Header Bar */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <div className="w-4 h-4 border-2 border-cyan-500 rounded-sm" />
          </div>
          <h2 className="font-mono text-sm font-bold tracking-tight">
            {owner} / {repo} <span className="text-slate-500 px-2">/</span> PR #{prNumber}
          </h2>
        </div>
        <ReviewActions />
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Code Diff */}
        <section className="flex-1 overflow-auto border-r border-slate-800 bg-slate-950">
          <div className="p-6">
            <DiffViewer owner={owner as string} repo={repo as string} prNumber={Number(prNumber)} />
          </div>
        </section>

        {/* Right Side: Agent Logs & Comments */}
        <aside className="w-[400px] flex flex-col bg-slate-900/30">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">
                Agent Activity
              </h3>
              <ToolCallLog />
            </div>
            
            <hr className="border-slate-800" />
            
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">
                Critical Findings
              </h3>
              <ReviewComments />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}