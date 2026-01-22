import { useState } from 'react'
import MermaidDiagram from './MermaidDiagram'

export default function AnalysisResults({ data }) {
    const [activeSection, setActiveSection] = useState('overview')

    const { analysis, documentation, diagrams } = data

    const sections = [
        { id: 'overview', label: '📋 Overview', icon: '📋' },
        { id: 'architecture', label: '🏗️ Architecture', icon: '🏗️' },
        { id: 'diagrams', label: '📊 Diagrams', icon: '📊' },
        { id: 'docs', label: '📄 Documentation', icon: '📄' },
    ]

    return (
        <div className="animate-fade-in space-y-6">
            {/* Section tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${activeSection === section.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="card">
                {activeSection === 'overview' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                            <p className="text-white/70">{analysis?.overview || 'No overview available'}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Purpose</h3>
                            <p className="text-white/70">{analysis?.purpose || 'No purpose available'}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-4">
                                <h4 className="text-sm font-medium text-white/50 mb-2">Languages</h4>
                                <div className="flex flex-wrap gap-2">
                                    {analysis?.technologies?.languages?.map((lang) => (
                                        <span key={lang} className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-sm">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-4">
                                <h4 className="text-sm font-medium text-white/50 mb-2">Complexity</h4>
                                <span className={`px-3 py-1 rounded-full text-sm ${analysis?.complexity === 'low' ? 'bg-green-500/20 text-green-300' :
                                        analysis?.complexity === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                            'bg-red-500/20 text-red-300'
                                    }`}>
                                    {analysis?.complexity || 'Unknown'}
                                </span>
                            </div>
                        </div>

                        {analysis?.strengths && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Strengths</h3>
                                <ul className="space-y-1">
                                    {analysis.strengths.map((s, i) => (
                                        <li key={i} className="text-white/70 flex items-start gap-2">
                                            <span className="text-green-400">✓</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'architecture' && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Architecture Pattern</h3>
                            <p className="text-white/70">{analysis?.architecture?.pattern || 'N/A'}</p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Components</h3>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {analysis?.architecture?.components?.map((comp, i) => (
                                    <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/10">
                                        <span className="text-white/80">{comp}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-white mb-2">Description</h3>
                            <p className="text-white/70">{analysis?.architecture?.description || 'N/A'}</p>
                        </div>
                    </div>
                )}

                {activeSection === 'diagrams' && (
                    <div className="space-y-6">
                        {diagrams?.class_diagram && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Class Diagram</h3>
                                <MermaidDiagram code={diagrams.class_diagram} />
                            </div>
                        )}
                        {diagrams?.flowchart && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Flowchart</h3>
                                <MermaidDiagram code={diagrams.flowchart} />
                            </div>
                        )}
                        {diagrams?.architecture && (
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-3">Architecture</h3>
                                <MermaidDiagram code={diagrams.architecture} />
                            </div>
                        )}
                        {!diagrams && (
                            <p className="text-white/50">No diagrams available</p>
                        )}
                    </div>
                )}

                {activeSection === 'docs' && (
                    <div className="prose prose-invert max-w-none">
                        <pre className="bg-white/5 p-4 rounded-xl overflow-x-auto text-sm">
                            {documentation || 'No documentation generated'}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}
