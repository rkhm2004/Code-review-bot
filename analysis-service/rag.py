from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
RULES_PATH = ROOT / "knowledge_base" / "rules.json"
DATA_DIR = Path(os.getenv("RAG_DATA_DIR", str(ROOT / "data" / "rag")))
INDEX_PATH = DATA_DIR / "rules.faiss"
META_PATH = DATA_DIR / "rules_metadata.json"
MODEL_NAME = os.getenv("RAG_MODEL", "sentence-transformers/all-MiniLM-L6-v2")


def _load_rules() -> list[dict[str, Any]]:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


def _rules_fingerprint(rules: list[dict[str, Any]]) -> str:
    payload = json.dumps(rules, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


class LocalRuleRAG:
    """Small local RAG index over approved CS4 guidance.

    Source code is never added to this index. Only approved knowledge-base
    guidance is embedded and persisted in the local FAISS index.
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
        import numpy as np

        rules = _load_rules()
        fingerprint = _rules_fingerprint(rules)
        DATA_DIR.mkdir(parents=True, exist_ok=True)

        if INDEX_PATH.exists() and META_PATH.exists():
            try:
                metadata = json.loads(META_PATH.read_text(encoding="utf-8"))
                if metadata.get("fingerprint") == fingerprint:
                    self._index = faiss.read_index(str(INDEX_PATH))
                    self._metadata = metadata.get("rules", [])
                    self._mode = "faiss_sentence_transformers"
                    return
            except Exception:
                pass

        documents = [
            (
                f"Rule {rule['id']}. {rule['title']}. "
                f"Category: {rule.get('category', '')}. "
                f"Keywords: {', '.join(rule.get('keywords', []))}. "
                f"Guidance: {rule['guidance']}"
            )
            for rule in rules
        ]

        model = self._load_model()
        embeddings = model.encode(
            documents,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).astype("float32")

        index = faiss.IndexFlatIP(embeddings.shape[1])
        index.add(embeddings)
        faiss.write_index(index, str(INDEX_PATH))

        self._metadata = rules
        META_PATH.write_text(
            json.dumps(
                {
                    "model": MODEL_NAME,
                    "fingerprint": fingerprint,
                    "rules": rules,
                },
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        self._index = index
        self._mode = "faiss_sentence_transformers"

    def retrieve(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        if not query.strip():
            return []

        self._build_or_load()

        model = self._load_model()
        query_vector = model.encode(
            [query[:12000]],
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).astype("float32")

        k = min(top_k, len(self._metadata))
        scores, labels = self._index.search(query_vector, k)

        results: list[dict[str, Any]] = []
        for score, label in zip(scores[0], labels[0]):
            if label < 0:
                continue
            rule = dict(self._metadata[int(label)])
            rule["retrieval_score"] = round(float(score), 4)
            rule["retrieval_method"] = "FAISS cosine-equivalent inner-product search"
            rule["source"] = "knowledge_base/rules.json"
            results.append(rule)
        return results

    def health(self) -> dict[str, Any]:
        dependencies = True
        try:
            import faiss  # noqa: F401
            import sentence_transformers  # noqa: F401
        except Exception:
            dependencies = False

        return {
            "enabled": True,
            "dependencies_available": dependencies,
            "index_exists": INDEX_PATH.exists(),
            "model": MODEL_NAME,
            "mode": self._mode,
        }


RAG = LocalRuleRAG()


def retrieve_guidance(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    return RAG.retrieve(query, top_k)


def rag_health() -> dict[str, Any]:
    return RAG.health()
