"""
LLM Service - Interface for code analysis (Gemini, Groq & Ollama supported)
"""
import os
import json
from typing import Dict, List, Optional, AsyncGenerator
from dotenv import load_dotenv
import httpx

load_dotenv()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class LLMService:
    """LLM interface for code analysis and chat"""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "groq").lower()
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "mistral")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        if self.provider == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                print("⚠️  GEMINI_API_KEY not found. Falling back to Groq.")
                self.provider = "groq"
            else:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel("gemini-pro")

        if self.provider == "groq" and not self.groq_api_key:
            print("⚠️  GROQ_API_KEY not found. Falling back to Ollama.")
            self.provider = "ollama"

    # ------------------------------------------------------------------
    # Public analysis methods (unchanged behaviour)
    # ------------------------------------------------------------------

    async def analyze_codebase(self, code_data: Dict) -> Dict:
        """Analyze a codebase and return structured insights"""
        code_context = self._build_code_context(code_data)
        structure_limit = 800 if self.provider == "groq" else 2000

        prompt = f"""Analyze this codebase and provide a comprehensive analysis.

## Codebase Information
- **Files:** {code_data['file_count']}
- **Languages:** {', '.join(code_data['languages'])}
- **Total Lines:** {code_data['total_lines']}

## Directory Structure
```
{code_data['structure'][:structure_limit]}
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

        return await self._generate(prompt, json_mode=True)

    async def generate_documentation(self, analysis: Dict) -> str:
        """Generate documentation from analysis"""
        prompt = f"""Based on this code analysis, generate comprehensive documentation in Markdown format.

