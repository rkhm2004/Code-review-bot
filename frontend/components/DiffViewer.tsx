"use client";

export default function DiffViewer({ diffCode }: { diffCode: string }) {
  return (
    <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[600px] shadow-2xl">
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 font-mono text-sm text-gray-400">
        PR Code Diff
      </div>
      <div className="p-4 overflow-y-auto flex-1 font-mono text-sm text-gray-300 whitespace-pre-wrap">
        {diffCode ? diffCode : "Downloading code from GitHub..."}
      </div>
    </div>
  );
}