import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

const SUGGESTIONS = [
    'What does this project do?',
    'Explain the main architecture',
    'What are the key entry points?',
    'How can this code be improved?',
]

function UserAvatar() {
    return (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--bg-overlay)] border border-[var(--border-default)] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
        </div>
    )
}

function BotAvatar() {
    return (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--cyan-dim)] border border-[var(--border-default)] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
        </div>
    )
}

export default function ChatPanel({ context, jobId, onBackToAnalysis }) {
    const [messages,  setMessages]  = useState([])
    const [input,     setInput]     = useState('')
    const [loading,   setLoading]   = useState(false)
    const [streaming, setStreaming] = useState('')
    const bottomRef  = useRef(null)
    const inputRef   = useRef(null)

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streaming])

    const send = async (text) => {
        const msg = text.trim()
        if (!msg || loading) return

        setInput('')
        setLoading(true)
        setStreaming('')
        setMessages(p => [...p, { role: 'user', content: msg }])

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msg, history: messages, context: context?.analysis, job_id: jobId }),
            })
            if (!res.ok) {
                const detail = await res.text().catch(() => '')
                throw new Error(`Chat request failed (${res.status}${detail ? ': ' + detail.slice(0, 200) : ''})`)
            }

            const reader  = res.body.getReader()
            const decoder = new TextDecoder()
            let full = ''
            while (true) {
                const { done, value } = await reader.read()
                if (done) break
                full += decoder.decode(value, { stream: true })
                setStreaming(full)
            }
            setMessages(p => [...p, { role: 'assistant', content: full }])
            setStreaming('')
        } catch (err) {
            console.error('ChatPanel: send failed', err)
            setMessages(p => [...p, { role: 'assistant', content: `❌ ${err.message || 'Something went wrong. Please try again.'}`, isError: true }])
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleSubmit = (e) => { e.preventDefault(); send(input) }

    /* ── No analysis yet ─────────────────────────────────── */
    if (!context || !jobId) {
        return (
            <div className="card neon-border flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] neon-border flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No codebase analyzed yet</h2>
                <p className="text-sm text-[var(--text-muted)] max-w-xs mb-6">
                    Analyze a GitHub repo first. The chat uses RAG to search actual source files for every answer.
                </p>
                <button onClick={onBackToAnalysis} className="btn-primary">
                    ← Go to Analyze
                </button>
            </div>
        )
    }

    /* ── Chat UI ─────────────────────────────────────────── */
    return (
        <div className="card neon-border flex flex-col animate-fade-in" style={{ height: 'calc(100vh - 220px)', minHeight: '520px' }}>

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                    <BotAvatar/>
                    <div>
                        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Code Assistant</h2>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                            <span className="text-[0.7rem] font-mono text-[var(--text-muted)]">RAG · source search active</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    {messages.length > 0 && (
                        <button onClick={() => setMessages([])} className="btn-ghost text-xs">
                            Clear
                        </button>
                    )}
                    <button onClick={onBackToAnalysis} className="btn-ghost text-xs">
                        ← Analysis
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">

                {/* Empty state */}
                {messages.length === 0 && !streaming && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8 animate-fade-in">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--cyan-dim)] neon-border flex items-center justify-center mb-4">
                            <svg className="w-7 h-7 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                            </svg>
                        </div>
                        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Ask anything about the codebase</h3>
                        <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
                            I search the actual source files using RAG to give precise, referenced answers.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-md">
                            {SUGGESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => send(q)}
                                    className="px-3.5 py-2 rounded-lg text-xs font-medium neon-border bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--cyan)] hover:bg-[var(--cyan-dim)] hover:border-[var(--border-accent)] transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Message list */}
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2.5 animate-fade ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && <BotAvatar/>}
                        <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm ${
                            msg.role === 'user'
                                ? 'text-white'
                                : msg.isError
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                    : 'bg-[var(--bg-elevated)] neon-border text-[var(--text-primary)]'
                        }`}
                        style={msg.role === 'user' ? {
                            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
                            border: '1px solid rgba(0,212,255,0.2)',
                        } : {}}>
                            {msg.role === 'assistant' ? (
                                <MarkdownRenderer content={msg.content}/>
                            ) : (
                                <p className="leading-relaxed">{msg.content}</p>
                            )}
                        </div>
                        {msg.role === 'user' && <UserAvatar/>}
                    </div>
                ))}

                {/* Streaming response */}
                {streaming && (
                    <div className="flex gap-2.5 animate-fade">
                        <BotAvatar/>
                        <div className="max-w-[78%] rounded-xl px-4 py-3 bg-[var(--bg-elevated)] neon-border text-sm text-[var(--text-primary)]">
                            <MarkdownRenderer content={streaming}/>
                        </div>
                    </div>
                )}

                {/* Typing indicator */}
                {loading && !streaming && (
                    <div className="flex gap-2.5 animate-fade">
                        <BotAvatar/>
                        <div className="rounded-xl px-4 py-3 bg-[var(--bg-elevated)] neon-border">
                            <div className="flex gap-1.5 items-center h-4">
                                {[0,150,300].map(d => (
                                    <span key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] animate-bounce" style={{ animationDelay: `${d}ms`}}/>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef}/>
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="pt-3.5 mt-3.5 border-t border-[var(--border-subtle)] flex gap-2.5">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask about the codebase…"
                    className="input flex-1 text-sm"
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="btn-primary px-4"
                >
                    {loading ? (
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                        </svg>
                    )}
                </button>
            </form>
        </div>
    )
}
