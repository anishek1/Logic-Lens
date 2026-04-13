import { useState } from 'react'

const EXAMPLES = [
    { name: 'Flask',   url: 'https://github.com/pallets/flask',    icon: '🐍', lang: 'Python' },
    { name: 'FastAPI', url: 'https://github.com/tiangolo/fastapi', icon: '⚡', lang: 'Python' },
    { name: 'Express', url: 'https://github.com/expressjs/express',icon: '🟢', lang: 'JS'     },
    { name: 'Vue.js',  url: 'https://github.com/vuejs/vue',        icon: '💚', lang: 'JS'     },
]

const FEATURES = [
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
        ),
        title: 'Auto Documentation',
        desc:  'Generates structured Markdown docs from any codebase in seconds.',
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3m0 0l3 3m-3-3v8m-4.5-4.5a9 9 0 1112.728 0"/>
            </svg>
        ),
        title: 'Live Diagrams',
        desc:  'Architecture, class, and flowchart diagrams rendered in real-time.',
    },
    {
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
        ),
        title: 'Chat with Code',
        desc:  'RAG-powered chat — searches actual source files for every answer.',
    },
]

export default function RepoInput({ onSubmit, isLoading }) {
    const [url, setUrl] = useState('')
    const [focused, setFocused] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (url.trim()) onSubmit(url.trim())
    }

    return (
        <div className="space-y-10">
            {/* ── Hero ─────────────────────────────────────── */}
            <div className="text-center space-y-5 animate-fade-in">
                <div className="inline-flex items-center gap-2 tag tag-cyan text-xs font-mono px-3 py-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-pulse"></span>
                    Powered by Groq · Gemini · Ollama
                </div>

                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.12]">
                    <span className="text-[var(--text-primary)]">Understand Any</span>
                    <br />
                    <span className="gradient-text">Codebase Instantly</span>
                </h1>

                <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto leading-relaxed">
                    Paste a GitHub URL. AI analyzes the architecture, generates documentation,
                    and lets you <span className="text-[var(--cyan)] font-medium">chat with the code</span>.
                </p>
            </div>

            {/* ── Input card ───────────────────────────────── */}
            <div className={`card neon-border transition-all duration-300 animate-fade-in stagger-1 ${focused ? 'neon-border-accent glow-cyan' : ''}`}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Terminal prompt line */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="font-mono text-xs text-[var(--text-muted)]">$</span>
                        <span className="font-mono text-xs text-[var(--cyan)]">git clone</span>
                        <span className={`font-mono text-xs text-[var(--text-muted)] cursor-blink ${!url ? 'inline' : 'hidden'}`}>▌</span>
                    </div>

                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                                </svg>
                            </span>
                            <input
                                type="text"
                                value={url}
                                onChange={e => setUrl(e.target.value)}
                                onFocus={() => setFocused(true)}
                                onBlur={() => setFocused(false)}
                                placeholder="https://github.com/username/repository"
                                className="input pl-10 h-13 font-mono text-sm"
                                disabled={isLoading}
                                style={{ height: '3.125rem' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !url.trim()}
                            className="btn-primary px-7"
                            style={{ height: '3.125rem' }}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                                        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                    </svg>
                                    Analyzing…
                                </>
                            ) : (
                                <>
                                    Analyze
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Example repos */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[0.75rem] text-[var(--text-muted)] font-mono">try →</span>
                        {EXAMPLES.map(r => (
                            <button
                                key={r.name}
                                type="button"
                                onClick={() => setUrl(r.url)}
                                disabled={isLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full neon-border bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:border-[var(--border-accent)] hover:bg-[var(--cyan-dim)] transition-all duration-150 disabled:opacity-40"
                            >
                                <span>{r.icon}</span>
                                {r.name}
                                <span className="text-[var(--text-muted)] text-[0.65rem]">{r.lang}</span>
                            </button>
                        ))}
                    </div>
                </form>
            </div>

            {/* ── Feature trio ─────────────────────────────── */}
            <div className="grid sm:grid-cols-3 gap-4 animate-fade-in stagger-2">
                {FEATURES.map((f, i) => (
                    <div
                        key={i}
                        className="card neon-border group hover:neon-border-accent hover:glow-cyan transition-all duration-250 text-center"
                    >
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 bg-[var(--cyan-dim)] text-[var(--cyan)] group-hover:bg-[rgba(0,212,255,0.18)] transition-colors">
                            {f.icon}
                        </div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">{f.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    )
}
