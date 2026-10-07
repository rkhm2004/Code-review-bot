"use client";

import { useState } from "react";

type Finding = { id: string; title: string; status: string };

export default function ReviewActions({ findings }: { findings: Finding[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const dispose = async (findingId: string, status: "ACCEPTED" | "REJECTED" | "EDITED") => {
    setBusy(findingId + status);
    setMessage("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_id: findingId,
          status,
          reviewer_note: "Disposition recorded by qualified human reviewer."
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Disposition failed");
      setMessage(`${findingId}: ${status}`);
    } catch (e: any) {
      setMessage(e.message || "Disposition failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-[#0d1117]/95 border border-green-500/20 rounded-xl p-5">
      <h2 className="font-mono text-green-300">Human Review & Disposition</h2>
      <p className="text-xs text-gray-400 mt-1">AI cannot merge or release code. Validate the evidence and test any proposed change first.</p>
      <div className="mt-4 space-y-2">
        {findings.map(f => (
          <div key={f.id} className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-2">
            <span className="text-sm text-gray-300 flex-1">{f.id} · {f.title}</span>
            <button disabled={!!busy} onClick={() => dispose(f.id, "ACCEPTED")} className="px-3 py-1 rounded bg-green-700/60 text-xs">Accept</button>
            <button disabled={!!busy} onClick={() => dispose(f.id, "EDITED")} className="px-3 py-1 rounded bg-cyan-700/60 text-xs">Edit/Validate</button>
            <button disabled={!!busy} onClick={() => dispose(f.id, "REJECTED")} className="px-3 py-1 rounded bg-red-700/60 text-xs">Reject</button>
          </div>
        ))}
      </div>
      {message && <p className="text-xs text-cyan-300 mt-3">{message}</p>}
    </section>
  );
}
