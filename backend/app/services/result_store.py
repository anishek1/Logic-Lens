"""
Result Store — persist analysis results to disk keyed by repo slug.

Files live at: backend/data/results/{owner}__{repo}.json
This lets the same repo URL always resolve to the same cached result,
surviving server restarts and enabling shareable links.
"""
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

_RESULTS_DIR = Path(__file__).parent.parent.parent / "data" / "results"


def _dir() -> Path:
    _RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    return _RESULTS_DIR


def repo_key_from_url(repo_url: str) -> Optional[str]:
    """Derive a stable filesystem-safe key from a repo URL.

    https://github.com/facebook/react  →  facebook__react
    https://github.com/owner/repo.git  →  owner__repo
    """
    if not repo_url:
        return None
    m = re.search(r'github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/.*)?$', repo_url)
    if m:
        return f"{m.group(1)}__{m.group(2)}"
    m = re.search(r'/([^/]+?)(?:\.git)?$', repo_url)
    if m:
        return m.group(1)
    return None


def save(repo_key: str, results: Dict) -> None:
    path = _dir() / f"{repo_key}.json"
    try:
        path.write_text(json.dumps(results), encoding="utf-8")
        logger.info("Saved results to disk: %s", path.name)
    except Exception:
        logger.exception("Failed to save results for %s", repo_key)


def load(repo_key: str) -> Optional[Dict]:
    path = _dir() / f"{repo_key}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.exception("Failed to load results for %s", repo_key)
        return None


def delete(repo_key: str) -> bool:
    path = _dir() / f"{repo_key}.json"
    if path.exists():
        path.unlink()
        return True
    return False


def list_all() -> List[str]:
    return [p.stem for p in _dir().glob("*.json")]
