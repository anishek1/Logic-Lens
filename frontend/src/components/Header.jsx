export default function Header({ darkMode, onToggleTheme }) {
    return (
        <header className="glass sticky top-0 z-50 neon-border-subtle border-b">
            <div className="mx-auto px-6 py-3.5 max-w-5xl flex items-center justify-between">

                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-9 h-9 rounded-lg neon-border bg-[var(--cyan-dim)]">
                        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                            <path d="M3 5h14M3 10h9M3 15h5" stroke="#00d4ff" strokeWidth="1.8" strokeLinecap="round"/>
                            <circle cx="15" cy="14" r="3.5" stroke="#7c3aed" strokeWidth="1.6"/>
                            <path d="M17.5 16.5l1.5 1.5" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold tracking-tight text-[var(--text-primary)]">LogicLens</span>
                            <span className="tag tag-cyan text-[0.65rem] px-1.5 py-0.5">v2.0</span>
                        </div>
                        <p className="text-[0.65rem] text-[var(--text-muted)] font-mono leading-none mt-0.5">AI Code Intelligence</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onToggleTheme}
                        className="btn-icon"
                        title={darkMode ? 'Light mode' : 'Dark mode'}
                    >
                        {darkMode
                            ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.7.7M5.64 18.36l-.7.7m12.73 0-.7-.7M5.64 5.64l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z"/></svg>
                            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                        }
                    </button>

                    <a
                        href="https://github.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-icon"
                        title="GitHub"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                        </svg>
                    </a>
                </div>
            </div>
        </header>
    )
}
