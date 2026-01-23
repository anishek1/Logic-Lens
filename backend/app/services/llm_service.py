"""
LLM Service - Interface for code analysis (Gemini & Ollama supported)
"""
import os
import json
from typing import Dict, List, Optional, AsyncGenerator
import google.generativeai as genai
from dotenv import load_dotenv
import httpx

load_dotenv()

class LLMService:
    """LLM interface for code analysis and chat"""
    
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "mistral")
        
        if self.provider == "gemini":
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                print("⚠️ GEMINI_API_KEY not found. Defaulting to Ollama.")
                self.provider = "ollama"
            else:
                genai.configure(api_key=api_key)
                self.model = genai.GenerativeModel('gemini-pro')
    
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

        # For Ollama, we relax strict JSON mode to avoid failures
        use_json_mode = self.provider != "ollama"
        response = await self._generate(prompt, json_mode=use_json_mode)
        
        if self.provider == "ollama" and isinstance(response, str):
            # DEBUG: Save raw response to check what's happening
            try:
                with open("debug_ollama_diagrams.txt", "w", encoding="utf-8") as f:
                    f.write(response)
            except: pass
            
            # Try to extract diagrams from raw text
            return self._extract_mermaid(response)
            
        return response

    async def _generate_diagrams_fallback(self, analysis: Dict) -> Dict[str, str]:
        """Fallback method: Try to generate diagrams with a simpler prompt if JSON fails"""
        # This is implicitly handled by the smarter _parse_json/extract logic below now
        pass

    def _extract_mermaid(self, text: str) -> Dict[str, str]:
        """Extract mermaid code blocks from text when JSON parsing fails"""
        import re
        diagrams = {
            "class_diagram": "",
            "flowchart": "",
            "architecture": ""
        }
        
        # 1. Look for code blocks marked as mermaid
        mermaid_blocks = re.findall(r'```mermaid\n([\s\S]*?)```', text)
        
        # 2. Look for loose mermaid syntax if no blocks found
        if not mermaid_blocks:
            # VERY permissive regex
            class_match = re.search(r'classDiagram[\s\S]*?(?=\n\n|```|$)', text)
            if class_match: mermaid_blocks.append(class_match.group(0))
            
            flow_match = re.search(r'(graph|flowchart) .*[\s\S]*?(?=\n\n|```|$)', text, re.IGNORECASE)
            if flow_match: mermaid_blocks.append(flow_match.group(0))
            
            seq_match = re.search(r'sequenceDiagram[\s\S]*?(?=\n\n|```|$)', text)
            if seq_match: mermaid_blocks.append(seq_match.group(0))

        # Assign found blocks to keys (best effort)
        if len(mermaid_blocks) > 0: diagrams["class_diagram"] = mermaid_blocks[0]
        if len(mermaid_blocks) > 1: diagrams["flowchart"] = mermaid_blocks[1] 
        if len(mermaid_blocks) > 2: diagrams["architecture"] = mermaid_blocks[2]
        
        # If we only found one block, populate all tabs with it (better than nothing)
        if len(mermaid_blocks) == 1:
             diagrams["flowchart"] = mermaid_blocks[0]
             diagrams["architecture"] = mermaid_blocks[0]
                
        return diagrams
    
    async def chat_stream(
        self,
        message: str,
        history: List[Dict],
        context: Optional[Dict] = None
    ) -> AsyncGenerator[str, None]:
        """Stream a chat response"""
        
        # Build conversation context
        messages = []
        
        system_msg = "You are a helpful AI code assistant."
        if context:
            system_msg += f"\n\nContext about the codebase:\n{json.dumps(context, indent=2)}\n"
        
        if self.provider == "ollama":
            # Ollama format
            messages.append({"role": "system", "content": system_msg})
            for msg in history[-10:]:
                messages.append({"role": msg["role"], "content": msg["content"]})
            messages.append({"role": "user", "content": message})
            
            async for chunk in self._ollama_stream(messages):
                yield chunk
                
        else:
            # Gemini format
            full_prompt = system_msg + "\n\n"
            for msg in history[-10:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                full_prompt += f"{role}: {msg['content']}\n"
            full_prompt += f"User: {message}\nAssistant:"
            
            response = self.model.generate_content(full_prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text

    async def _generate(self, prompt: str, json_mode: bool = False) -> any:
        """Generate a response from the configured LLM"""
        
        if self.provider == "ollama":
            return await self._generate_ollama(prompt, json_mode)
        else:
            return await self._generate_gemini(prompt, json_mode)

    async def _generate_gemini(self, prompt: str, json_mode: bool) -> any:
        response = self.model.generate_content(prompt)
        text = response.text
        
        if json_mode:
            return self._parse_json(text)
        return text

    async def _generate_ollama(self, prompt: str, json_mode: bool) -> any:
        async with httpx.AsyncClient(timeout=300.0) as client:
            payload = {
                "model": self.ollama_model,
                "prompt": prompt,
                "stream": False,
                "format": "json" if json_mode else None,
                "options": {
                    "temperature": 0.3,  # Lower temperature for more consistent JSON
                    "num_ctx": 8192      # Increase context window if possible
                }
            }
            try:
                response = await client.post(
                    f"{self.ollama_base_url}/api/generate",
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                text = result.get("response", "")
                
                if json_mode:
                    return self._parse_json(text)
                return text
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
                    timeout=None
                ) as response:
                    async for line in response.aiter_lines():
                        if not line: continue
                        try:
                            chunk = json.loads(line)
                            if "message" in chunk and "content" in chunk["message"]:
                                yield chunk["message"]["content"]
                        except:
                            pass
            except Exception as e:
                yield f"Error: {str(e)}"

    def _parse_json(self, text: str) -> Dict:
        try:
            # aggressive cleaning
            cleaned = text.strip()
            # Remove markdown code blocks
            if "```" in cleaned:
                # Find the first and last occurrence of curly braces
                start = cleaned.find("{")
                end = cleaned.rfind("}")
                if start != -1 and end != -1:
                    cleaned = cleaned[start:end+1]
            
            return json.loads(cleaned)
        except json.JSONDecodeError:
            # Fallback: try to repair common issues
            try:
                # Sometimes models output single quotes
                import ast
                return ast.literal_eval(cleaned)
            except:
                print(f"Failed to parse JSON: {text[:200]}...")
                # Return a safe partial object so the UI doesn't crash
                return {
                    "overview": "Analysis failed to parse",
                    "purpose": "Raw output: " + text[:500],
                    "technologies": {"languages": [], "frameworks": []} 
                }

    def _build_code_context(self, code_data: Dict, max_chars: int = 15000) -> str:
        """Build code context string, prioritizing important files (Limited for Local LLM)"""
        context_parts = []
        char_count = 0
        
        # Reduced max_chars for local models to prevent timeouts/overflows
        max_chars = 12000 if self.provider == "ollama" else 50000
        
        priority_patterns = [
            'main', 'app', 'index', 'server', 'config',
            '__init__', 'setup', 'package.json', 'requirements', 'README'
        ]
        
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
            
            # Limit individual file size too
            content = file['content'][:3000]
            entry = f"\n### {file['path']} ({file['language']})\n```{file['language']}\n{content}\n```\n"
            
            if char_count + len(entry) <= max_chars:
                context_parts.append(entry)
                char_count += len(entry)
        
        return "\n".join(context_parts)
