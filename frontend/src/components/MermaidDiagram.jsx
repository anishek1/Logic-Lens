import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#4f46e5',
        lineColor: '#a5b4fc',
        secondaryColor: '#7c3aed',
        tertiaryColor: '#1e1b4b',
    },
    securityLevel: 'loose',
})

function sanitizeMermaid(code) {
    if (!code || typeof code !== 'string') return code
    let c = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    // Strip any leftover ``` fences the backend may have missed
    c = c.replace(/^```(?:mermaid)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    // Remove markdown bold/italic inside labels
    c = c.replace(/\*\*([^*\n]+)\*\*/g, '$1')
    c = c.replace(/\*([^*\n]+)\*/g, '$1')
    // Strip %% comments
    c = c.replace(/%%[^\n]*/g, '')
    // Collapse 3+ blank lines
    c = c.replace(/\n{3,}/g, '\n\n')
    return c.trim()
}

export default function MermaidDiagram({ code }) {
    const containerRef = useRef(null)
    const [error, setError]       = useState(null)
    const [showRaw, setShowRaw]   = useState(false)
    const [copied, setCopied]     = useState(false)

    useEffect(() => {
        setError(null)
        setShowRaw(false)
        if (!containerRef.current || !code) return

        const clean = sanitizeMermaid(code)
        if (!clean) return

        containerRef.current.innerHTML = ''
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

        mermaid.render(id, clean).then(({ svg }) => {
            if (containerRef.current) {
                containerRef.current.innerHTML = svg
            }
        }).catch(() => {
            setError(true)
        })
    }, [code])

    const handleCopy = () => {
        navigator.clipboard.writeText(code || '')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (error) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/25">
                    <div className="flex items-center gap-2 text-amber-300 text-sm">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        Diagram syntax error — the LLM generated invalid Mermaid code.
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => setShowRaw(v => !v)} className="btn-ghost text-xs">
                            {showRaw ? 'Hide' : 'Show'} raw
                        </button>
                        <button onClick={handleCopy} className="btn-ghost text-xs">
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                </div>
                {showRaw && (
                    <pre className="text-xs text-[var(--text-secondary)] bg-[var(--bg-overlay)] rounded-lg p-4 overflow-x-auto leading-relaxed">
                        {code}
                    </pre>
                )}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="bg-white/5 rounded-xl p-4 overflow-x-auto min-h-[200px] flex items-center justify-center"
        >
            <div className="animate-pulse text-white/40">Loading diagram...</div>
        </div>
    )
}
