from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = Path(os.getenv("AUDIT_DB_PATH", str(ROOT / "data" / "cs4_audit.sqlite3")))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def init_db() -> None:
    with _connect() as db:
        db.execute(
            """
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
            """
        )
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
        db.execute(
            """
            INSERT INTO review_events
            (event_type, finding_id, status, reviewer_id, reviewer_note,
             file_path, repository, details_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event_type,
                finding_id,
                status,
                reviewer_id,
                reviewer_note,
                file_path,
                repository,
                json.dumps(details or {}, ensure_ascii=False),
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        db.commit()


def recent_events(limit: int = 100) -> list[dict[str, Any]]:
    with _connect() as db:
        rows = db.execute(
            """
            SELECT id, event_type, finding_id, status, reviewer_id,
                   reviewer_note, file_path, repository, details_json, created_at
            FROM review_events
            ORDER BY id DESC
            LIMIT ?
            """,
            (max(1, min(limit, 500)),),
        ).fetchall()

    return [
        {
            "id": row["id"],
            "event_type": row["event_type"],
            "finding_id": row["finding_id"],
            "status": row["status"],
            "reviewer_id": row["reviewer_id"],
            "reviewer_note": row["reviewer_note"],
            "file_path": row["file_path"],
            "repository": row["repository"],
            "details": json.loads(row["details_json"] or "{}"),
            "created_at": row["created_at"],
        }
        for row in rows
    ]
