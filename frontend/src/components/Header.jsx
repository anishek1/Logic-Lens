export default function Header() {
    return (
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-lg sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 max-w-7xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-xl">
                        🔍
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">LogicLens</h1>
                        <p className="text-xs text-white/50">AI-Powered Code Intelligence</p>
                    </div>
                </div>

                <nav className="flex items-center gap-4">
                    <a
                        href="https://github.com/anishek1/codeX"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        GitHub
                    </a>
                </nav>
            </div>
        </header>
    )
}
