# LogicLens - AI-Powered Code Intelligence Platform

## Vision
A **next-generation code understanding tool** that goes beyond documentation generation to provide an **interactive, conversational AI experience** for exploring and learning codebases.

---

## Problems with Current Solution (CodeX/ArchAI)

| Issue | Impact |
|-------|--------|
| Slow multi-agent orchestration | Takes 5-10+ mins for small repos |
| Complex setup (CrewAI + Qdrant + dependencies) | High barrier to entry |
| One-shot output (no interactivity) | Can't ask follow-up questions |
| No streaming feedback | User waits blindly |
| Outdated dependencies | Python 3.13 compatibility issues |
| Static diagrams only | No interactive exploration |

---

## LogicLens: Key Differentiators

### 🚀 Speed First
- Single LLM call for initial analysis (not 5 serial agents)
- Streaming responses - see results as they generate
- Smart caching - don't re-analyze unchanged files

### 💬 Conversational Intelligence
- **Chat with your codebase** - ask questions, get answers
- "Explain this function", "How does auth work?", "Find all API endpoints"
- Maintains conversation context

### 🎯 Learning Mode
- Generate flashcards from code concepts
- Quiz yourself on architecture
- Progressive learning paths

### 🎨 Modern UI/UX
- Beautiful, responsive design
- Dark/light mode
- Interactive diagram viewer (zoom, pan, click to explore)

### 📊 Enhanced Outputs
- Markdown documentation
- Mermaid diagrams (rendered in-browser, no PlantUML server needed)
- Code flow visualizations
- Dependency graphs

---

## Core Features (MVP)

### Phase 1: Foundation
1. **Repo Ingestion**
   - Clone from GitHub URL
   - Parse local directories
   - Support: Python, JavaScript, TypeScript, Java, Go

2. **AI Analysis Engine**
   - Single-pass comprehensive analysis
   - Streaming output to UI
   - Structured JSON output for rendering

3. **Documentation Generation**
   - Auto-generated README
   - Architecture overview
   - Component descriptions

4. **Diagram Generation**
   - Mermaid.js diagrams (no external deps)
   - Class diagrams, flowcharts, sequence diagrams
   - Interactive rendering in browser

### Phase 2: Intelligence
5. **Chat with Code**
   - Natural language Q&A
   - Context-aware responses
   - Code snippet references

6. **Smart Search**
   - Semantic code search
   - Find by functionality, not just text

### Phase 3: Learning
7. **Learning Mode**
   - Concept flashcards
   - Architecture quizzes
   - Progress tracking

---

## Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| **React + Vite** | Fast, modern SPA framework |
| **TailwindCSS** | Rapid UI styling |
| **shadcn/ui** | Beautiful, accessible components |
| **Mermaid.js** | In-browser diagram rendering |
| **React Flow** | Interactive node-based visualizations |

### Backend
| Tech | Purpose |
|------|---------|
| **FastAPI** | High-performance Python API |
| **LangChain** | LLM orchestration & code parsing |
| **Google Gemini** | Primary LLM (fast, cheap, good) |
| **SQLite** | Local persistence (no Docker needed) |
| **GitPython** | Repository operations |

### Infrastructure
| Tech | Purpose |
|------|---------|
| **Python 3.11+** | Backend runtime |
| **Node 18+** | Frontend tooling |
| **Pydantic** | Data validation |
| **SSE (Server-Sent Events)** | Real-time streaming |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │ Repo UI │  │ Chat UI │  │ Diagrams│  │ Learn  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │
└───────┼────────────┼────────────┼───────────┼───────┘
        │            │            │           │
        ▼            ▼            ▼           ▼
┌─────────────────────────────────────────────────────┐
│                  FastAPI Backend                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ /analyze │  │ /chat    │  │ /generate-*      │  │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │
└───────┼─────────────┼─────────────────┼─────────────┘
        │             │                 │
        ▼             ▼                 ▼
┌─────────────────────────────────────────────────────┐
│                 Analysis Engine                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ CodeParser│  │ LLM Chain│  │ Diagram Generator│  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│   Google Gemini API    │    SQLite (cache/history)  │
└─────────────────────────────────────────────────────┘
```

---

## To-Do List (Implementation Order)

### 🔧 Setup (Day 1)
- [ ] Initialize project structure
- [ ] Set up FastAPI backend skeleton
- [ ] Set up React + Vite frontend
- [ ] Configure TailwindCSS + shadcn/ui
- [ ] Environment configuration (.env)

### 🔌 Backend Core (Days 2-3)
- [ ] Repository cloning endpoint
- [ ] Code parser (Python, JS, TS support)
- [ ] Gemini LLM integration
- [ ] Streaming analysis endpoint (SSE)
- [ ] SQLite database setup

### 🎨 Frontend Core (Days 3-4)
- [ ] Landing/home page
- [ ] Repository input form
- [ ] Analysis results view (streaming)
- [ ] Mermaid diagram renderer
- [ ] Dark/light mode toggle

### 📄 Documentation Generation (Day 5)
- [ ] README template engine
- [ ] Component documentation
- [ ] Architecture summary
- [ ] Export to Markdown

### 📊 Diagram Generation (Day 6)
- [ ] Class diagram generation
- [ ] Flow diagram generation
- [ ] Dependency graph
- [ ] Interactive diagram viewer

### 💬 Chat Feature (Days 7-8)
- [ ] Chat UI component
- [ ] Context-aware LLM prompts
- [ ] Code reference display
- [ ] Conversation history

### 🎓 Learning Mode (Days 9-10)
- [ ] Flashcard generator
- [ ] Quiz system
- [ ] Progress tracking UI

### 🧪 Polish (Day 11+)
- [ ] Error handling & edge cases
- [ ] Loading states & animations
- [ ] Mobile responsiveness
- [ ] Performance optimization
- [ ] Documentation & README

---

## File Structure (Planned)

```
LogicLens/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── routes/
│   │   │   ├── analyze.py    # Analysis endpoints
│   │   │   ├── chat.py       # Chat endpoints
│   │   │   └── generate.py   # Generation endpoints
│   │   ├── services/
│   │   │   ├── code_parser.py
│   │   │   ├── llm_service.py
│   │   │   └── diagram_service.py
│   │   └── models/
│   │       └── schemas.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Analysis time (small repo) | < 30 seconds |
| First meaningful output | < 5 seconds (streaming) |
| Setup time for new users | < 2 minutes |
| Supported languages | 5+ |
| User satisfaction | "It's fast and actually useful" |

---

## Questions for User Review

1. **Language Priority**: Which programming languages should we support first? (Current: Python, JS, TS)
2. **Hosting**: Local-only or want cloud deployment option?
3. **LLM Preference**: Stick with Gemini or support multiple providers?
4. **Learning Mode Priority**: Is this core feature or nice-to-have?
