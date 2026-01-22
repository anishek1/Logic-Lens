import { useState } from 'react'
import Header from './components/Header'
import RepoInput from './components/RepoInput'
import AnalysisResults from './components/AnalysisResults'
import ChatPanel from './components/ChatPanel'
import './App.css'

function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('analyze') // 'analyze' | 'chat'

  const handleAnalysis = async (repoUrl) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const response = await fetch('/api/analyze/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl })
      })

      const data = await response.json()

      if (data.job_id) {
        // Start polling for results
        await pollForResults(data.job_id)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const pollForResults = async (jobId) => {
    const maxAttempts = 60
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`/api/analyze/status/${jobId}`)
      const status = await response.json()

      if (status.status === 'completed') {
        const results = await fetch(`/api/analyze/results/${jobId}`)
        const data = await results.json()
        setAnalysisData(data)
        return
      } else if (status.status === 'failed') {
        throw new Error(status.error || 'Analysis failed')
      }

      await new Promise(r => setTimeout(r, 2000))
      attempts++
    }

    throw new Error('Analysis timed out')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'analyze'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
          >
            🔍 Analyze
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'chat'
                ? 'bg-indigo-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            disabled={!analysisData}
          >
            💬 Chat
          </button>
        </div>

        {activeTab === 'analyze' ? (
          <div className="space-y-8">
            <RepoInput
              onSubmit={handleAnalysis}
              isLoading={isAnalyzing}
            />

            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                {error}
              </div>
            )}

            {analysisData && (
              <AnalysisResults data={analysisData} />
            )}
          </div>
        ) : (
          <ChatPanel context={analysisData} />
        )}
      </main>
    </div>
  )
}

export default App
