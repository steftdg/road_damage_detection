"""Append-only SQLite snapshots keep every previous analysis state recoverable."""

import sqlite3
import threading
from pathlib import Path

from .schemas import Analysis, utc_now


class AnalysisRepository:
    def __init__(self, data_dir: Path):
        data_dir.mkdir(parents=True, exist_ok=True)
        self.path = data_dir / "history.sqlite3"
        self._lock = threading.RLock()
        with self._connect() as connection:
            connection.execute("CREATE TABLE IF NOT EXISTS snapshots (sequence INTEGER PRIMARY KEY AUTOINCREMENT, analysis_id TEXT NOT NULL, payload TEXT NOT NULL)")
            connection.execute("CREATE INDEX IF NOT EXISTS snapshots_analysis_id ON snapshots(analysis_id, sequence)")

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=30)
        connection.execute("PRAGMA busy_timeout = 30000")
        return connection

    def save(self, analysis: Analysis) -> None:
        with self._lock, self._connect() as connection:
            connection.execute("INSERT INTO snapshots(analysis_id, payload) VALUES (?, ?)", (analysis.id, analysis.model_dump_json()))

    def get(self, analysis_id: str) -> Analysis | None:
        with self._lock, self._connect() as connection:
            row = connection.execute("SELECT payload FROM snapshots WHERE analysis_id = ? ORDER BY sequence DESC LIMIT 1", (analysis_id,)).fetchone()
        return Analysis.model_validate_json(row[0]) if row else None

    def list(self, limit: int = 50, offset: int = 0) -> tuple[list[Analysis], int]:
        with self._lock, self._connect() as connection:
            total = connection.execute("SELECT COUNT(DISTINCT analysis_id) FROM snapshots").fetchone()[0]
            rows = connection.execute("SELECT current.payload FROM snapshots current JOIN (SELECT MIN(sequence) AS created_sequence, MAX(sequence) AS latest_sequence FROM snapshots GROUP BY analysis_id) versions ON current.sequence = versions.latest_sequence ORDER BY versions.created_sequence DESC LIMIT ? OFFSET ?", (limit, offset)).fetchall()
        analyses = [Analysis.model_validate_json(row[0]) for row in rows]
        analyses.sort(key=lambda analysis: analysis.created_at, reverse=True)
        return analyses, total

    def recover_interrupted(self) -> None:
        # Never rerun an interrupted job into an existing asset path.
        offset = 0
        while True:
            analyses, total = self.list(limit=100, offset=offset)
            for analysis in analyses:
                if analysis.status in {"queued", "processing"}:
                    analysis.status = "failed"
                    analysis.stage = "Traitement interrompu"
                    analysis.error = "Le service a été redémarré pendant le traitement. Les fichiers sont conservés ; lancez une nouvelle analyse."
                    analysis.updated_at = utc_now()
                    self.save(analysis)
            offset += len(analyses)
            if offset >= total or not analyses:
                break
