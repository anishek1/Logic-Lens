"""
LLM Service - Interface for code analysis (Gemini, Groq & Ollama supported)
"""
import asyncio
import logging
import os
import json
from typing import Dict, List, Optional, AsyncGenerator
from dotenv import load_dotenv
import httpx

import re

load_dotenv()

logger = logging.getLogger(__name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def _fix_mermaid(diagram: str) -> str:
    """Fix common LLM-generated Mermaid syntax errors."""
    if not isinstance(diagram, str):
        return diagram
    # Remove trailing > after edge label closing pipe: -->|label|> → -->|label|
    diagram = re.sub(r'(\|[^|]*)\|>', r'\1|', diagram)
    # Edges to 'subgraph X' are invalid — the subgraph label is not a node.
    # Strip the broken edge so at least the rest of the diagram renders.
    diagram = re.sub(
        r'^[ \t]*[A-Za-z0-9_]+[ \t]*(?:-{1,3}>|--[|>]?)[^\n]*?subgraph[ \t]+[A-Za-z0-9_ ]+\n',
        '',
        diagram,
        flags=re.MULTILINE,
    )
    return diagram


class LLMService:
    """LLM interface for code analysis and chat"""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "groq").lower()
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "mistral")
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.nim_api_key = os.getenv("NIM_API_KEY")
        self.nim_model = os.getenv("NIM_MODEL", "nvidia/nemotron-3-nano-30b-a3b")

        if self.provider == "nim" and not self.nim_api_key:
            logger.warning("NIM_API_KEY not found. Falling back to Groq.")
            self.provider = "groq"

        if self.provider == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                logger.warning("GEMINI_API_KEY not found. Falling back to Groq.")
                self.provider = "groq"
            else:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel("gemini-pro")

        if self.provider == "groq" and not self.groq_api_key:
            logger.warning("GROQ_API_KEY not found. Falling back to Ollama.")
            self.provider = "ollama"

    # ------------------------------------------------------------------
    # Public analysis methods (unchanged behaviour)
    # ------------------------------------------------------------------

    async def analyze_codebase(self, code_data: Dict) -> Dict:
        """
        Analyze a codebase and return structured insights.

        Runs four focused LLM calls in parallel (overview, architecture, files,
        insights) instead of one giant call. Each sub-call gets the full code
        context but a narrower task, so each section is dramatically deeper
        than a single combined call could produce. Results are merged into the
        schema the frontend expects.
        """
        code_context = self._build_code_context(code_data)
        structure_limit = 1500 if self.provider in ("groq", "nim") else 3000
        structure = code_data["structure"][:structure_limit]
        meta = (
            f"## Codebase Information\n"
            f"- Files: {code_data['file_count']}\n"
            f"- Languages: {', '.join(code_data['languages'])}\n"
            f"- Total Lines: {code_data['total_lines']}\n\n"
            f"## Directory Structure\n```\n{structure}\n```\n\n"
            f"## Code Samples\n{code_context}\n"
        )

        tasks = [
            self._analyze_overview(meta),
            self._analyze_architecture(meta),
            self._analyze_files(meta),
            self._analyze_insights(meta),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        merged: Dict = {}
        for result in results:
            if isinstance(result, Exception):
                logger.exception("Analysis sub-call failed: %s", result)
                continue
            merged.update(result)

        # Guarantee every schema field exists so AnalysisResponse doesn't 500
        merged.setdefault("overview", "Analysis partially failed.")
        merged.setdefault("purpose", "")
        merged.setdefault("architecture", {"pattern": "Unknown", "components": [], "description": ""})
        merged.setdefault("technologies", {"languages": [], "frameworks": [], "libraries": []})
        merged.setdefault("key_files", [])
        merged.setdefault("entry_points", [])
        merged.setdefault("dependencies", [])
        merged.setdefault("strengths", [])
        merged.setdefault("improvements", [])
        merged.setdefault("complexity", "unknown")
        return merged

    async def _analyze_overview(self, meta: str) -> Dict:
        """Overview, purpose, technologies, complexity — the 'what is this' pass."""
        prompt = f"""{meta}

You are a senior engineer writing the executive summary of this codebase for a technical reader.

Return JSON with EXACTLY these keys:
{{
    "overview": "150-250 words: what domain this is in, what problem it solves, who the intended user is, and the defining technical approach. Reference specific files or features as evidence. No marketing language.",
    "purpose": "80-150 words: the concrete user-facing capability — what can a person DO with this app/library? Describe the core workflow step by step.",
    "technologies": {{
        "languages": ["every language used, primary first"],
        "frameworks": ["every framework, with version if visible in manifests, e.g. 'FastAPI 0.109', 'React 19'"],
        "libraries": ["notable libraries and what each is used for, e.g. 'ChromaDB — vector index for RAG', 'sentence-transformers — embedding + rerank'. Include at least 6 if the project uses them."]
    }},
    "complexity": "low | medium | high — with a one-sentence justification inline, e.g. 'medium — single-service backend + SPA frontend, no distributed systems'"
}}

Be concrete. Cite file paths. Return ONLY valid JSON."""
        result = await self._generate(prompt, json_mode=True)
        return result if isinstance(result, dict) else {}

    async def _analyze_architecture(self, meta: str) -> Dict:
        """Architecture pattern, components, and how they interact."""
        prompt = f"""{meta}

You are a senior architect documenting this codebase for a new engineer who must make changes to it next week.

Return JSON with EXACTLY this shape:
{{
    "architecture": {{
        "pattern": "the dominant architectural pattern — be specific, e.g. 'Layered backend (routes → services → models) + SPA frontend via REST/SSE', not just 'MVC'",
        "components": [
            "at least 6 entries. Each entry is 'ComponentName — one-sentence responsibility and the file(s) that implement it'. Example: 'EmbeddingService — chunks source files and builds ChromaDB indexes per analysis job (backend/app/services/embedding_service.py)'"
        ],
        "description": "300-500 words covering, in this order: (1) layering — what each layer's job is, (2) request lifecycle — how an HTTP request flows from the browser to the LLM and back, (3) data flow — where code chunks, embeddings, and LLM outputs live at each stage, (4) cross-cutting concerns like streaming, background tasks, state management. Cite specific functions and files throughout. Be concrete, not generic."
    }}
}}

Return ONLY valid JSON."""
        result = await self._generate(prompt, json_mode=True)
        return result if isinstance(result, dict) else {}

    async def _analyze_files(self, meta: str) -> Dict:
        """Key files, entry points, dependencies."""
        prompt = f"""{meta}

You are orienting a new engineer. Which files matter, how do you run this, and what does it depend on?

Return JSON with EXACTLY these keys:
{{
    "key_files": [
        {{"path": "exact/relative/path.py", "purpose": "one sentence explaining what this file does AND why a new engineer would need to read it — e.g. 'holds the provider dispatch logic that determines whether Groq, NIM, Gemini, or Ollama handles each call'"}}
    ],
    "entry_points": [
        "each entry is a concrete way to run the project, including the command. Example: 'Backend API — `python -m uvicorn app.main:app --reload --port 8000` from backend/'. Cover dev, prod, and CLI entry points if they exist."
    ],
    "dependencies": [
        "external dependencies grouped logically. Example: 'Runtime: fastapi, uvicorn, chromadb, sentence-transformers'. Include dev/test deps separately. Pull from requirements.txt, package.json, etc."
    ]
}}

Requirements: at least 8 key_files (more if the project is non-trivial). Cite exact paths. Return ONLY valid JSON."""
        result = await self._generate(prompt, json_mode=True)
        return result if isinstance(result, dict) else {}

    async def _analyze_insights(self, meta: str) -> Dict:
        """Strengths and improvements — the critical read."""
        prompt = f"""{meta}

You are doing a critical code review. Be honest and specific — no generic platitudes.

Return JSON with EXACTLY these keys:
{{
    "strengths": [
        "at least 6 entries. Each one cites a SPECIFIC file or pattern as evidence. Bad: 'Good separation of concerns'. Good: 'Clean provider abstraction in llm_service.py — each LLM backend (Groq, NIM, Gemini, Ollama) has isolated _generate_* and _*_stream methods with a single dispatch point'."
    ],
    "improvements": [
        "at least 6 entries. Each is an actionable improvement with the file/pattern it applies to and the reason. Bad: 'Add tests'. Good: 'No tests for the RAG retrieval pipeline — embedding_service.retrieve() has fallback paths (reranker failure, empty collection) that are untested and could silently regress'."
    ]
}}

Requirements: every item must name a specific file, function, or pattern. No generic advice. Return ONLY valid JSON."""
        result = await self._generate(prompt, json_mode=True)
        return result if isinstance(result, dict) else {}

    async def generate_documentation(self, analysis: Dict) -> str:
        """Generate comprehensive Markdown documentation from the analysis."""
        prompt = f"""You are writing the README for a technical project. Produce professional, detailed, developer-facing documentation in Markdown.

## Source Analysis
{json.dumps(analysis, indent=2)}

## Required Structure (include every section)

# <Project Name inferred from analysis>

## Overview
200+ words. What the project does, who uses it, what makes it noteworthy. Opening line should hook a technical reader.

## Features
A bulleted list of 6-10 concrete features. Each bullet is one sentence naming the capability and the component that delivers it.

## Architecture
300+ words with at least one subsection. Describe layering, request flow, data flow. Use file paths as evidence. Where appropriate, include a small ASCII diagram or a Mermaid block inside a ```mermaid fence.

## Getting Started
Full setup instructions. Show the actual commands (not placeholders). Cover prerequisites, installation, env configuration, and how to run dev servers for every service in the project.

## Project Structure
A tree view (```) showing top-level directories and key files, with one-line descriptions beside important entries.

## Key Components
For each of the 5-10 most important components/files listed in the analysis, give a short section (one heading + 2-4 sentence paragraph) covering its responsibility, its inputs/outputs, and how it interacts with other components.

## Technologies Used
A table with columns: Technology | Purpose | Version (if known). Include every item from the analysis.

## API Reference (only if the project exposes an API)
List each endpoint with method, path, purpose, request/response shape.

## Contributing
Concrete contributing notes: how to run tests, coding conventions, where to file issues.

Be specific, cite file paths, and avoid marketing fluff. Output pure Markdown — no wrapping code fences around the whole document."""

        return await self._generate(prompt)

    async def generate_diagrams(self, analysis: Dict) -> Dict[str, str]:
        """
        Generate three Mermaid diagrams. Each runs as a focused LLM call so
        the model can produce a detailed diagram instead of three cramped
        ones from a single prompt. Calls run in parallel.
        """
        analysis_json = json.dumps(analysis, indent=2)

        tasks = [
            self._diagram_architecture(analysis_json),
            self._diagram_flowchart(analysis_json),
            self._diagram_class(analysis_json),
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        keys = ["architecture", "flowchart", "class_diagram"]
        diagrams: Dict[str, str] = {}
        for key, result in zip(keys, results):
            if isinstance(result, Exception):
                logger.exception("Diagram generation failed for %s: %s", key, result)
                diagrams[key] = ""
            else:
                diagrams[key] = _fix_mermaid(result or "")
        return diagrams

    _MERMAID_RULES = (
        "STRICT Mermaid syntax rules:\n"
        "- Edge labels use -->|label| (no trailing > after the closing pipe)\n"
        "- Node IDs are alphanumeric, no spaces (use A, B1, ServiceNode, etc.)\n"
        "- Node labels in brackets/parens can contain spaces: A[My Service]\n"
        "- Include at least one edge label per connection to show relationship type\n"
        "- NEVER draw an edge that targets a subgraph label — subgraphs are not nodes.\n"
        "  WRONG: E -->|calls| subgraph Backend\n"
        "  Declare subgraphs as blocks first, then target a NODE inside them:\n"
        "      subgraph Backend\n"
        "          S1[Service]\n"
        "      end\n"
        "      E -->|calls| S1\n"
        "- Every `subgraph Name` must be matched by an `end` on its own line.\n"
        "Return ONLY the raw Mermaid code — no ```mermaid fences, no explanation."
    )

    async def _diagram_architecture(self, analysis_json: str) -> str:
        """High-level architecture: layers, services, external systems."""
        prompt = f"""Generate a detailed Mermaid architecture diagram for this codebase.

Analysis:
{analysis_json}

Requirements:
- Use `graph TB` or `flowchart TB`
- Show EVERY major component from the analysis — aim for 8-15 nodes
- Group by layer using `subgraph` blocks (e.g. Frontend, API Layer, Services, Storage, External)
- Show external systems (LLM providers, databases, third-party APIs) as distinct nodes
- Every edge labelled with the relationship type (e.g. "HTTP", "embeds", "streams SSE", "invokes")

{self._MERMAID_RULES}"""
        return await self._call_mermaid(prompt)

    async def _diagram_flowchart(self, analysis_json: str) -> str:
        """Request / data flow through the primary user journey."""
        prompt = f"""Generate a detailed Mermaid flowchart showing the end-to-end flow of the primary user action in this project (e.g. analyzing a repo, sending a chat message — pick the most central user journey from the analysis).

Analysis:
{analysis_json}

Requirements:
- Use `flowchart TD` or `flowchart TB`
- Start from the user action (e.g. "User submits URL") and follow through to the final result visible to the user
- Aim for 10-20 nodes covering every meaningful step: input validation, async dispatch, external calls, state transitions, streaming, final response
- Use decision diamonds `A{{"Is X valid?"}}` for branching logic
- Label every edge with what's happening at that step
- Include error/failure paths where they exist in the code
- DO NOT use subgraphs in the flowchart — keep it a linear/branching flow

{self._MERMAID_RULES}"""
        return await self._call_mermaid(prompt)

    async def _diagram_class(self, analysis_json: str) -> str:
        """Class/component relationships — who composes or uses whom."""
        prompt = f"""Generate a Mermaid class diagram showing the core classes/modules of this codebase and their relationships.

Analysis:
{analysis_json}

Requirements:
- Use `classDiagram`
- Include the 6-12 most important classes/services/components from the analysis
- For each, show 3-5 representative methods or fields
- Draw composition (`*--`), aggregation (`o--`), and dependency (`..>`) relationships where they exist
- Label relationships with a verb (e.g. "uses", "creates", "retrieves")

If the project is not strongly class-oriented (e.g. a functional frontend), produce a component diagram using `classDiagram` with modules as "classes" and their exports as methods.

{self._MERMAID_RULES}"""
        return await self._call_mermaid(prompt)

    async def _call_mermaid(self, prompt: str) -> str:
        """Plain-text LLM call that strips accidental ```mermaid fences."""
        text = await self._generate(prompt, json_mode=False)
        if not isinstance(text, str):
            return ""
        text = text.strip()
        fence_match = re.search(r"```(?:mermaid)?\s*\n([\s\S]*?)```", text)
        if fence_match:
            text = fence_match.group(1).strip()
        return text

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

        if self.provider == "nim":
            async for chunk in self._nim_stream(messages):
                yield chunk
        elif self.provider == "groq":
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
        elif self.provider == "nim":
            return await self._generate_nim(prompt, json_mode)
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

        for attempt in range(5):
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    GROQ_API_URL,
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )

            if response.status_code == 429:
                wait = int(response.headers.get("retry-after", 2 ** (attempt + 1)))
                logger.warning("Groq rate limit hit — retrying in %ss (attempt %s/5)", wait, attempt + 1)
                await asyncio.sleep(wait)
                continue

            response.raise_for_status()
            text = response.json()["choices"][0]["message"]["content"]
            return self._parse_json(text) if json_mode else text

        raise RuntimeError("Groq rate limit: all 5 retry attempts exhausted.")

    async def _generate_nim(self, prompt: str, json_mode: bool):
        """NVIDIA NIM API via OpenAI SDK. Skips reasoning_content, uses content only."""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=self.nim_api_key,
            timeout=60.0,
        )

        # Thinking disabled for analysis — structured JSON calls don't need deep reasoning
        # and the reasoning model adds 60-90s per call making analysis unbearably slow
        kwargs: Dict = {
            "model": self.nim_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 4096,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        response = await client.chat.completions.create(**kwargs)
        text = response.choices[0].message.content or ""
        return self._parse_json(text) if json_mode else text

    async def _nim_stream(self, messages: List[Dict]) -> AsyncGenerator[str, None]:
        """Stream from NVIDIA NIM. Skips reasoning_content tokens, yields only content."""
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=self.nim_api_key,
            timeout=120.0,
        )

        # Only Nemotron-family reasoning models accept enable_thinking / reasoning_budget.
        # Non-reasoning models (MiniMax, Llama, Mistral) reject the extra keys.
        is_reasoning_model = "nemotron" in self.nim_model.lower()
        kwargs: Dict = {
            "model": self.nim_model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 16384 if is_reasoning_model else 8192,
            "stream": True,
        }
        if is_reasoning_model:
            kwargs["extra_body"] = {
                "chat_template_kwargs": {"enable_thinking": True},
                "reasoning_budget": 16384,
            }

        try:
            stream = await client.chat.completions.create(**kwargs)
            async for chunk in stream:
                if not chunk.choices:
                    continue
                delta = chunk.choices[0].delta
                # Skip internal reasoning tokens — only surface the final answer
                if getattr(delta, "reasoning_content", None):
                    continue
                if delta.content:
                    yield delta.content
        except Exception as e:
            yield f"\n\nError: {str(e)}"

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
            except Exception:
                logger.exception("Ollama request failed")
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
                logger.warning("Failed to parse JSON from LLM output: %s...", text[:200])
                return {
                    "overview": "Analysis completed but response could not be parsed.",
                    "purpose": text[:500] if text else "No output received from LLM.",
                    "architecture": {
                        "pattern": "Unknown",
                        "components": [],
                        "description": "Could not extract architecture details.",
                    },
                    "technologies": {"languages": [], "frameworks": [], "libraries": []},
                    "key_files": [],
                    "entry_points": [],
                    "dependencies": [],
                    "strengths": [],
                    "improvements": ["Try re-analyzing — the LLM response was malformed."],
                    "complexity": "unknown",
                }

    def _build_code_context(self, code_data: Dict, max_chars: int = 35000) -> str:
        context_parts = []
        char_count = 0

        # Groq free-tier has a per-request payload limit that rejects very
        # large prompts with HTTP 413. 35K chars (~8.5K tokens) is the sweet
        # spot: big enough for rich analysis, small enough to fit. Paid tiers
        # and Gemini can take much more.
        if self.provider == "ollama":
            max_chars = 18000
            max_file_chars = 2500
        elif self.provider == "groq":
            max_chars = 35000
            max_file_chars = 3000
        elif self.provider == "nim":
            max_chars = 50000
            max_file_chars = 4000
        else:  # gemini
            max_chars = 100000
            max_file_chars = 8000

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
