"use client";

import { useState } from "react";

type Finding = {
  id: string;
  title: string;
  status: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const REVIEWER_ID = "local-reviewer";

export default function ReviewActions({
  findings,
  sourceCode,
  language,
  filePath,
}: {
  findings: Finding[];
  sourceCode: string;
  language: string;
  filePath: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const dispose = async (
    findingId: string,
    status: "ACCEPTED" | "REJECTED" | "EDITED"
  ) => {
    setBusy(findingId + status);
    setMessage("");

    try {
      if (status === "ACCEPTED") {
        const validation = await fetch(API_URL + "/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_code: sourceCode,
            language,
            file_path: filePath,
          }),
        });

        const validationData = await validation.json();

        if (!validation.ok || !validationData.validated) {
          throw new Error(
            validationData.message ||
              "Source validation failed. Do not accept yet."
          );
        }
      }

      const response = await fetch(API_URL + "/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finding_id: findingId,
          status,
          reviewer_id: REVIEWER_ID,
          reviewer_note:
            "Disposition recorded by qualified human reviewer.",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || data.message || "Disposition failed."
        );
      }

      setMessage(
        findingId + ": " + status + " — human disposition recorded."
      );
    } catch (e: any) {
      setMessage(e.message || "Disposition failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-[#0d1117]/95 border border-green-500/20 rounded-xl p-5">
      <h2 className="font-mono text-green-300">
        Human Review & Disposition
      </h2>

      <p className="text-xs text-gray-400 mt-1">
        AI cannot merge or release code. Validate the evidence and test any
        proposed change first.
      </p>

      <div className="mt-4 space-y-2">
        {findings.map((finding) => (
          <div
            key={finding.id}
            className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-2"
          >
            <span className="text-sm text-gray-300 flex-1">
              {finding.id} · {finding.title}
            </span>

            <button
              disabled={!!busy}
              onClick={() => dispose(finding.id, "ACCEPTED")}
              className="px-3 py-1 rounded bg-green-700/60 text-xs disabled:opacity-50"
            >
              Accept
            </button>

            <button
              disabled={!!busy}
              onClick={() => dispose(finding.id, "EDITED")}
              className="px-3 py-1 rounded bg-cyan-700/60 text-xs disabled:opacity-50"
            >
              Edit/Validate
            </button>

            <button
              disabled={!!busy}
              onClick={() => dispose(finding.id, "REJECTED")}
              className="px-3 py-1 rounded bg-red-700/60 text-xs disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ))}
      </div>

      {message && (
        <p className="text-xs text-cyan-300 mt-3">
          {message}
        </p>
      )}
    </section>
  );
}
