import { useState } from 'react'
import MermaidDiagram from './MermaidDiagram'
import MarkdownRenderer from './MarkdownRenderer'

export default function AnalysisResults({ data }) {
    const [activeSection, setActiveSection] = useState('overview')
    const [activeDiagram, setActiveDiagram] = useState('architecture')

    const { analysis, documentation, diagrams } = data

    const sections = [
        { id: 'overview', label: 'Overview', icon: '📋' },
        { id: 'architecture', label: 'Architecture', icon: '🏗️' },
        { id: 'diagrams', label: 'Diagrams', icon: '📊' },
        { id: 'docs', label: 'Documentation', icon: '📄' },
    ]

    const diagramTypes = [
        { id: 'architecture', label: 'Architecture' },
        { id: 'class_diagram', label: 'Class Diagram' },
        { id: 'flowchart', label: 'Flowchart' },
    ]

    return (
        <div className="animate-fade-in space-y-6">
            {/* Section tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${activeSection === section.id
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        <span>{section.icon}</span>
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="card">
                {activeSection === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Parse failure warning */}
                        {analysis?.overview === 'Analysis completed but response could not be parsed.' && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-300 flex items-center gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <p className="font-medium">LLM response was malformed</p>
                                    <p className="text-sm text-yellow-300/70">The model returned invalid JSON. Try re-analyzing — larger repos sometimes cause this.</p>
                                </div>
                            </div>
                        )}
                        {/* Hero section */}
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
                            <h3 className="text-2xl font-bold text-white mb-3">{analysis?.overview || 'Project Overview'}</h3>
                            <p className="text-white/70 text-lg leading-relaxed">{analysis?.purpose || 'No purpose available'}</p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                                <h4 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
                                    <span>💻</span> Languages
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis?.technologies?.languages?.map((lang) => (
                                        <span key={lang} className="px-3 py-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm font-medium">
                                            {lang}
                                        </span>
                                    )) || <span className="text-white/40">None detected</span>}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                                <h4 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
                                    <span>📦</span> Frameworks
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis?.technologies?.frameworks?.map((fw) => (
                                        <span key={fw} className="px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium">
                                            {fw}
                                        </span>
                                    )) || <span className="text-white/40">None detected</span>}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-indigo-500/30 transition-colors">
                                <h4 className="text-sm font-medium text-white/50 mb-3 flex items-center gap-2">
                                    <span>📊</span> Complexity
                                </h4>
                                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${analysis?.complexity === 'low' ? 'bg-green-500/20 text-green-300' :
                                        analysis?.complexity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-red-500/20 text-red-300'
                                    }`}>
                                    {analysis?.complexity === 'low' && '🟢 '}
                                    {analysis?.complexity === 'medium' && '🟡 '}
                                    {analysis?.complexity === 'high' && '🔴 '}
                                    {analysis?.complexity?.charAt(0).toUpperCase() + analysis?.complexity?.slice(1) || 'Unknown'}
                                </span>
                            </div>
                        </div>

                        {/* Strengths & Improvements */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {analysis?.strengths && (
                                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <span className="text-green-400">✓</span> Strengths
                                    </h3>
                                    <ul className="space-y-2">
                                        {analysis.strengths.map((s, i) => (
                                            <li key={i} className="text-white/70 flex items-start gap-2">
                                                <span className="text-green-400 mt-1">•</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {analysis?.improvements && (
                                <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                        <span className="text-yellow-400">💡</span> Suggested Improvements
                                    </h3>
                                    <ul className="space-y-2">
                                        {analysis.improvements.map((s, i) => (
                                            <li key={i} className="text-white/70 flex items-start gap-2">
                                                <span className="text-yellow-400 mt-1">•</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'architecture' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold text-white mb-2">Architecture Pattern</h3>
                            <p className="text-2xl font-bold text-indigo-400">{analysis?.architecture?.pattern || 'N/A'}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4">Components</h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {analysis?.architecture?.components?.map((comp, i) => (
                                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-indigo-500/30 transition-all hover:scale-[1.02]">
                                        <span className="text-white/80 font-medium">{comp}</span>
                                    </div>
                                )) || <p className="text-white/50">No components detected</p>}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                            <p className="text-white/70 leading-relaxed bg-white/5 rounded-xl p-4">
                                {analysis?.architecture?.description || 'N/A'}
                            </p>
                        </div>

                        {analysis?.entry_points && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Entry Points</h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.entry_points.map((ep, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-green-500/20 text-green-300 rounded-lg text-sm font-mono">
                                            {ep}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'diagrams' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Diagram type tabs */}
                        <div className="flex gap-2 border-b border-white/10 pb-4">
                            {diagramTypes.map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() => setActiveDiagram(type.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeDiagram === type.id
                                            ? 'bg-indigo-500 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        <div className="bg-white/5 rounded-xl p-6 min-h-[400px]">
                            {diagrams?.[activeDiagram] ? (
                                <MermaidDiagram code={diagrams[activeDiagram]} />
                            ) : (
                                <div className="flex items-center justify-center h-64 text-white/40">
                                    <div className="text-center">
                                        <span className="text-4xl mb-4 block">📊</span>
                                        <p>No {activeDiagram.replace('_', ' ')} available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'docs' && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-white">Generated Documentation</h3>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(documentation || '')
                                }}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2"
                            >
                                <span>📋</span> Copy All
                            </button>
                        </div>
                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                            <MarkdownRenderer content={documentation} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
