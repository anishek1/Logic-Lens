import { useState } from 'react'

export default function RepoInput({ onSubmit, isLoading }) {
    const [repoUrl, setRepoUrl] = useState('')
    const [inputFocused, setInputFocused] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (repoUrl.trim()) {
            onSubmit(repoUrl.trim())
        }
    }

    const exampleRepos = [
        { name: 'Flask', url: 'https://github.com/pallets/flask.git', icon: '🐍' },
        { name: 'FastAPI', url: 'https://github.com/tiangolo/fastapi.git', icon: '⚡' },
        { name: 'Express', url: 'https://github.com/expressjs/express.git', icon: '🟢' },
        { name: 'Vue.js', url: 'https://github.com/vuejs/vue.git', icon: '💚' },
    ]

    return (
        <div className={`card animate-fade-in transition-all duration-300 ${inputFocused ? 'ring-2 ring-indigo-500/50' : ''}`}>
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
                    <span className="text-3xl">🔍</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">
                    Analyze Any Codebase
                </h2>
                <p className="text-white/60 max-w-md mx-auto">
                    Enter a GitHub repository URL to get AI-powered insights, documentation, and interactive diagrams
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur-sm opacity-0 group-hover:opacity-30 transition-opacity" />
                    <div className="relative flex gap-3">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">📦</span>
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                onFocus={() => setInputFocused(true)}
                                onBlur={() => setInputFocused(false)}
                                placeholder="https://github.com/username/repo.git"
                                className="input pl-12 h-14 text-lg"
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !repoUrl.trim()}
                            className="btn-primary h-14 px-8 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Analyzing...</span>
                                </>
                            ) : (
                                <>
                                    <span>🚀</span>
                                    <span>Analyze</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            <div className="mt-8">
                <p className="text-white/40 text-sm mb-3 flex items-center gap-2">
                    <span>✨</span> Try an example repository:
                </p>
                <div className="flex flex-wrap gap-2">
                    {exampleRepos.map((repo) => (
                        <button
                            key={repo.name}
                            onClick={() => setRepoUrl(repo.url)}
                            disabled={isLoading}
                            className="px-4 py-2 bg-white/5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all border border-white/10 hover:border-white/20 flex items-center gap-2 disabled:opacity-50"
                        >
                            <span>{repo.icon}</span>
                            {repo.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Features callout */}
            <div className="mt-8 pt-6 border-t border-white/10">
                <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="p-3">
                        <span className="text-2xl mb-2 block">📄</span>
                        <p className="text-sm text-white/60">Auto-generated Documentation</p>
                    </div>
                    <div className="p-3">
                        <span className="text-2xl mb-2 block">📊</span>
                        <p className="text-sm text-white/60">Interactive Diagrams</p>
                    </div>
                    <div className="p-3">
                        <span className="text-2xl mb-2 block">💬</span>
                        <p className="text-sm text-white/60">Chat with Code</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
