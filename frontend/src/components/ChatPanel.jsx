import { useState, useRef, useEffect } from 'react'

export default function ChatPanel({ context }) {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const sendMessage = async (e) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMessage }])
        setIsLoading(true)

        try {
            const response = await fetch('/api/chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    context: context?.analysis
                })
            })

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let assistantMessage = ''

            setMessages(prev => [...prev, { role: 'assistant', content: '' }])

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const text = decoder.decode(value)
                const lines = text.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6))
                            if (data.chunk) {
                                assistantMessage += data.chunk
                                setMessages(prev => {
                                    const newMessages = [...prev]
                                    newMessages[newMessages.length - 1].content = assistantMessage
                                    return newMessages
                                })
                            }
                        } catch { }
                    }
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const suggestedQuestions = [
        "What does this codebase do?",
        "Explain the main architecture",
        "What are the key entry points?",
        "How can I contribute to this project?",
    ]

    return (
        <div className="card h-[600px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    💬
                </div>
                <div>
                    <h3 className="font-semibold text-white">Chat with Code</h3>
                    <p className="text-xs text-white/50">Ask anything about the codebase</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-white/40 mb-4">Start a conversation about the code</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setInput(q)}
                                    className="px-3 py-1.5 bg-white/5 rounded-lg text-sm text-white/60 hover:bg-white/10 transition-all"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white/10 text-white/90'
                                    }`}
                            >
                                {msg.content || (
                                    <span className="animate-pulse">Thinking...</span>
                                )}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about the code..."
                    className="input flex-1"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="btn-primary disabled:opacity-50"
                >
                    Send
                </button>
            </form>
        </div>
    )
}
