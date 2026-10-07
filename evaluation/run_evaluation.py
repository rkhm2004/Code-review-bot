from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "analysis-service"
sys.path.insert(0, str(SERVICE))

from app import heuristic_findings
from rag import retrieve_guidance

DATASET = ROOT / "evaluation" / "dataset.jsonl"
OUTPUT = ROOT / "evaluation" / "metrics.json"


def f1(p: float, r: float) -> float:
    return 2 * p * r / (p + r) if p + r else 0.0


def main() -> None:
    cases = [json.loads(line) for line in DATASET.read_text(encoding="utf-8").splitlines() if line.strip()]
    tp = fp = fn = 0
    severity_hits = 0
    severity_total = 0
    hit1 = hit3 = hit5 = 0
    rr_total = 0.0
    retrieval_cases = 0

    for case in cases:
        findings = heuristic_findings(case["source"], case["language"])
        predicted = {f.get("rule_id") for f in findings if f.get("rule_id")}
        expected = set(case.get("expected_rule_ids", []))
        tp += len(predicted & expected)
        fp += len(predicted - expected)
        fn += len(expected - predicted)

        if case.get("expected_severity"):
            severity_total += 1
            if any(f.get("severity") == case["expected_severity"] for f in findings):
                severity_hits += 1

        if expected:
            retrieval_cases += 1
            try:
                results = retrieve_guidance(case["source"], top_k=5)
                ranked = [r.get("id") for r in results]
                first_rank = next((i + 1 for i, rid in enumerate(ranked) if rid in expected), None)
                if first_rank:
                    rr_total += 1.0 / first_rank
                    if first_rank <= 1: hit1 += 1
                    if first_rank <= 3: hit3 += 1
                    if first_rank <= 5: hit5 += 1
            except Exception:
                pass

    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    metrics = {
        "dataset": "evaluation/dataset.jsonl",
        "dataset_cases": len(cases),
        "detection": {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1(precision, recall), 4),
        },
        "severity_accuracy": round(severity_hits / severity_total, 4) if severity_total else 0.0,
        "retrieval": {
            "evaluated_cases": retrieval_cases,
            "hit_at_1": round(hit1 / retrieval_cases, 4) if retrieval_cases else 0.0,
            "hit_at_3": round(hit3 / retrieval_cases, 4) if retrieval_cases else 0.0,
            "hit_at_5": round(hit5 / retrieval_cases, 4) if retrieval_cases else 0.0,
            "mrr": round(rr_total / retrieval_cases, 4) if retrieval_cases else 0.0,
        },
        "methodology": "Deterministic rule IDs are scored against expected labels. Retrieval is scored by the rank of an expected guidance rule in the local FAISS top-k results.",
    }
    OUTPUT.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
