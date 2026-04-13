"""
Code Parser Service - Clone repos and parse source code files
"""
import os
import re
import json
from pathlib import Path
from typing import Dict, List, Optional
from git import Repo
from git.exc import GitCommandError
import asyncio
from dotenv import load_dotenv

load_dotenv()


class CodeParser:
    """Parse source code from repositories"""
    
    SUPPORTED_EXTENSIONS = {
        '.py': 'python',
        '.js': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
        '.jsx': 'javascript',
        '.java': 'java',
        '.go': 'go',
        '.rs': 'rust',
        '.cpp': 'cpp',
        '.c': 'c',
        '.h': 'c',
        '.cs': 'csharp',
        '.rb': 'ruby',
        '.php': 'php',
    }
    
    IGNORE_DIRS = {
        'node_modules', '.git', '__pycache__', 'venv', 'env',
        '.venv', 'dist', 'build', '.next', '.nuxt', 'target',
        'vendor', '.idea', '.vscode', 'coverage'
    }
    
    IGNORE_FILES = {
        'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
        'poetry.lock', 'Pipfile.lock', '.DS_Store'
    }
    
    def __init__(self, repos_dir: str = None):
        if repos_dir is None:
            repos_dir = os.getenv("REPOS_DIR", "../cloned_repos")
        self.repos_dir = Path(repos_dir)
        self.repos_dir.mkdir(parents=True, exist_ok=True)
    
    async def clone_and_parse(self, repo_url: str) -> Dict[str, any]:
        """Clone a repository and parse its code files"""
        # Normalise GitHub URLs — strip /tree/..., /blob/..., etc. so that
        # git clone always receives a bare https://github.com/owner/repo URL.
        github_match = re.search(r'github\.com/([^/]+)/([^/]+?)(?:\.git)?(?:/.*)?$', repo_url)
        if github_match:
            owner = github_match.group(1)
            repo = github_match.group(2)
            clone_url = f"https://github.com/{owner}/{repo}.git"
            repo_name = f"{owner}__{repo}"
        else:
            # Non-GitHub URL — use as-is, derive name from last path segment
            match = re.search(r'/([^/]+?)(?:\.git)?$', repo_url)
            if not match:
                raise ValueError(f"Invalid repository URL: {repo_url}")
            clone_url = repo_url
            repo_name = match.group(1)

        local_path = self.repos_dir / repo_name

        # Clone if doesn't exist
        if not local_path.exists():
            try:
                await asyncio.to_thread(
                    Repo.clone_from, clone_url, str(local_path)
                )
            except GitCommandError as e:
                raise RuntimeError(f"Failed to clone: {e}")
        
        return await self.parse_local(str(local_path))
    
    async def parse_local(self, path: str) -> Dict[str, any]:
        """Parse code files from a local directory"""
        root_path = Path(path)
        if not root_path.exists():
            raise ValueError(f"Path does not exist: {path}")
        
        files = []
        total_lines = 0
        languages = set()
        
        for file_path in root_path.rglob('*'):
            # Skip ignored directories
            if any(ignored in file_path.parts for ignored in self.IGNORE_DIRS):
                continue
            
            # Skip ignored files
            if file_path.name in self.IGNORE_FILES:
                continue
            
            # Only process supported file types
            ext = file_path.suffix.lower()
            if ext not in self.SUPPORTED_EXTENSIONS:
                continue
            
            try:
                content = await asyncio.to_thread(
                    file_path.read_text, encoding='utf-8', errors='ignore'
                )
                
                language = self.SUPPORTED_EXTENSIONS[ext]
                languages.add(language)
                line_count = len(content.splitlines())
                total_lines += line_count
                
                files.append({
                    'path': str(file_path.relative_to(root_path)),
                    'language': language,
                    'content': content,
                    'lines': line_count
                })
                
            except Exception as e:
                # Skip files that can't be read
                continue
        
        return {
            'root': str(root_path),
            'files': files,
            'file_count': len(files),
            'total_lines': total_lines,
            'languages': list(languages),
            'structure': self._get_directory_structure(root_path)
        }
    
    def _get_directory_structure(self, path: Path, prefix: str = "") -> str:
        """Generate a tree-like directory structure"""
        lines = []
        items = sorted(path.iterdir(), key=lambda x: (x.is_file(), x.name))
        
        for i, item in enumerate(items):
            if item.name in self.IGNORE_DIRS or item.name.startswith('.'):
                continue
            
            is_last = i == len(items) - 1
            connector = "└── " if is_last else "├── "
            lines.append(f"{prefix}{connector}{item.name}")
            
            if item.is_dir():
                extension = "    " if is_last else "│   "
                sub_structure = self._get_directory_structure(item, prefix + extension)
                if sub_structure:
                    lines.append(sub_structure)
        
        return "\n".join(lines)
