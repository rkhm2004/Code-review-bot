@'
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import DiffViewer from "@/components/DiffViewer";
import ToolCallLog from "@/components/ToolCallLog";
import ReviewActions from "@/components/ReviewActions";
import ReviewComments from "@/components/ReviewComments";
import { apiFetch } from "@/lib/api";

type Finding = {
  id: string;
  title: string;
  status: string;
  category?: string;
  severity?: string;
  description?: string;
  file?: string;
  line?: number;
  evidence?: string;
  recommendation?: string;
  rule_id?: string | null;
  confidence?: number;
};

export default function ReviewPage() {
  const params = useParams();

  const owner = String(params.owner ?? "");
  const repo = String(params.repo ?? "");
  const prNumber = String(params.prNumber ?? "");

  const [diffCode, setDiffCode] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [aiReview, setAiReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const repository = `${owner}/${repo}`;
  const filePath = `github/${owner}/${repo}/pull/${prNumber}`;

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      setLoading(true);
      setError("");

      try {
        const diffResponse = await apiFetch(
          `/diff?owner=${encodeURIComponent(
            owner
          )}&repo=${encodeURIComponent(
            repo
          )}&pull_number=${encodeURIComponent(prNumber)}`
        );

        const diffData = await diffResponse.json();

        if (!diffResponse.ok) {
          throw new Error(diffData.error || "Unable to fetch PR diff.");
        }

        const diff = diffData.diff || "";

        if (cancelled) return;

        setDiffCode(diff);

        if (!diff.trim()) {
          setAiReview("No PR diff was returned for analysis.");
          return;
        }

        const analysisResponse = await apiFetch("/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_code: diff,
            language: "auto",
            file_path: filePath,
            repository,
            ruleset: "MISRA-oriented + Secure Coding",
            use_local_llm: true,
          }),
        });

        const analysisData = await analysisResponse.json();

        if (!analysisResponse.ok) {
          throw new Error(
            analysisData.error || "Unable to analyze PR."
          );
        }

        if (cancelled) return;

        setFindings(analysisData.findings || []);

        const summary = analysisData.summary;
        const localSummary = analysisData.local_llm_summary;

        setAiReview(
          localSummary ||
            `Analysis completed with ${
              summary?.finding_count ?? 0
            } finding(s). ` +
              `High: ${summary?.high_count ?? 0}, ` +
              `Medium: ${summary?.medium_count ?? 0}, ` +
              `Low: ${summary?.low_count ?? 0}. ` +
              `Human review is required before acceptance.`
        );
      } catch (err) {
        if (cancelled) return;

        const message =
          err instanceof Error
            ? err.message
            : "Review loading failed.";

        setError(message);
        setAiReview(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (owner && repo && prNumber) {
      void loadReview();
    } else {
      setError("Invalid repository or pull request parameters.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [owner, repo, prNumber, filePath, repository]);

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <div className="w-4 h-4 border-2 border-cyan-500 rounded-sm" />
          </div>

          <h2 className="font-mono text-sm font-bold tracking-tight">
            {owner} / {repo}
            <span className="text-slate-500 px-2">/</span>
            PR #{prNumber}
          </h2>
        </div>

        <ReviewActions
          findings={findings}
          sourceCode={diffCode}
          language="auto"
          filePath={filePath}
          repository={repository}
        />
      </header>

      {error && (
        <div className="px-6 py-3 border-b border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 overflow-auto border-r border-slate-800 bg-slate-950">
          <div className="p-6">
            <DiffViewer diffCode={diffCode} />
          </div>
        </section>

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

              <ReviewComments
                aiReview={aiReview}
                loading={loading}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
'@ | Set-Content -LiteralPath "frontend/app/review/[owner]/[repo]/[prNumber]/page.tsx"