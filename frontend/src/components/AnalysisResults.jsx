import { useState } from 'react'
import MermaidDiagram from './MermaidDiagram'
import MarkdownRenderer from './MarkdownRenderer'

const COMPLEXITY_CONFIG = {
    low:     { label: 'Low',     cls: 'tag-green', dot: '#10b981' },
    medium:  { label: 'Medium',  cls: 'tag-amber', dot: '#f59e0b' },
    high:    { label: 'High',    cls: 'tag-red',   dot: '#ef4444' },
    unknown: { label: 'Unknown', cls: 'tag-cyan',  dot: '#00d4ff' },
}

const LANG_COLORS = {
    python: '#3b82f6', javascript: '#f59e0b', typescript: '#3b82f6',
    java: '#ef4444', go: '#06b6d4', rust: '#f97316',
    cpp: '#8b5cf6', c: '#6366f1', csharp: '#a78bfa',
    ruby: '#e11d48', php: '#7c3aed',
}

function LangDot({ lang }) {
    const color = LANG_COLORS[lang?.toLowerCase()] ?? '#6366f1'
    return <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }}/>
}

function SectionTab({ id, label, icon, active, onClick }) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                active
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
            style={active ? {
                background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(124,58,237,0.18))',
                border: '1px solid rgba(0,212,255,0.25)',
            } : {}}
        >
            <span className="text-base">{icon}</span>
            {label}
        </button>
    )
}

