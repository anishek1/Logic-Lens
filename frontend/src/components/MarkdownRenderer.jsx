import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-white/70 transition-all"
        >
            {copied ? '✓ Copied!' : 'Copy'}
        </button>
    )
}

export default function MarkdownRenderer({ content }) {
    if (!content) {
        return <p className="text-white/50">No content available</p>
    }

    return (
        <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Custom heading styles
                    h1: ({ children }) => (
                        <h1 className="text-3xl font-bold text-white mb-6 pb-2 border-b border-white/10">
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-2xl font-semibold text-white mt-8 mb-4">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-xl font-medium text-white mt-6 mb-3">
                            {children}
                        </h3>
                    ),

                    // Paragraph
                    p: ({ children }) => (
                        <p className="text-white/80 mb-4 leading-relaxed">
                            {children}
                        </p>
                    ),

                    // Lists
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside text-white/80 mb-4 space-y-1">
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside text-white/80 mb-4 space-y-1">
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-white/80">{children}</li>
                    ),

                    // Links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline transition-colors"
                        >
                            {children}
                        </a>
                    ),

                    // Inline code
                    code: ({ inline, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '')
                        const codeString = String(children).replace(/\n$/, '')

                        if (!inline && match) {
                            return (
                                <div className="relative my-4 rounded-xl overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-white/10">
                                        <span className="text-xs text-white/50 font-mono uppercase">{match[1]}</span>
                                        <CopyButton text={codeString} />
                                    </div>
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        customStyle={{
                                            margin: 0,
                                            borderRadius: 0,
                                            padding: '1rem',
                                        }}
                                        {...props}
                                    >
                                        {codeString}
                                    </SyntaxHighlighter>
                                </div>
                            )
                        }

                        return (
                            <code className="px-1.5 py-0.5 bg-white/10 text-pink-400 rounded text-sm font-mono" {...props}>
                                {children}
                            </code>
                        )
                    },

                    // Blockquote
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-4 bg-white/5 rounded-r-lg italic text-white/70">
                            {children}
                        </blockquote>
                    ),

                    // Table
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="w-full border-collapse border border-white/10 rounded-lg overflow-hidden">
                                {children}
                            </table>
                        </div>
                    ),
                    thead: ({ children }) => (
                        <thead className="bg-white/10">{children}</thead>
                    ),
                    th: ({ children }) => (
                        <th className="px-4 py-2 text-left text-white font-medium border border-white/10">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="px-4 py-2 text-white/70 border border-white/10">
                            {children}
                        </td>
                    ),

                    // Horizontal rule
                    hr: () => <hr className="border-white/10 my-8" />,

                    // Strong/Bold
                    strong: ({ children }) => (
                        <strong className="font-semibold text-white">{children}</strong>
                    ),

                    // Emphasis/Italic
                    em: ({ children }) => (
                        <em className="italic text-white/90">{children}</em>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    )
}
