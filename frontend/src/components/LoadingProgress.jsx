import { useEffect, useState, useRef } from 'react'

const ANALYSIS_STEPS = [
    { id: 'clone', label: 'Cloning Repository', icon: '📥' },
    { id: 'parse', label: 'Parsing Code Files', icon: '📂' },
    { id: 'analyze', label: 'AI Analysis', icon: '🤖' },
    { id: 'docs', label: 'Generating Documentation', icon: '📄' },
    { id: 'diagrams', label: 'Creating Diagrams', icon: '📊' },
]

function getStepFromProgress(progress) {
    if (progress < 10) return 0
    if (progress < 30) return 1
    if (progress < 70) return 2
    if (progress < 90) return 3
    return 4
}

export default function LoadingProgress({ jobId, onComplete, onError }) {
    const [progress, setProgress] = useState(0)
    const [currentStep, setCurrentStep] = useState(0)
    const [status, setStatus] = useState('connecting')
    const eventSourceRef = useRef(null)

    useEffect(() => {
        if (!jobId) return

        // Connect to SSE stream
        const eventSource = new EventSource(`/api/analyze/stream/${jobId}`)
        eventSourceRef.current = eventSource

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                setProgress(data.progress || 0)
                setCurrentStep(getStepFromProgress(data.progress))
                setStatus(data.status)

                if (data.status === 'completed') {
                    eventSource.close()
                    onComplete?.()
                } else if (data.status === 'failed') {
                    eventSource.close()
                    onError?.(data.error || 'Analysis failed')
                }
            } catch (e) {
                console.error('SSE parse error:', e)
            }
        }

        eventSource.onerror = () => {
            setStatus('error')
            eventSource.close()
        }

        return () => {
            eventSource.close()
        }
    }, [jobId, onComplete, onError])

    return (
        <div className="card animate-fade-in">
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse-glow">
                    <span className="text-3xl">🔍</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Analyzing Repository</h2>
                <p className="text-white/60">This may take a moment...</p>
            </div>

            {/* Progress bar */}
            <div className="relative mb-8">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="absolute right-0 top-4 text-sm text-white/50">{progress}%</span>
            </div>

            {/* Steps */}
            <div className="space-y-3">
                {ANALYSIS_STEPS.map((step, index) => {
                    const isComplete = index < currentStep
                    const isCurrent = index === currentStep
                    const isPending = index > currentStep

                    return (
                        <div
                            key={step.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                                isCurrent
                                    ? 'bg-indigo-500/20 border border-indigo-500/30'
                                    : isComplete
                                    ? 'bg-green-500/10'
                                    : 'bg-white/5'
                            }`}
                        >
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
                                isComplete
                                    ? 'bg-green-500 text-white'
                                    : isCurrent
                                    ? 'bg-indigo-500 text-white animate-pulse'
                                    : 'bg-white/10 text-white/40'
                            }`}>
                                {isComplete ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <span>{step.icon}</span>
                                )}
                            </div>
                            <span className={`font-medium ${
                                isCurrent ? 'text-white' : isComplete ? 'text-green-400' : 'text-white/40'
                            }`}>
                                {step.label}
                            </span>
                            {isCurrent && (
                                <div className="ml-auto flex gap-1">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {status === 'error' && (
                <div className="mt-6 p-4 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-center">
                    Connection lost. Please refresh.
                </div>
            )}
        </div>
    )
}
