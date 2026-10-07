from __future__ import annotations

import base64
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("AUDIT_DB_PATH", str(ROOT / "data" / "cs4_audit.sqlite3")))
ENCRYPTION_KEY = os.getenv("CS4_AUDIT_ENCRYPTION_KEY", "")

try:
    from cryptography.fernet import Fernet, InvalidToken
except Exception:
    Fernet = None
    InvalidToken = Exception


def _fernet():
    if not ENCRYPTION_KEY or Fernet is None:
        return None
    try:
        raw = ENCRYPTION_KEY.encode()
        if len(raw) != 44:
            raw = base64.urlsafe_b64encode(__import__("hashlib").sha256(raw).digest())
        return Fernet(raw)
    except Exception:
        return None


def _protect(value: str) -> str:
    f = _fernet()
    if not f or not value:
        return value
    return "enc:" + f.encrypt(value.encode()).decode()


def _unprotect(value: str) -> str:
    if not value or not value.startswith("enc:"):
        return value
    f = _fernet()
    if not f:
        return "[encrypted: configure CS4_AUDIT_ENCRYPTION_KEY]"
    try:
        return f.decrypt(value[4:].encode()).decode()
    except InvalidToken:
        return "[encrypted: invalid audit key]"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as db:
        db.execute("""
            CREATE TABLE IF NOT EXISTS review_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                finding_id TEXT,
                status TEXT,
                reviewer_id TEXT,
                reviewer_note TEXT,
                file_path TEXT,
                repository TEXT,
                details_json TEXT,
                created_at TEXT NOT NULL
            )
        """)
        db.commit()


def record_event(
    event_type: str,
    *,
    finding_id: str | None = None,
    status: str | None = None,
    reviewer_id: str = "local-reviewer",
    reviewer_note: str = "",
    file_path: str = "",
    repository: str = "",
    details: dict[str, Any] | None = None,
) -> None:
    with _connect() as db:
        db.execute("""
            INSERT INTO review_events
            (event_type, finding_id, status, reviewer_id, reviewer_note,
             file_path, repository, details_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event_type, finding_id, status, reviewer_id,
            _protect(reviewer_note), file_path, repository,
            _protect(json.dumps(details or {}, ensure_ascii=False)),
            datetime.now(timezone.utc).isoformat(),
        ))
        db.commit()


def recent_events(limit: int = 100) -> list[dict[str, Any]]:
    with _connect() as db:
        rows = db.execute("""
            SELECT id, event_type, finding_id, status, reviewer_id,
                   reviewer_note, file_path, repository, details_json, created_at
            FROM review_events ORDER BY id DESC LIMIT ?
        """, (max(1, min(limit, 500)),)).fetchall()

    output = []
    for row in rows:
        raw_details = _unprotect(row["details_json"] or "{}")
        try:
            details = json.loads(raw_details)
        except Exception:
            details = {}
        output.append({
            "id": row["id"], "event_type": row["event_type"],
            "finding_id": row["finding_id"], "status": row["status"],
            "reviewer_id": row["reviewer_id"],
            "reviewer_note": _unprotect(row["reviewer_note"] or ""),
            "file_path": row["file_path"], "repository": row["repository"],
            "details": details, "created_at": row["created_at"],
        })
    return output


def approved_findings() -> list[dict[str, Any]]:
    events = recent_events(500)
    approved = []
    for event in events:
        if event["event_type"] != "REVIEW_DISPOSITION" or event["status"] != "ACCEPTED":
            continue
        details = event.get("details") or {}
        finding = details.get("finding")
        if isinstance(finding, dict) and finding.get("title"):
            approved.append({
                "id": event.get("finding_id") or finding.get("id", "APPROVED"),
                "title": finding.get("title"),
                "category": finding.get("category", "Historical Approved Finding"),
                "severity": finding.get("severity", "UNKNOWN"),
                "rule_id": finding.get("rule_id"),
                "description": finding.get("description", ""),
                "recommendation": finding.get("recommendation", ""),
                "file_path": event.get("file_path", ""),
            })
    return approved


def audit_security_health() -> dict[str, Any]:
    return {
        "store": "sqlite",
        "encryption_available": _fernet() is not None,
        "encryption_required_in_production": True,
        "source_code_persisted": False,
    }
