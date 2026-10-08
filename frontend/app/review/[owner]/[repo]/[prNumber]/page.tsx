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
  category?: string;
  severity?: string;
  description?: string;
  recommendation?: string;
  root_cause?: string;
  rule_id?: string | null;
  status: string;
};

export default function ReviewPage() {
  const params = useParams<{ owner: string; repo: string; prNumber: string }>();
  const owner = params.owner;
  const repo = params.repo;
  const prNumber = Number(params.prNumber);
  const repository = owner && repo ? `${owner}/${repo}` : "";

  const [diff, setDiff] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [aiReview, setAiReview] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReview() {
      setLoading(true);
      setError("");
      try {
        const diffResponse = await apiFetch(
          `/diff?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&pull_number=${prNumber}`
        );
        const diffData = await diffResponse.json();
        if (!diffResponse.ok) throw new Error(diffData.error || "Unable to fetch pull request diff.");

        const source = diffData.diff || "";
        if (cancelled) return;
        setDiff(source);

        if (!source.trim()) {
          setAiReview("No changed-code diff was returned for this pull request.");
          return;
        }

        const analysisResponse = await apiFetch("/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_code: source,
            language: "auto",
            file_path: `PR-${prNumber}-diff`,
            repository,
            ruleset: "MISRA-oriented + Secure Coding",
            use_local_llm: true,
          }),
        });
        const analysisData = await analysisResponse.json();
        if (!analysisResponse.ok) throw new Error(analysisData.error || "Unable to analyze pull request.");

        if (cancelled) return;
        setFindings(analysisData.findings || []);
        setAiReview(
          analysisData.local_llm_summary ||
          `Analysis status: ${analysisData.summary?.status || "NEEDS_REVIEW"}. Findings: ${analysisData.findings?.length || 0}.`
        );
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Pull request review failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (owner && repo && Number.isFinite(prNumber)) loadReview();
    else {
      setError("Invalid pull request route.");
      setLoading(false);
    }

    return () => { cancelled = true; };
  }, [owner, repo, prNumber, repository]);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-cyan-500/10 rounded-lg">
            <div className="w-4 h-4 border-2 border-cyan-500 rounded-sm" />
          </div>
          <h2 className="font-mono text-sm font-bold tracking-tight">
            {owner} / {repo} <span className="text-slate-500 px-2">/</span> PR #{prNumber}
          </h2>
        </div>
        <span className="text-xs text-amber-300">Human review required · auto-merge disabled</span>
      </header>

      {error && <div className="mx-4 mt-4 rounded border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</div>}

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 overflow-auto border-r border-slate-800 bg-slate-950 p-6">
          <DiffViewer diffCode={diff} />
        </section>

        <aside className="w-[420px] flex flex-col bg-slate-900/30">
          <div className="flex-1 overflow-auto p-4 space-y-4">
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">Agent Activity</h3>
              <ToolCallLog />
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-2">AI Review</h3>
              <ReviewComments aiReview={aiReview} loading={loading} />
            </div>

            <ReviewActions
              findings={findings}
              sourceCode={diff}
              language="auto"
              filePath={`PR-${prNumber}-diff`}
              repository={repository}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
