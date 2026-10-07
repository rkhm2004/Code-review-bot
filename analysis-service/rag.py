from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

from audit import approved_findings

ROOT = Path(__file__).resolve().parent.parent
RULES_PATH = ROOT / "knowledge_base" / "rules.json"
DATA_DIR = Path(os.getenv("RAG_DATA_DIR", str(ROOT / "data" / "rag")))
INDEX_PATH = DATA_DIR / "rules.faiss"
META_PATH = DATA_DIR / "rules_metadata.json"
MODEL_NAME = os.getenv("RAG_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


def _load_rules() -> list[dict[str, Any]]:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def _corpus() -> list[dict[str, Any]]:
    rules = []
    for rule in _load_rules():
        item = dict(rule)
        item["_corpus_type"] = "approved_guidance"
        item["_source"] = "knowledge_base/rules.json"
        rules.append(item)
    for finding in approved_findings():
        item = {
            "id": f"HIST-{finding['id']}",
            "category": "Historical Approved Finding",
            "title": finding["title"],
            "keywords": [finding.get("rule_id") or "", finding.get("category") or "", finding.get("severity") or ""],
            "guidance": (
                f"Previously approved finding: {finding.get('description', '')} "
                f"Recommended remediation: {finding.get('recommendation', '')}"
            ).strip(),
            "_corpus_type": "historical_approved_finding",
            "_source": "sqlite://review_events",
            "rule_id": finding.get("rule_id"),
        }
        rules.append(item)
    return rules


def _fingerprint(corpus: list[dict[str, Any]]) -> str:
    payload = json.dumps(corpus, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


class LocalRuleRAG:
    """Local FAISS RAG over approved guidance plus sanitized approved history.

    No source-code body or source snippet is added to the historical corpus.
    """

    def __init__(self) -> None:
        self._model = None
        self._index = None
        self._metadata: list[dict[str, Any]] = []
        self._mode = "uninitialized"

    def _load_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(MODEL_NAME)
        return self._model

    def _build_or_load(self) -> None:
        import faiss
        import numpy as np  # noqa: F401

        corpus = _corpus()
        fingerprint = _fingerprint(corpus)
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        if INDEX_PATH.exists() and META_PATH.exists():
            try:
                metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
                if metadata.get("fingerprint") == fingerprint:
                    self._index = faiss.read_index(str(INDEX_PATH))
                    self._metadata = metadata.get("corpus", [])
                    self._mode = "faiss_sentence_transformers"
                    return
            except Exception:
                pass

        documents = [
            f"ID {item['id']}. {item['title']}. Category: {item.get('category', '')}. "
            f"Keywords: {', '.join(item.get('keywords', []))}. Guidance: {item.get('guidance', '')}"
            for item in corpus
        ]
        model = self._load_model()
        embeddings = model.encode(documents, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False).astype("float32")
        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)
        faiss.write_index(index, str(INDEX_PATH))
        self._metadata = corpus
        META_PATH.write_text(json.dumps({
            "model": MODEL_NAME,
            "fingerprint": fingerprint,
            "corpus_count": len(corpus),
            "historical_approved_count": sum(1 for x in corpus if x.get("_corpus_type") == "historical_approved_finding"),
            "corpus": corpus,
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        self._index = index
        self._mode = "faiss_sentence_transformers"

    def retrieve(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        if not query.strip():
            return []
        self._build_or_load()
        model = self._load_model()
        query_vector = model.encode([query[:12000]], normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False).astype("float32")
        k = min(top_k, len(self._metadata))
        scores, labels = self._index.search(query_vector, k)
        results = []
        for score, label in zip(scores[0], labels[0]):
            if label < 0:
                continue
            item = dict(self._metadata[int(label)])
            item["retrieval_score"] = round(float(score), 4)
            item["retrieval_method"] = "FAISS cosine-equivalent inner-product search"
            item["source"] = item.pop("_source", "local")
            item.pop("_corpus_type", None)
            results.append(item)
        return results

    def health(self) -> dict[str, Any]:
        dependencies = True
        try:
            import faiss  # noqa: F401
            import sentence_transformers  # noqa: F401
        except Exception:
            dependencies = False
        history_count = len(approved_findings())
        return {
            "enabled": True,
            "dependencies_available": dependencies,
            "index_exists": INDEX_PATH.exists(),
            "model": MODEL_NAME,
            "mode": self._mode,
            "historical_approved_findings": history_count,
            "corpus_policy": "approved guidance + sanitized accepted finding metadata; source code excluded",
        }


RAG = LocalRuleRAG()

def retrieve_guidance(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    return RAG.retrieve(query, top_k)

def rag_health() -> dict[str, Any]:
    return RAG.health()
