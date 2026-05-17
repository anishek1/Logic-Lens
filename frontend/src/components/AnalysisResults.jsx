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
        { id: 'onboarding',    label: 'Week 1 Guide',  icon: '🧭' },
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

            {/* ── Week 1 Onboarding Guide ───────────────────── */}
            {section === 'onboarding' && (() => {
                const guide = analysis?.onboarding_guide
                if (!guide || Object.keys(guide).length === 0) {
                    return (
                        <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-overlay)] flex items-center justify-center mb-4">
                                <svg className="w-7 h-7 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                            </div>
                            <p className="text-sm text-[var(--text-muted)]">Onboarding guide not available for this analysis.</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">Re-analyze the repository to generate a Week 1 guide.</p>
                        </div>
                    )
                }
                return (
                    <div className="space-y-4 animate-fade-in">
                        {/* Hero */}
                        <div className="card neon-border" style={{
                            background: 'linear-gradient(135deg, rgba(0,212,255,0.05) 0%, rgba(16,185,129,0.08) 50%, rgba(99,102,241,0.05) 100%)'
                        }}>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-2xl">🧭</span>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Week 1 Onboarding Guide</h2>
                            </div>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Everything a new engineer needs to go from zero to productive — specific file paths, exact commands, real gotchas.
                            </p>
                        </div>

                        {/* Quick Start */}
                        {guide.quick_start?.length > 0 && (
                            <div className="card neon-border">
                                <h3 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                    </svg>
                                    Quick Start
                                </h3>
                                <ol className="space-y-2">
                                    {guide.quick_start.map((step, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                            <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Files to Read First */}
                        {guide.files_to_read_first?.length > 0 && (
                            <div className="card neon-border">
                                <h3 className="text-sm font-semibold text-[var(--cyan)] mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                    </svg>
                                    Read These First (in order)
                                </h3>
                                <div className="space-y-3">
                                    {[...guide.files_to_read_first]
                                        .sort((a, b) => (a.read_order ?? 99) - (b.read_order ?? 99))
                                        .map((f, i) => (
                                        <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-md bg-[var(--cyan-dim)] text-[var(--cyan)] text-xs font-bold flex items-center justify-center mt-0.5">
                                                {f.read_order ?? i + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <span className="file-path block truncate mb-0.5">/{f.path}</span>
                                                <p className="text-xs text-[var(--text-muted)] leading-relaxed">{f.why}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Conventions + Gotchas side by side */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            {guide.conventions?.length > 0 && (
                                <div className="card neon-border">
                                    <h3 className="text-sm font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                                        </svg>
                                        Conventions
                                    </h3>
                                    <ul className="space-y-2">
                                        {guide.conventions.map((c, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                                <span className="text-violet-400 mt-0.5 flex-shrink-0">▸</span>{c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {guide.gotchas?.length > 0 && (
                                <div className="card neon-border">
                                    <h3 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                        </svg>
                                        Gotchas
                                    </h3>
                                    <ul className="space-y-2">
                                        {guide.gotchas.map((g, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                                <span className="text-amber-500 mt-0.5 flex-shrink-0">▸</span>{g}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Tech Debt vs Design */}
                        {guide.tech_debt_vs_design?.length > 0 && (
                            <div className="card neon-border">
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                                    </svg>
                                    Intentional Design vs. Tech Debt
                                </h3>
                                <div className="space-y-2">
                                    {guide.tech_debt_vs_design.map((t, i) => (
                                        <div key={i} className="flex items-start gap-3 py-2 border-b border-[var(--border-subtle)] last:border-0">
                                            <span className={`flex-shrink-0 text-[0.65rem] font-bold px-1.5 py-0.5 rounded mt-0.5 uppercase tracking-wide ${
                                                t.verdict === 'intentional'
                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                    : 'bg-amber-500/15 text-amber-400'
                                            }`}>
                                                {t.verdict === 'intentional' ? 'design' : 'debt'}
                                            </span>
                                            <div>
                                                <p className="text-sm text-[var(--text-secondary)] font-medium">{t.item}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{t.reason}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Week 1 Checklist */}
                        {guide.week1_checklist?.length > 0 && (
                            <div className="card neon-border">
                                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                                    </svg>
                                    Week 1 Checklist
                                </h3>
                                <ul className="space-y-2">
                                    {guide.week1_checklist.map((task, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-4 h-4 rounded border border-[var(--border-accent)] mt-0.5"/>
                                            <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{task}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            })()}
        </div>
    )
}
