'use client';

import { AlertCircle } from 'lucide-react';

export default function ReviewComments() {
  const findings = [
    { id: 1, severity: 'high', file: 'auth.ts', message: 'Potential SQL injection vulnerability detected.' },
  ];

  return (
    <div className="space-y-3">
      {findings.map((f) => (
        <div key={f.id} className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Security Alert</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {f.message}
          </p>
          <div className="text-[10px] font-mono text-slate-500">
            at {f.file}
          </div>
        </div>
      ))}
    </div>
  );
}