export default function AnalysisResults({ data }) {
    const [section, setSection]     = useState('overview')
    const [diagram, setDiagram]     = useState('architecture')

    const { analysis, documentation, diagrams } = data
    const complexity = COMPLEXITY_CONFIG[analysis?.complexity] ?? COMPLEXITY_CONFIG.unknown

    const parseFailed = analysis?.overview === 'Analysis completed but response could not be parsed.'

    const SECTIONS = [
        { id: 'overview',      label: 'Overview',      icon: '📋' },
        { id: 'architecture',  label: 'Architecture',  icon: '🏗️' },
        { id: 'diagrams',      label: 'Diagrams',      icon: '📊' },
        { id: 'docs',          label: 'Docs',          icon: '📄' },
    ]
    const DIAGRAM_TYPES = [
        { id: 'architecture', label: 'Architecture' },
        { id: 'class_diagram',label: 'Class'        },
        { id: 'flowchart',    label: 'Flowchart'    },
    ]

    return (
        <div className="space-y-5 animate-fade-in">

            {parseFailed && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm animate-fade-in">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    LLM response was malformed. Re-analyze for better results.
                </div>
            )}

            {/* Section tabs */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
                {SECTIONS.map(s => (
                    <SectionTab key={s.id} {...s} active={section === s.id} onClick={setSection}/>
                ))}
            </div>

            {/* ── Overview ───────────────────────────────────── */}
            {section === 'overview' && (
                <div className="space-y-4 animate-fade-in">
                    {/* Hero banner */}
                    <div className="card neon-border" style={{
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(99,102,241,0.08) 50%, rgba(124,58,237,0.05) 100%)'
                    }}>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1.5 leading-snug">
                                    {analysis?.overview || 'Project Overview'}
                                </h2>
                                <p className="text-[var(--text-secondary)] leading-relaxed text-sm">
                                    {analysis?.purpose || 'No description available.'}
                                </p>
                            </div>
                            <span className={`tag ${complexity.cls} flex-shrink-0 flex items-center gap-1.5`}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: complexity.dot }}/>
                                {complexity.label} Complexity
                            </span>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid sm:grid-cols-3 gap-3">
                        {/* Languages */}
                        <div className="card neon-border hover:neon-border-accent transition-all duration-200">
                            <p className="text-xs font-mono text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                                </svg>
                                Languages
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis?.technologies?.languages?.length
                                    ? analysis.technologies.languages.map(l => (
                                        <span key={l} className="tag tag-cyan flex items-center gap-1">
                                            <LangDot lang={l}/>{l}
                                        </span>
                                    ))
                                    : <span className="text-xs text-[var(--text-muted)]">—</span>
                                }
                            </div>
                        </div>

                        {/* Frameworks */}
                        <div className="card neon-border hover:neon-border-accent transition-all duration-200">
                            <p className="text-xs font-mono text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                                </svg>
                                Frameworks
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis?.technologies?.frameworks?.length
                                    ? analysis.technologies.frameworks.map(f => (
                                        <span key={f} className="tag tag-violet">{f}</span>
                                    ))
                                    : <span className="text-xs text-[var(--text-muted)]">—</span>
                                }
                            </div>
                        </div>

                        {/* Libraries */}
                        <div className="card neon-border hover:neon-border-accent transition-all duration-200">
                            <p className="text-xs font-mono text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                                </svg>
                                Libraries
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {analysis?.technologies?.libraries?.length
                                    ? analysis.technologies.libraries.slice(0,6).map(l => (
                                        <span key={l} className="tag tag-indigo text-[0.7rem]">{l}</span>
                                    ))
                                    : <span className="text-xs text-[var(--text-muted)]">—</span>
                                }
                            </div>
                        </div>
                    </div>

                    {/* Key files */}
                    {analysis?.key_files?.length > 0 && (
                        <div className="card neon-border">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                </svg>
                                Key Files
                            </h3>
                            <div className="space-y-2">
                                {analysis.key_files.slice(0,8).map((f, i) => (
                                    <div key={i} className="flex items-start gap-3 py-1.5 border-b border-[var(--border-subtle)] last:border-0">
                                        <span className="file-path flex-shrink-0 w-48 truncate">/{f.path}</span>
                                        <span className="text-xs text-[var(--text-muted)]">—</span>
                                        <span className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.purpose}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Strengths + Improvements */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {analysis?.strengths?.length > 0 && (
                            <div className="card neon-border">
                                <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Strengths
                                </h3>
                                <ul className="space-y-1.5">
                                    {analysis.strengths.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                            <span className="text-emerald-500 mt-0.5 flex-shrink-0">▸</span>{s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {analysis?.improvements?.length > 0 && (
                            <div className="card neon-border">
                                <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    Improvements
                                </h3>
                                <ul className="space-y-1.5">
                                    {analysis.improvements.map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                            <span className="text-amber-500 mt-0.5 flex-shrink-0">▸</span>{s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Architecture ──────────────────────────────── */}
            {section === 'architecture' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="card neon-border" style={{
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.07) 0%, rgba(124,58,237,0.07) 100%)'
                    }}>
                        <p className="text-xs font-mono text-[var(--text-muted)] mb-1">Pattern</p>
                        <h2 className="text-2xl font-bold gradient-text-cyan">
                            {analysis?.architecture?.pattern || 'N/A'}
                        </h2>
                    </div>

                    <div className="card neon-border">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                            </svg>
                            Components
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {analysis?.architecture?.components?.map((c, i) => (
                                <span key={i} className="tag tag-indigo">{c}</span>
                            )) || <span className="text-sm text-[var(--text-muted)]">None detected</span>}
                        </div>
                    </div>

                    <div className="card neon-border">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Description</h3>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                            {analysis?.architecture?.description || 'N/A'}
                        </p>
                    </div>

                    {analysis?.entry_points?.length > 0 && (
                        <div className="card neon-border">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Entry Points</h3>
                            <div className="flex flex-wrap gap-2">
                                {analysis.entry_points.map((ep, i) => (
                                    <span key={i} className="font-mono text-xs px-2.5 py-1 rounded-md bg-[var(--bg-overlay)] text-emerald-400 border border-[rgba(16,185,129,0.2)]">
                                        {ep}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Diagrams ──────────────────────────────────── */}
            {section === 'diagrams' && (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex gap-1.5">
                        {DIAGRAM_TYPES.map(d => (
                            <button
                                key={d.id}
                                onClick={() => setDiagram(d.id)}
                                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                    diagram === d.id
                                        ? 'bg-[var(--cyan-dim)] text-[var(--cyan)] border border-[var(--border-accent)]'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                                }`}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                    <div className="card neon-border min-h-[420px]">
                        {diagrams?.[diagram] ? (
                            <MermaidDiagram code={diagrams[diagram]}/>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-overlay)] flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3m0 0l3 3m-3-3v8m-4.5-4.5a9 9 0 1112.728 0"/>
                                    </svg>
                                </div>
                                <p className="text-sm text-[var(--text-muted)]">No {diagram.replace('_', ' ')} available</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Documentation ─────────────────────────────── */}
            {section === 'docs' && (
                <div className="animate-fade-in">
                    <div className="card neon-border">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Generated Documentation</h3>
                            <button
                                onClick={() => navigator.clipboard.writeText(documentation || '')}
                                className="btn-ghost text-xs"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                </svg>
                                Copy
                            </button>
                        </div>
                        <MarkdownRenderer content={documentation}/>
                    </div>
                </div>
            )}
        </div>
    )
}
