"""SQLite-backed memory service with categories and deduplication."""

from __future__ import annotations

import logging
import os
import sqlite3
import threading
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("NEON_PAW_DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "data", "neon_paw.sqlite"))

VALID_CATEGORIES = {"name", "preference", "goal", "habit", "project", "custom"}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryService:
    """Thread-safe SQLite memory store."""

    def __init__(self, db_path: str = DB_PATH) -> None:
        self._db_path = db_path
        self._local = threading.local()
        self._ensure_table()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, "conn") or self._local.conn is None:
            os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
            self._local.conn = sqlite3.connect(self._db_path)
            self._local.conn.row_factory = sqlite3.Row
            self._local.conn.execute("PRAGMA journal_mode=WAL")
        return self._local.conn

    def _ensure_table(self) -> None:
        conn = self._get_conn()
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'custom',
                pinned INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        """)
        conn.commit()

    def list_memories(self, category: Optional[str] = None) -> list[dict]:
        conn = self._get_conn()
        if category:
            rows = conn.execute(
                "SELECT * FROM memories WHERE category = ? ORDER BY pinned DESC, created_at DESC",
                (category,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM memories ORDER BY pinned DESC, created_at DESC"
            ).fetchall()
        return [dict(r) for r in rows]

    def add_memory(self, content: str, category: str = "custom") -> dict | None:
        content = content.strip()
        if not content:
            return None

        if category not in VALID_CATEGORIES:
            category = "custom"

        # Dedup: check for existing memory with same normalized content
        norm = self._normalize(content)
        conn = self._get_conn()
        existing = conn.execute("SELECT id, content FROM memories").fetchall()
        for row in existing:
            if self._normalize(dict(row)["content"]) == norm:
                logger.debug("Memory dedup: skipping duplicate of id=%d", dict(row)["id"])
                return None

        now = _now_iso()
        cursor = conn.execute(
            "INSERT INTO memories (content, category, pinned, created_at, updated_at) VALUES (?, ?, 0, ?, ?)",
            (content, category, now, now),
        )
        conn.commit()
        return self.get_memory(cursor.lastrowid)

    def get_memory(self, memory_id: int) -> dict | None:
        conn = self._get_conn()
        row = conn.execute("SELECT * FROM memories WHERE id = ?", (memory_id,)).fetchone()
        return dict(row) if row else None

    def update_memory(self, memory_id: int, content: str | None = None, category: str | None = None, pinned: bool | None = None) -> dict | None:
        conn = self._get_conn()
        existing = self.get_memory(memory_id)
        if not existing:
            return None

        updates = []
        params = []

        if content is not None:
            updates.append("content = ?")
            params.append(content.strip())
        if category is not None:
            if category in VALID_CATEGORIES:
                updates.append("category = ?")
                params.append(category)
        if pinned is not None:
            updates.append("pinned = ?")
            params.append(1 if pinned else 0)

        if not updates:
            return existing

        updates.append("updated_at = ?")
        params.append(_now_iso())
        params.append(memory_id)

        conn.execute(
            f"UPDATE memories SET {', '.join(updates)} WHERE id = ?",
            params,
        )
        conn.commit()
        return self.get_memory(memory_id)

    def delete_memory(self, memory_id: int) -> bool:
        conn = self._get_conn()
        cursor = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
        conn.commit()
        return cursor.rowcount > 0

    def clear_all(self) -> int:
        conn = self._get_conn()
        cursor = conn.execute("DELETE FROM memories")
        conn.commit()
        return cursor.rowcount

    def count(self, category: Optional[str] = None) -> int:
        conn = self._get_conn()
        if category:
            row = conn.execute("SELECT COUNT(*) as cnt FROM memories WHERE category = ?", (category,)).fetchone()
        else:
            row = conn.execute("SELECT COUNT(*) as cnt FROM memories").fetchone()
        return row["cnt"]

    @staticmethod
    def _normalize(text: str) -> str:
        return text.strip().lower()


# Singleton
_memory_service: Optional[MemoryService] = None


def get_memory_service() -> MemoryService:
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service
