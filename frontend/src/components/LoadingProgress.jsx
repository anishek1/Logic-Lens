import { useEffect, useState, useRef } from 'react'

const STEPS = [
    { id: 'clone',   label: 'Cloning Repository',   sub: 'Fetching source from GitHub',         pct: 10  },
    { id: 'index',   label: 'Building Vector Index', sub: 'Embedding code chunks for RAG',      pct: 25  },
    { id: 'analyze', label: 'AI Analysis',           sub: 'Understanding architecture & stack', pct: 30  },
    { id: 'docs',    label: 'Generating Docs',       sub: 'Writing Markdown documentation',     pct: 70  },
    { id: 'diagram', label: 'Creating Diagrams',     sub: 'Rendering Mermaid architecture',     pct: 90  },
]

function stepFromProgress(p) {
    for (let i = STEPS.length - 1; i >= 0; i--) {
        if (p >= STEPS[i].pct) return i
    }
    return 0
}

export default function LoadingProgress({ jobId, onComplete, onError }) {
    const [progress, setProgress]   = useState(0)
    const [stepIdx,  setStepIdx]    = useState(0)
    const [status,   setStatus]     = useState('connecting')

    const onCompleteRef = useRef(onComplete)
    const onErrorRef    = useRef(onError)
    useEffect(() => { onCompleteRef.current = onComplete; onErrorRef.current = onError })

    useEffect(() => {
        if (!jobId) return
        const es = new EventSource(`${import.meta.env.VITE_API_URL || ''}/api/analyze/stream/${jobId}`)

        es.onmessage = (e) => {
            try {
                const d = JSON.parse(e.data)
                setProgress(d.progress || 0)
                setStepIdx(stepFromProgress(d.progress || 0))
                setStatus(d.status)

                if (d.status === 'completed') {
                    es.close()
                    onCompleteRef.current?.()
                } else if (d.status === 'failed') {
                    es.close()
                    onErrorRef.current?.(d.error || 'Analysis failed')
                }
            } catch {}
        }

        es.onerror = () => {
            setStatus('error')
            es.close()
            onErrorRef.current?.('Connection to server lost. Please refresh.')
        }

        return () => es.close()
    }, [jobId])

    const currentStep = STEPS[stepIdx]

    return (
        <div className="card neon-border animate-fade-in max-w-lg mx-auto">
            {/* Top: animated icon */}
            <div className="text-center mb-7">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--cyan-dim)] neon-border animate-pulse-glow mb-4">
                    <svg className="w-7 h-7 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                    </svg>
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Analyzing Repository</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1 font-mono">
                    {currentStep?.sub ?? 'Starting…'}
                </p>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-mono text-[var(--text-muted)]">{currentStep?.label}</span>
                    <span className="text-xs font-mono text-[var(--cyan)]">{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                            width: `${progress}%`,
                            background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
                            boxShadow: '0 0 8px rgba(0,212,255,0.6)',
                        }}
                    />
                </div>
            </div>

            {/* Step list */}
            <div className="space-y-2">
                {STEPS.map((step, i) => {
                    const done    = i < stepIdx
                    const current = i === stepIdx
                    return (
                        <div
                            key={step.id}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                                current ? 'bg-[var(--cyan-dim)] neon-border' :
                                done    ? 'bg-[rgba(16,185,129,0.06)]'       : 'opacity-35'
                            }`}
                        >
                            {/* Icon */}
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                done    ? 'bg-emerald-500/20 text-emerald-400' :
                                current ? 'bg-[var(--cyan-dim)] text-[var(--cyan)]' :
                                          'bg-[var(--bg-overlay)] text-[var(--text-muted)]'
                            }`}>
                                {done ? (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                    </svg>
                                ) : current ? (
                                    <span className="w-2 h-2 rounded-full bg-[var(--cyan)] animate-pulse block"/>
                                ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-current block"/>
                                )}
                            </div>

                            <span className={`text-sm font-medium ${
                                done    ? 'text-emerald-400' :
                                current ? 'text-[var(--cyan)]' :
                                          'text-[var(--text-muted)]'
                            }`}>
                                {step.label}
                            </span>

                            {current && (
                                <div className="ml-auto flex gap-1">
                                    {[0,80,160].map(d => (
                                        <span
                                            key={d}
                                            className="w-1 h-1 rounded-full bg-[var(--cyan)] animate-bounce"
                                            style={{ animationDelay: `${d}ms` }}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {status === 'error' && (
                <div className="mt-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-sm text-center">
                    Connection lost — please refresh and try again.
                </div>
            )}
        </div>
    )
}
