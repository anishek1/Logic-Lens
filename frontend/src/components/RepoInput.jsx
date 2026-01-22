import { useState } from 'react'

export default function RepoInput({ onSubmit, isLoading }) {
    const [repoUrl, setRepoUrl] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (repoUrl.trim()) {
            onSubmit(repoUrl.trim())
        }
    }

    const exampleRepos = [
        { name: 'Flask', url: 'https://github.com/pallets/flask.git' },
        { name: 'FastAPI', url: 'https://github.com/tiangolo/fastapi.git' },
        { name: 'Express', url: 'https://github.com/expressjs/express.git' },
    ]

    return (
        <div className="card animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                    Analyze Any Codebase
                </h2>
                <p className="text-white/60">
                    Enter a GitHub repository URL to get AI-powered insights
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        placeholder="https://github.com/username/repo.git"
                        className="input pr-32"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !repoUrl.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Analyzing...
                            </span>
                        ) : (
                            '🚀 Analyze'
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-6">
                <p className="text-white/40 text-sm mb-3">Try an example:</p>
                <div className="flex flex-wrap gap-2">
                    {exampleRepos.map((repo) => (
                        <button
                            key={repo.name}
                            onClick={() => setRepoUrl(repo.url)}
                            className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all border border-white/10"
                        >
                            {repo.name}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
