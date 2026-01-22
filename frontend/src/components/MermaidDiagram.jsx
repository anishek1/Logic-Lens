import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#4f46e5',
        lineColor: '#a5b4fc',
        secondaryColor: '#7c3aed',
        tertiaryColor: '#1e1b4b',
    }
})

export default function MermaidDiagram({ code }) {
    const containerRef = useRef(null)

    useEffect(() => {
        if (containerRef.current && code) {
            containerRef.current.innerHTML = ''
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

            mermaid.render(id, code).then(({ svg }) => {
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg
                }
            }).catch((error) => {
                console.error('Mermaid rendering error:', error)
                if (containerRef.current) {
                    containerRef.current.innerHTML = `
            <pre class="text-red-400 text-sm p-4 bg-red-500/10 rounded-lg">
              Error rendering diagram: ${error.message}
              \n\nCode:\n${code}
            </pre>
          `
                }
            })
        }
    }, [code])

    return (
        <div
            ref={containerRef}
            className="bg-white/5 rounded-xl p-4 overflow-x-auto min-h-[200px] flex items-center justify-center"
        >
            <div className="animate-pulse text-white/40">Loading diagram...</div>
        </div>
    )
}
