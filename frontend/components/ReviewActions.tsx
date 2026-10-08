"use client";

import { useState } from "react";
import { apiFetch, currentUser } from "@/lib/api";

type Finding = {
  id: string;
  title: string;
  category?: string;
  severity?: string;
  description?: string;
  recommendation?: string;
  root_cause?: string;
  rule_id?: string | null;
  status: string;
};



export default function ReviewActions({ findings, sourceCode, language, filePath, repository = "" }: {
  findings: Finding[]; sourceCode: string; language: string; filePath: string; repository?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dispositioned, setDispositioned] = useState<Record<string, Finding["status"]>>({});
  const role = currentUser()?.role as string | undefined;
  const canDispose = role === "ADMIN" || role === "REVIEWER";

  const dispose = async (finding: Finding, status: "ACCEPTED" | "REJECTED" | "EDITED") => {
    setBusy(finding.id + status);
    setMessage("");
    try {
      if (status === "ACCEPTED") {
        const validation = await apiFetch("/validate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_code: sourceCode, language, file_path: filePath }),
        });
        const validationData = await validation.json();
        if (!validation.ok || !validationData.validated) throw new Error(validationData.message || "Source validation failed. Do not accept yet.");
      }
      const response = await apiFetch("/disposition", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_id: finding.id, status, reviewer_id: currentUser()?.username || "authenticated-reviewer",
          reviewer_note: "Disposition recorded by qualified human reviewer.",
          file_path: filePath, repository, finding,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || data.message || "Disposition failed.");
      setDispositioned((previous) => ({
        ...previous,
        [finding.id]: status,
      }));
      setMessage(finding.id + ": " + status + " — human disposition recorded.");
    } catch (e: any) {
      setMessage(e.message || "Disposition failed.");
    } finally { setBusy(null); }
  };

  return (
    <section className="bg-[#0d1117]/95 border border-green-500/20 rounded-xl p-5">
      <h2 className="font-mono text-green-300">Human Review & Disposition</h2>
      <p className="text-xs text-gray-400 mt-1">AI cannot merge or release code. Validate the evidence and test any proposed change first. Role: {role || "unknown"}.</p>
      <div className="mt-4 space-y-2">
        {findings.map((finding) => {
          const currentStatus = dispositioned[finding.id] || finding.status;
          const finalized = currentStatus === "ACCEPTED" || currentStatus === "REJECTED";

          return (
            <div key={finding.id} className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-2">
              <span className="text-sm text-gray-300 flex-1">
                {finding.id} · {finding.title}
              </span>
              <span className="text-[10px] font-mono text-gray-500">{currentStatus}</span>
              {canDispose ? (
                <>
                  <button disabled={!!busy || finalized} onClick={() => dispose(finding, "ACCEPTED")} className="px-3 py-1 rounded bg-green-700/60 text-xs disabled:opacity-50">Accept</button>
                  <button disabled={!!busy || finalized} onClick={() => dispose(finding, "EDITED")} className="px-3 py-1 rounded bg-cyan-700/60 text-xs disabled:opacity-50">Edit/Validate</button>
                  <button disabled={!!busy || finalized} onClick={() => dispose(finding, "REJECTED")} className="px-3 py-1 rounded bg-red-700/60 text-xs disabled:opacity-50">Reject</button>
                </>
              ) : (
                <span className="text-xs text-gray-500">Read-only reviewer controls for this role.</span>
              )}
            </div>
          );
        })}
      </div>
      {message && <p className="text-xs text-cyan-300 mt-3">{message}</p>}
    </section>
  );
}
