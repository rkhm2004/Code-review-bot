"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch, currentUser, logout } from "@/lib/api";
import AnimatedBackground from "@/components/AnimatedBackground";
import ReviewActions from "@/components/ReviewActions";

type Finding = {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  file: string;
  line: number;
  evidence: string;
  recommendation: string;
  rule_id?: string | null;
  confidence: number;
  status: string;
};

type Analysis = {
  summary: {
    status: string;
    finding_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    human_review_required: boolean;
  };
  code_structure: {
    language: string;
    lines: number;
    function_count: number;
    functions: string[];
    module_summary: string;
    control_flow_counts: Record<string, number>;
  };
  retrieved_rules: { id: string; category: string; title: string; guidance: string; retrieval_score?: number; retrieval_method?: string; source?: string }[];
  retrieval?: { method: string; source: string; local_only: boolean };
  findings: Finding[];
  evidence: {
    compiler_log_lines: number;
    static_analysis_lines: number;
    runtime_log_lines: number;
  };
  local_llm_summary?: string | null;
  governance: {
    automatic_merge_disabled: boolean;
    human_disposition_required: boolean;
    validation_before_acceptance: boolean;
  };
};

export default function Dashboard() {
  const [prUrl, setPrUrl] = useState("");
  const [sourceCode, setSourceCode] = useState("");
  const [language, setLanguage] = useState("auto");
  const [filePath, setFilePath] = useState("submitted_code");
  const [compilerLog, setCompilerLog] = useState("");
  const [staticAnalysis, setStaticAnalysis] = useState("");
  const [runtimeLog, setRuntimeLog] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [diff, setDiff] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("cs4_access_token");
    if (!token) { window.location.href = "/login"; return; }
    setUser(currentUser());
    apiFetch("/metrics").then(r => r.ok ? r.json() : null).then(setMetrics).catch(() => null);
  }, []);

  const findingCounts = useMemo(() => {
    if (!analysis) return [];
    return [
      ["HIGH", analysis.summary.high_count],
      ["MEDIUM", analysis.summary.medium_count],
      ["LOW", analysis.summary.low_count],
    ];
  }, [analysis]);

  const runAnalysis = async () => {
    setBusy(true);
    setError("");
    try {
      let code = sourceCode;
      if (prUrl) {
        const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
        if (!match) throw new Error("Invalid GitHub Pull Request URL.");
        const [, owner, repo, pull_number] = match;
        const backendDiff = await apiFetch(
          `/diff?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&pull_number=${pull_number}`
        );
        const diffData = await backendDiff.json();
        if (!backendDiff.ok) throw new Error(diffData.error || "Unable to fetch PR diff.");
        setDiff(diffData.diff || "");
        if (!code) code = diffData.diff || "";
      }

      if (!code.trim()) throw new Error("Provide source code or a GitHub PR URL.");

      const response = await apiFetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: code,
          language,
          file_path: filePath,
          compiler_log: compilerLog,
          static_analysis: staticAnalysis,
          runtime_log: runtimeLog,
          repository: prUrl ? (() => { const m = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/); return m ? m[1] + "/" + m[2] : ""; })() : "",
          ruleset: "MISRA-oriented + Secure Coding",
          use_local_llm: true,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Analysis failed.");
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message || "Analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#05070A] text-[#c9d1d9] p-6 md:p-8 relative overflow-hidden">
      <AnimatedBackground />
      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-cyan-400 tracking-[0.3em]">CASE STUDY 4</p>
            <h1 className="text-3xl md:text-4xl font-black text-white">Secure Code Debugging & Review Assistant</h1>
            <p className="text-sm text-gray-400 mt-2">Local evidence-driven analysis with human reviewer control.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded border border-green-500/30 bg-green-500/5 text-green-300 text-xs font-mono">AUTO-MERGE: DISABLED</div>
            <div className="text-xs text-gray-400">{user?.username} · {user?.role}</div>
            <button onClick={logout} className="text-xs px-3 py-2 rounded border border-gray-700">Sign out</button>
          </div>
        </header>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className="bg-[#0d1117]/90 border border-[#30363d] rounded-xl p-5 space-y-4">
            <h2 className="font-mono text-cyan-300">1. Code / Repository Input</h2>
            <input value={prUrl} onChange={e => setPrUrl(e.target.value)}
              placeholder="GitHub PR URL (optional)"
              className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500" />
            <div className="grid grid-cols-2 gap-3">
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="bg-black border border-gray-800 rounded px-3 py-2 text-sm">
                <option value="auto">Auto language</option><option value="python">Python</option>
                <option value="javascript">JavaScript</option><option value="typescript">TypeScript</option>
                <option value="c">C</option><option value="cpp">C++</option><option value="java">Java</option>
              </select>
              <input value={filePath} onChange={e => setFilePath(e.target.value)}
                className="bg-black border border-gray-800 rounded px-3 py-2 text-sm" placeholder="src/example.c" />
            </div>
            <textarea value={sourceCode} onChange={e => setSourceCode(e.target.value)}
              placeholder="Paste source code here, or provide a PR URL above..."
              className="w-full h-56 bg-black border border-gray-800 rounded p-3 font-mono text-xs resize-y focus:outline-none focus:border-cyan-500" />
            <button onClick={runAnalysis} disabled={busy}
              className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-bold rounded px-4 py-3">
              {busy ? "ANALYZING..." : "RUN SECURE CODE ANALYSIS"}
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <div className="bg-[#0d1117]/90 border border-[#30363d] rounded-xl p-5 space-y-4">
            <h2 className="font-mono text-cyan-300">2. Engineering Evidence</h2>
            <textarea value={compilerLog} onChange={e => setCompilerLog(e.target.value)}
              placeholder="Compiler / build log..."
              className="w-full h-24 bg-black border border-gray-800 rounded p-3 font-mono text-xs" />
            <textarea value={staticAnalysis} onChange={e => setStaticAnalysis(e.target.value)}
              placeholder="Static-analysis output (JSON/text)..."
              className="w-full h-24 bg-black border border-gray-800 rounded p-3 font-mono text-xs" />
            <textarea value={runtimeLog} onChange={e => setRuntimeLog(e.target.value)}
              placeholder="Runtime log (optional)..."
              className="w-full h-24 bg-black border border-gray-800 rounded p-3 font-mono text-xs" />
            <div className="rounded border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
              Repository code and logs are treated as untrusted evidence. They cannot override the review policy.
            </div>
          </div>
        </section>

        {diff && (
          <section className="bg-black/80 border border-gray-800 rounded-xl p-4">
            <h2 className="font-mono text-xs text-gray-400 mb-2">REPOSITORY / PR EVIDENCE</h2>
            <pre className="max-h-72 overflow-auto text-xs text-gray-300 whitespace-pre-wrap">{diff}</pre>
          </section>
        )}

        {analysis && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="panel"><span>STATUS</span><b>{analysis.summary.status}</b></div>
              <div className="panel"><span>FINDINGS</span><b>{analysis.summary.finding_count}</b></div>
              {findingCounts.map(([name, count]) => <div className="panel" key={name}><span>{name}</span><b>{count}</b></div>)}
              <div className="panel"><span>LANGUAGE</span><b>{analysis.code_structure.language}</b></div>
              <div className="panel"><span>RAG</span><b>{analysis.retrieval?.method === "faiss_sentence_transformers" ? "FAISS + Embeddings" : analysis.retrieval?.method || "local"}</b></div>
            </section>

            <section className="grid lg:grid-cols-2 gap-5">
              <div className="bg-[#0d1117]/90 border border-[#30363d] rounded-xl p-5">
                <h2 className="font-mono text-cyan-300 mb-3">Code Understanding</h2>
                <p className="text-sm text-gray-300">{analysis.code_structure.module_summary}</p>
                <p className="text-xs text-gray-500 mt-3">Functions: {analysis.code_structure.functions.join(", ") || "None detected"}</p>
                <pre className="text-xs text-gray-500 mt-3">{JSON.stringify(analysis.code_structure.control_flow_counts, null, 2)}</pre>
              </div>
              <div className="bg-[#0d1117]/90 border border-[#30363d] rounded-xl p-5">
                <h2 className="font-mono text-cyan-300 mb-3">Retrieved Guidance</h2>
                <div className="space-y-2">
                  {analysis.retrieved_rules.map(rule => (
                    <div key={rule.id} className="border border-gray-800 rounded p-3">
                      <p className="text-xs text-cyan-400">{rule.id} · {rule.category}</p>
                      <p className="text-sm text-white">{rule.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{rule.guidance}</p>
                      {rule.retrieval_score !== undefined && <p className="text-[10px] text-gray-500 mt-2">Semantic score: {rule.retrieval_score} · {rule.source || "local knowledge base"}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {analysis.local_llm_summary && (
              <section className="bg-[#0d1117]/90 border border-purple-500/20 rounded-xl p-5">
                <h2 className="font-mono text-purple-300 mb-2">Local LLM Summary</h2>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{analysis.local_llm_summary}</p>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="font-mono text-cyan-300">Evidence-Based Findings</h2>
              {analysis.findings.length === 0 && <div className="p-5 rounded-xl border border-green-500/20 text-green-300">No definite finding detected. Human review is still recommended.</div>}
              {analysis.findings.map(f => <FindingCard key={f.id} finding={f} />)}
            </section>

            <ReviewActions findings={analysis.findings} sourceCode={sourceCode} language={language} filePath={filePath} repository={prUrl ? (() => { const m = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/); return m ? m[1] + "/" + m[2] : ""; })() : ""} />
            <section className="bg-[#0d1117]/90 border border-cyan-500/20 rounded-xl p-5 flex flex-wrap gap-3 items-center"><span className="font-mono text-cyan-300 text-sm">Operational metrics</span><span className="text-xs text-gray-400">Analyses: {metrics?.analyses ?? "—"}</span><span className="text-xs text-gray-400">Findings: {metrics?.findings_reported ?? "—"}</span><span className="text-xs text-gray-400">Accepted: {metrics?.accepted_findings ?? "—"}</span><button onClick={async () => { const r = await apiFetch("/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysis, file_path: filePath }) }); const d = await r.json(); if (!r.ok) { setError(d.error || "Report export failed."); return; } const blob = new Blob([d.content], { type: "text/markdown" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = d.filename || "cs4-review-report.md"; a.click(); URL.revokeObjectURL(url); }} className="ml-auto px-3 py-2 rounded bg-cyan-700/60 text-xs">Export Markdown Report</button></section>
          </>
        )}
      </div>
      <style jsx>{`
        .panel { background: rgba(13,17,23,.9); border: 1px solid #30363d; border-radius: .75rem; padding: .8rem; display:flex; flex-direction:column; gap:.3rem; }
        .panel span { font: 10px ui-monospace, SFMono-Regular, Menlo, monospace; color:#6b7280; }
        .panel b { font: 14px ui-monospace, SFMono-Regular, Menlo, monospace; color:#e5e7eb; }
      `}</style>
    </main>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const severity = finding.severity === "HIGH" ? "border-red-500/40" : finding.severity === "MEDIUM" ? "border-amber-500/40" : "border-blue-500/40";
  return (
    <article className={`bg-[#0d1117]/90 border ${severity} rounded-xl p-5 space-y-3`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-cyan-400">{finding.id}</span>
        <span className="font-mono text-xs px-2 py-1 rounded bg-gray-900">{finding.severity}</span>
        <span className="font-mono text-xs px-2 py-1 rounded bg-gray-900">{finding.category}</span>
        <span className="font-mono text-xs text-gray-500">confidence {Math.round(finding.confidence * 100)}%</span>
      </div>
      <h3 className="text-lg font-semibold text-white">{finding.title}</h3>
      <p className="text-sm text-gray-300">{finding.description}</p>
      <div className="bg-black rounded border border-gray-800 p-3">
        <p className="text-[10px] text-gray-500 mb-1">{finding.file}:{finding.line}</p>
        <pre className="text-xs text-red-200 whitespace-pre-wrap">{finding.evidence}</pre>
      </div>
      {finding.rule_id && <p className="text-xs text-cyan-300">Guidance: {finding.rule_id}</p>}
      <p className="text-sm text-green-300"><b>Recommendation:</b> {finding.recommendation}</p>
      <p className="text-xs text-gray-500">Status: {finding.status} · Human validation required before acceptance.</p>
    </article>
  );
}
