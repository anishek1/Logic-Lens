import { useState } from 'react'
import Header from './components/Header'
import RepoInput from './components/RepoInput'
import AnalysisResults from './components/AnalysisResults'
import ChatPanel from './components/ChatPanel'
import LoadingProgress from './components/LoadingProgress'
import './App.css'

function App() {
    const [analysisData,  setAnalysisData]  = useState(null)
    const [isAnalyzing,   setIsAnalyzing]   = useState(false)
    const [currentJobId,  setCurrentJobId]  = useState(null)
    const [completedJobId,setCompletedJobId]= useState(null)
    const [error,         setError]         = useState(null)
    const [activeTab,     setActiveTab]     = useState('analyze')
    const [darkMode,      setDarkMode]      = useState(true)

    /* ── Handlers ─────────────────────────────────────────── */
    const handleAnalysis = async (repoUrl) => {
        setIsAnalyzing(true)
        setError(null)
        setAnalysisData(null)
        setCompletedJobId(null)
        setActiveTab('analyze')

        try {
            const res  = await fetch('/api/analyze/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_url: repoUrl }),
            })
            const data = await res.json()
            if (data.job_id) {
                setCurrentJobId(data.job_id)
            } else {
                throw new Error('Failed to start analysis')
            }
        } catch (err) {
            setError(err.message)
            setIsAnalyzing(false)
        }
    }

    const handleAnalysisComplete = async () => {
        const jobId = currentJobId
        try {
            const res = await fetch(`/api/analyze/results/${jobId}`)
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.detail || `Server error ${res.status}`)
            }
            const data = await res.json()
            setAnalysisData(data)
            setCompletedJobId(jobId)
            setActiveTab('chat')
        } catch (err) {
            setError(err.message || 'Failed to fetch results')
        } finally {
            setIsAnalyzing(false)
            setCurrentJobId(null)
        }
    }

    const handleAnalysisError = (msg) => {
        setError(msg)
        setIsAnalyzing(false)
        setCurrentJobId(null)
    }

    const toggleTheme = () => {
        setDarkMode(d => !d)
        document.documentElement.classList.toggle('light')
    }

    /* ── Render ───────────────────────────────────────────── */
    return (
        <div className="min-h-dvh" style={{ background: 'var(--bg-base)' }}>
            <Header darkMode={darkMode} onToggleTheme={toggleTheme}/>

            <main className="mx-auto px-4 pb-16 max-w-5xl">

                {/* ── Tab bar ─────────────────────────────── */}
                <div className="flex items-center gap-1.5 py-5">
                    <button
                        onClick={() => setActiveTab('analyze')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'analyze'
                                ? 'text-white'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                        }`}
                        style={activeTab === 'analyze' ? {
                            background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(99,102,241,0.18))',
                            border: '1px solid rgba(0,212,255,0.22)',
                        } : {}}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        Analyze
                    </button>

                    <button
                        onClick={() => analysisData && setActiveTab('chat')}
                        disabled={!analysisData}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'chat'
                                ? 'text-white'
                                : analysisData
                                    ? 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
                                    : 'text-[var(--text-muted)] opacity-35 cursor-not-allowed'
                        }`}
                        style={activeTab === 'chat' ? {
                            background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(99,102,241,0.18))',
                            border: '1px solid rgba(0,212,255,0.22)',
                        } : {}}
                        title={!analysisData ? 'Analyze a repository first' : 'Chat with the codebase'}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        Chat with Code
                        {analysisData && (
                            <span className="tag tag-green text-[0.65rem] px-1.5 py-0.5">Ready</span>
                        )}
                    </button>
                </div>

                {/* ── Analyze tab ─────────────────────────── */}
                {activeTab === 'analyze' && (
                    <div className="space-y-6">

                        {/* Error banner */}
                        {error && (
                            <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-red-500/8 border border-red-500/20 text-red-300 animate-fade-in">
                                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.667 1.73-3L13.73 4c-.77-1.333-2.69-1.333-3.46 0L3.34 16c-.77 1.333.19 3 1.73 3z"/>
                                </svg>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">Analysis Failed</p>
                                    <p className="text-xs text-red-300/70 mt-0.5 font-mono break-all">{error}</p>
                                </div>
                                <button onClick={() => setError(null)} className="text-red-300/60 hover:text-red-300 transition-colors flex-shrink-0">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Input or loading */}
                        {!isAnalyzing && <RepoInput onSubmit={handleAnalysis} isLoading={false}/>}
                        {isAnalyzing && currentJobId && (
                            <LoadingProgress
                                jobId={currentJobId}
                                onComplete={handleAnalysisComplete}
                                onError={handleAnalysisError}
                            />
                        )}

                        {/* Success CTA + results */}
                        {analysisData && !isAnalyzing && (
                            <>
                                <div className="flex items-center justify-between px-4 py-3 rounded-xl neon-border animate-fade-in"
                                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.07), rgba(0,212,255,0.06))' }}>
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--text-primary)]">Analysis complete</p>
                                            <p className="text-xs text-[var(--text-muted)]">RAG-powered chat is ready</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('chat')}
                                        className="btn-primary px-4 py-2 text-sm"
                                    >
                                        Chat with Code →
                                    </button>
                                </div>
                                <AnalysisResults data={analysisData}/>
                            </>
                        )}
                    </div>
                )}

                {/* ── Chat tab ────────────────────────────── */}
                {activeTab === 'chat' && (
                    <ChatPanel
                        context={analysisData}
                        jobId={completedJobId}
                        onBackToAnalysis={() => setActiveTab('analyze')}
                    />
                )}
            </main>

            <footer className="text-center py-5 border-t border-[var(--border-subtle)]">
                <p className="text-xs font-mono text-[var(--text-muted)]">
                    LogicLens · AI-Powered Code Intelligence · Built by Anishekh Prasad
                </p>
            </footer>
        </div>
    )
}

export default App
