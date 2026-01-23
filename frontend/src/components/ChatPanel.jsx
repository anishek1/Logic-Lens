import { useState, useRef, useEffect } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

export default function ChatPanel({ context }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [streamingMessage, setStreamingMessage] = useState('')
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, streamingMessage])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setIsLoading(true)
        setStreamingMessage('')

        // Add user message
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    history: messages,
                    context: context?.analysis
                })
            })

            if (!response.ok) throw new Error('Chat request failed')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullResponse = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                fullResponse += chunk
                setStreamingMessage(fullResponse)
            }

            // Add assistant message
            setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])
            setStreamingMessage('')

        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '❌ Sorry, I encountered an error. Please try again.',
                isError: true
            }])
        } finally {
            setIsLoading(false)
            inputRef.current?.focus()
        }
    }

    const suggestedQuestions = [
        "What does this project do?",
        "Explain the architecture",
        "What are the main components?",
        "How can I improve this code?",
    ]

    return (
        <div className="card h-[calc(100vh-250px)] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                        <span className="text-lg">🤖</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Code Assistant</h2>
                        <p className="text-sm text-white/50">Ask questions about the analyzed codebase</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button
                        onClick={() => setMessages([])}
                        className="text-sm text-white/50 hover:text-white transition-colors px-3 py-1 hover:bg-white/10 rounded-lg"
                    >
                        Clear chat
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
                {messages.length === 0 && !streamingMessage && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                            <span className="text-4xl">💬</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">Start a Conversation</h3>
                        <p className="text-white/50 mb-6 max-w-md">
                            Ask me anything about the codebase. I can explain architecture, components, or help you understand the code.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(q)}
                                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                                <span>🤖</span>
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                                : msg.isError
                                    ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                                    : 'bg-white/5 border border-white/10'
                            }`}>
                            {msg.role === 'assistant' ? (
                                <div className="text-white/90 prose-sm">
                                    <MarkdownRenderer content={msg.content} />
                                </div>
                            ) : (
                                <p>{msg.content}</p>
                            )}
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-white/20 flex-shrink-0 flex items-center justify-center">
                                <span>👤</span>
                            </div>
                        )}
                    </div>
                ))}

                {/* Streaming message */}
                {streamingMessage && (
                    <div className="flex gap-3 animate-fade-in">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                            <span>🤖</span>
                        </div>
                        <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white/5 border border-white/10">
                            <div className="text-white/90">
                                <MarkdownRenderer content={streamingMessage} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Typing indicator */}
                {isLoading && !streamingMessage && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                            <span>🤖</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="pt-4 border-t border-white/10">
                <div className="flex gap-3">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about the codebase..."
                        className="input flex-1"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isLoading}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span>Send</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    )
}
