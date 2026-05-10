'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, CheckCircle2, Loader2 } from 'lucide-react';

export default function ToolCallLog() {
  // Static example for now - will be replaced with live SSE data later
  const logs = [
    { id: 1, type: 'tool', name: 'get_pr_diff', status: 'completed' },
    { id: 2, type: 'action', name: 'Analyzing logic flow...', status: 'loading' },
  ];

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {logs.map((log) => (
          <motion.div
            key={log.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-[11px] font-mono"
          >
            {log.status === 'completed' ? (
              <CheckCircle2 size={14} className="text-green-500" />
            ) : (
              <Loader2 size={14} className="text-cyan-500 animate-spin" />
            )}
            <span className="text-slate-400">
              {log.type === 'tool' ? 'CALL' : 'EXEC'}:
            </span>
            <span className="text-slate-100">{log.name}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}