Analysis:
{json.dumps(analysis, indent=2)}

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

    async def generate_diagrams(self, analysis: Dict) -> Dict[str, str]:
        """Generate Mermaid diagram code"""
        prompt = f"""Based on this analysis, generate Mermaid diagram code.

Analysis:
{json.dumps(analysis, indent=2)}

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

        # Ollama local models are unreliable with strict JSON — use regex fallback
        use_json_mode = self.provider != "ollama"
        response = await self._generate(prompt, json_mode=use_json_mode)

        if self.provider == "ollama" and isinstance(response, str):
            try:
                with open("debug_ollama_diagrams.txt", "w", encoding="utf-8") as f:
                    f.write(response)
            except Exception:
                pass
            return self._extract_mermaid(response)

        return response

    # ------------------------------------------------------------------
    # Chat (RAG-aware)
    # ------------------------------------------------------------------

    async def chat_stream(
        self,
        message: str,
        history: List[Dict],
        context: Optional[Dict] = None,
        retrieved_chunks: Optional[List[Dict]] = None,
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response, preferring RAG chunks over raw analysis JSON."""
        system_msg = self._build_system_prompt(context, retrieved_chunks)
        messages = self._build_messages(system_msg, history, message)

        if self.provider == "groq":
            async for chunk in self._groq_stream(messages):
                yield chunk
        elif self.provider == "ollama":
            async for chunk in self._ollama_stream(messages):
                yield chunk
        else:
            # Gemini — no native messages API, flatten to single prompt
            flat = system_msg + "\n\n"
            for msg in history[-10:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                flat += f"{role}: {msg['content']}\n"
            flat += f"User: {message}\nAssistant:"
            response = self.model.generate_content(flat, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    def _build_system_prompt(
        self,
        context: Optional[Dict],
        retrieved_chunks: Optional[List[Dict]],
    ) -> str:
        parts = [
            "You are an expert code assistant. "
            "Answer questions about the codebase clearly and concisely. "
            "When referencing code, cite the file path."
        ]

        if retrieved_chunks:
            parts.append("\n\n## Relevant Code Excerpts\n")
            for chunk in retrieved_chunks:
                lang = chunk.get("language", "")
                parts.append(
                    f"### {chunk['file_path']}\n"
                    f"```{lang}\n{chunk['content']}\n```\n"
                )
        elif context:
            parts.append(f"\n\n## Codebase Overview\n{json.dumps(context, indent=2)}")

        return "".join(parts)

    @staticmethod
    def _build_messages(system_msg: str, history: List[Dict], message: str) -> List[Dict]:
        msgs = [{"role": "system", "content": system_msg}]
        for msg in history[-10:]:
            msgs.append({"role": msg["role"], "content": msg["content"]})
        msgs.append({"role": "user", "content": message})
        return msgs

    # ------------------------------------------------------------------
    # Provider dispatch
    # ------------------------------------------------------------------

    async def _generate(self, prompt: str, json_mode: bool = False):
        if self.provider == "groq":
            return await self._generate_groq(prompt, json_mode)
        elif self.provider == "ollama":
            return await self._generate_ollama(prompt, json_mode)
        else:
            return await self._generate_gemini(prompt, json_mode)

    # ------------------------------------------------------------------
    # Groq
    # ------------------------------------------------------------------

    async def _generate_groq(self, prompt: str, json_mode: bool):
        payload: Dict = {
            "model": self.groq_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]

        return self._parse_json(text) if json_mode else text

    async def _groq_stream(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient(timeout=None) as client:
            try:
                async with client.stream(
                    "POST",
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": self.groq_model,
                        "messages": messages,
                        "stream": True,
                        "temperature": 0.3,
                    },
                ) as response:
                    async for line in response.aiter_lines():
                        if not line or line == "data: [DONE]":
                            continue
                        if line.startswith("data: "):
                            try:
                                data = json.loads(line[6:])
                                delta = data["choices"][0]["delta"].get("content", "")
                                if delta:
                                    yield delta
                            except Exception:
                                pass
            except Exception as e:
                yield f"\n\nError: {str(e)}"

    # ------------------------------------------------------------------
    # Gemini
    # ------------------------------------------------------------------

    async def _generate_gemini(self, prompt: str, json_mode: bool):
        import google.generativeai as genai  # noqa: F401 — already configured in __init__
        response = self.model.generate_content(prompt)
        text = response.text
        return self._parse_json(text) if json_mode else text

    # ------------------------------------------------------------------
    # Ollama
    # ------------------------------------------------------------------

    async def _generate_ollama(self, prompt: str, json_mode: bool):
        async with httpx.AsyncClient(timeout=300.0) as client:
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "format": "json" if json_mode else None,
                "options": {"temperature": 0.3, "num_ctx": 8192},
            }
            try:
                response = await client.post(
                    f"{self.ollama_base_url}/api/generate", json=payload
                )
                response.raise_for_status()
                text = response.json().get("response", "")
                return self._parse_json(text) if json_mode else text
            except Exception as e:
                print(f"Ollama Error: {e}")
                raise

    async def _ollama_stream(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream(
                    "POST",
                    f"{self.ollama_base_url}/api/chat",
                    json={"model": self.ollama_model, "messages": messages},
                    timeout=None,
                ) as response:
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        try:
                            chunk = json.loads(line)
                            if "message" in chunk and "content" in chunk["message"]:
                                yield chunk["message"]["content"]
                        except Exception:
                            pass
            except Exception as e:
                yield f"Error: {str(e)}"

    # ------------------------------------------------------------------
    # Mermaid / JSON helpers (unchanged)
    # ------------------------------------------------------------------

    def _extract_mermaid(self, text: str) -> Dict[str, str]:
        import re

        diagrams = {"class_diagram": "", "flowchart": "", "architecture": ""}
        mermaid_blocks = re.findall(r"```mermaid\n([\s\S]*?)```", text)

        if not mermaid_blocks:
            class_match = re.search(r"classDiagram[\s\S]*?(?=\n\n|```|$)", text)
            if class_match:
                mermaid_blocks.append(class_match.group(0))
            flow_match = re.search(
                r"(graph|flowchart) .*[\s\S]*?(?=\n\n|```|$)", text, re.IGNORECASE
            )
            if flow_match:
                mermaid_blocks.append(flow_match.group(0))
            seq_match = re.search(r"sequenceDiagram[\s\S]*?(?=\n\n|```|$)", text)
            if seq_match:
                mermaid_blocks.append(seq_match.group(0))

        if len(mermaid_blocks) > 0:
            diagrams["class_diagram"] = mermaid_blocks[0]
        if len(mermaid_blocks) > 1:
            diagrams["flowchart"] = mermaid_blocks[1]
        if len(mermaid_blocks) > 2:
            diagrams["architecture"] = mermaid_blocks[2]
        if len(mermaid_blocks) == 1:
            diagrams["flowchart"] = mermaid_blocks[0]
            diagrams["architecture"] = mermaid_blocks[0]

        return diagrams

    def _parse_json(self, text: str) -> Dict:
        try:
            cleaned = text.strip()
            if "```" in cleaned:
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start != -1 and end != -1:
                    cleaned = cleaned[start : end + 1]
            return json.loads(cleaned)
        except json.JSONDecodeError:
            try:
                import ast
                return ast.literal_eval(cleaned)
            except Exception:
                print(f"Failed to parse JSON: {text[:200]}...")
                return {
                    "overview": "Analysis failed to parse",
                    "purpose": "Raw output: " + text[:500],
                    "technologies": {"languages": [], "frameworks": []},
                }

    def _build_code_context(self, code_data: Dict, max_chars: int = 15000) -> str:
        context_parts = []
        char_count = 0

        # Groq has a strict HTTP payload limit (~6 MB) and token limits per request.
        # Keep the context small enough that the full analysis prompt stays under ~20k chars.
        if self.provider == "ollama":
            max_chars = 12000
            max_file_chars = 2000
        elif self.provider == "groq":
            max_chars = 20000
            max_file_chars = 1500
        else:  # gemini
            max_chars = 50000
            max_file_chars = 3000

        priority_patterns = [
            "main", "app", "index", "server", "config",
            "__init__", "setup", "package.json", "requirements", "README",
        ]

        files = sorted(
            code_data["files"],
            key=lambda f: (
                0 if any(p in f["path"].lower() for p in priority_patterns) else 1,
                f["lines"],
            ),
        )

        for file in files:
            if char_count >= max_chars:
                break
            content = file["content"][:max_file_chars]
            entry = (
                f"\n### {file['path']} ({file['language']})\n"
                f"```{file['language']}\n{content}\n```\n"
            )
            if char_count + len(entry) <= max_chars:
                context_parts.append(entry)
                char_count += len(entry)

        return "\n".join(context_parts)
