"""
LLM Service - Interface with Google Gemini for code analysis
"""
import os
from typing import Dict, List, Optional, AsyncGenerator
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class LLMService:
    """LLM interface for code analysis and chat"""
    
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not configured")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    async def analyze_codebase(self, code_data: Dict) -> Dict:
        """Analyze a codebase and return structured insights"""
        
        # Build context from code files (limit size)
        code_context = self._build_code_context(code_data)
        
        prompt = f"""Analyze this codebase and provide a comprehensive analysis.

## Codebase Information
- **Files:** {code_data['file_count']}
- **Languages:** {', '.join(code_data['languages'])}
- **Total Lines:** {code_data['total_lines']}

## Directory Structure
```
{code_data['structure'][:2000]}
```

## Code Samples
{code_context}

## Required Analysis

Provide your analysis as JSON with this structure:
{{
    "overview": "Brief project description",
    "purpose": "What this project does",
    "architecture": {{
        "pattern": "e.g., MVC, Microservices, Monolith",
        "components": ["list of main components"],
        "description": "How components interact"
    }},
    "technologies": {{
        "languages": ["list"],
        "frameworks": ["list"],
        "libraries": ["notable libraries"]
    }},
    "key_files": [
        {{"path": "file.py", "purpose": "what it does"}}
    ],
    "entry_points": ["main entry points"],
    "dependencies": ["external dependencies"],
    "strengths": ["list"],
    "improvements": ["suggested improvements"],
    "complexity": "low/medium/high"
}}

Return ONLY valid JSON, no markdown or explanations."""

        response = await self._generate(prompt)
        
        # Parse JSON response
        try:
            import json
            # Clean up response if needed
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = cleaned.split('\n', 1)[1]
            if cleaned.endswith('```'):
                cleaned = cleaned.rsplit('\n', 1)[0]
            return json.loads(cleaned)
        except:
            return {"raw_analysis": response}
    
    async def generate_documentation(self, analysis: Dict) -> str:
        """Generate documentation from analysis"""
        
        prompt = f"""Based on this code analysis, generate comprehensive documentation in Markdown format.

Analysis:
{analysis}

Generate documentation with these sections:
1. # Project Name (infer from analysis)
2. ## Overview
3. ## Features
4. ## Architecture
5. ## Getting Started
6. ## Project Structure
7. ## Key Components
8. ## Technologies Used
9. ## Contributing

Make it professional and developer-friendly."""

        return await self._generate(prompt)
    
    async def generate_readme(self, analysis: Dict) -> str:
        """Generate a README.md file"""
        return await self.generate_documentation(analysis)
    
    async def generate_diagrams(self, analysis: Dict) -> Dict[str, str]:
        """Generate Mermaid diagram code"""
        
        prompt = f"""Based on this analysis, generate Mermaid diagram code.

Analysis:
{analysis}

Generate THREE diagrams as JSON:
{{
    "class_diagram": "mermaid code for class/component relationships",
    "flowchart": "mermaid code for main application flow",
    "architecture": "mermaid code for high-level architecture"
}}

Use valid Mermaid syntax. Example:
```
classDiagram
    class ClassName {{
        +method()
    }}
```

Return ONLY valid JSON."""

        response = await self._generate(prompt)
        
        try:
            import json
            cleaned = response.strip()
            if cleaned.startswith('```'):
                cleaned = cleaned.split('\n', 1)[1]
            if cleaned.endswith('```'):
                cleaned = cleaned.rsplit('\n', 1)[0]
            return json.loads(cleaned)
        except:
            return {"raw": response}
    
    async def chat_stream(
        self,
        message: str,
        history: List[Dict],
        context: Optional[Dict] = None
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response"""
        
        # Build conversation context
        messages = []
        
        if context:
            messages.append(f"Context about the codebase:\n{context}\n")
        
        for msg in history[-10:]:  # Last 10 messages
            role = "User" if msg["role"] == "user" else "Assistant"
            messages.append(f"{role}: {msg['content']}")
        
        messages.append(f"User: {message}")
        
        prompt = "\n\n".join(messages) + "\n\nAssistant:"
        
        # Stream response
        response = self.model.generate_content(
            prompt,
            stream=True
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text
    
    async def _generate(self, prompt: str) -> str:
        """Generate a response from the LLM"""
        response = self.model.generate_content(prompt)
        return response.text
    
    def _build_code_context(self, code_data: Dict, max_chars: int = 50000) -> str:
        """Build code context string, prioritizing important files"""
        context_parts = []
        char_count = 0
        
        # Prioritize certain files
        priority_patterns = [
            'main', 'app', 'index', 'server', 'config',
            '__init__', 'setup', 'package.json', 'requirements'
        ]
        
        # Sort files by priority
        files = sorted(
            code_data['files'],
            key=lambda f: (
                0 if any(p in f['path'].lower() for p in priority_patterns) else 1,
                f['lines']
            )
        )
        
        for file in files:
            if char_count >= max_chars:
                break
            
            content = file['content'][:5000]  # Max 5k chars per file
            entry = f"\n### {file['path']} ({file['language']})\n```{file['language']}\n{content}\n```\n"
            
            if char_count + len(entry) <= max_chars:
                context_parts.append(entry)
                char_count += len(entry)
        
        return "\n".join(context_parts)
