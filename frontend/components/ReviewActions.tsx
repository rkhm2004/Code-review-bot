'use client';

import { ShieldCheck, MessageSquare, XCircle } from 'lucide-react';

export default function ReviewActions() {
  return (
    <div className="flex items-center gap-2">
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 text-xs font-bold transition-all">
        <ShieldCheck size={14} />
        Approve
      </button>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all">
        <XCircle size={14} />
        Request Changes
      </button>
    </div>
  );
}