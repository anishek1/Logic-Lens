import { useState } from 'react'
import Header from './components/Header'
import RepoInput from './components/RepoInput'
import AnalysisResults from './components/AnalysisResults'
import ChatPanel from './components/ChatPanel'
import LoadingProgress from './components/LoadingProgress'
import './App.css'

function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentJobId, setCurrentJobId] = useState(null)
  const [completedJobId, setCompletedJobId] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('analyze')
  const [darkMode, setDarkMode] = useState(true)

  const handleAnalysis = async (repoUrl) => {
    setIsAnalyzing(true)
    setError(null)
    setAnalysisData(null)
    setCompletedJobId(null)
    setActiveTab('analyze')

    try {
      const response = await fetch('/api/analyze/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      })

      const data = await response.json()

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
    // Snapshot the job_id immediately — state will be cleared below
    const jobId = currentJobId
    try {
      const results = await fetch(`/api/analyze/results/${jobId}`)
      const data = await results.json()
      setAnalysisData(data)
      setCompletedJobId(jobId)
      // Auto-switch to chat so the user lands right in the conversation
      setActiveTab('chat')
    } catch (err) {
      setError('Failed to fetch results')
    } finally {
      setIsAnalyzing(false)
      setCurrentJobId(null)
    }
  }

  const handleAnalysisError = (errorMsg) => {
    setError(errorMsg)
    setIsAnalyzing(false)
    setCurrentJobId(null)
  }

  const toggleTheme = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('light')
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900'
        : 'bg-gradient-to-br from-slate-100 via-indigo-100/50 to-slate-100'
      }`}>
      <Header darkMode={darkMode} onToggleTheme={toggleTheme} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'analyze'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            <span>🔍</span> Analyze
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
              activeTab === 'chat'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                : analysisData
                  ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
            }`}
            disabled={!analysisData}
            title={!analysisData ? 'Analyze a repository first' : 'Chat with the codebase'}
          >
            <span>💬</span> Chat with Code
            {analysisData && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500/30 text-green-300 rounded-full">
                Ready
              </span>
            )}
          </button>
        </div>

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-8">
            <RepoInput onSubmit={handleAnalysis} isLoading={isAnalyzing} />

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 flex items-center gap-3 animate-fade-in">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium">Analysis Failed</p>
                  <p className="text-sm text-red-300/80">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-300 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {isAnalyzing && currentJobId && (
              <LoadingProgress
                jobId={currentJobId}
                onComplete={handleAnalysisComplete}
                onError={handleAnalysisError}
              />
            )}

            {analysisData && !isAnalyzing && (
              <>
                {/* CTA banner — makes the chat entry point unmissable */}
                <div className="flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-semibold text-white">Analysis complete!</p>
                      <p className="text-sm text-white/60">Ask questions about the codebase using RAG-powered chat.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap"
                  >
                    💬 Chat with Code
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>

                <AnalysisResults data={analysisData} />
              </>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <ChatPanel
            context={analysisData}
            jobId={completedJobId}
            onBackToAnalysis={() => setActiveTab('analyze')}
          />
        )}
      </main>

      <footer className="text-center py-6 text-white/30 text-sm">
        <p>LogicLens • AI-Powered Code Intelligence</p>
      </footer>
    </div>
  )
}

export default App
