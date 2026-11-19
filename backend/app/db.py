"""Project paths for Kiwinaut (no SQLite — decompress API is stateless)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # backend/
PROJECT_ROOT = ROOT.parent  # repo root
FRONTEND_ROOT = PROJECT_ROOT / "frontend"
