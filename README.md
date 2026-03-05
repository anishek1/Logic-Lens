# LogicLens 🧠

**AI-Powered Code Intelligence Platform**

LogicLens works as your personal AI pair programmer that can clone, analyze, and document any GitHub repository. It runs **100% locally** using Ollama or connects to Google's Gemini API.

![LogicLens UI](https://i.imgur.com/place_holder.png)

## 🚀 Key Features

- **🛡️ 100% Local Privacy**: Runs entirely on your machine using Ollama (Llama 3, Mistral, etc.). No code leaves your computer.
- **🔍 Deep Analysis**: extracting architecture patterns, tech stack details, and key components.
- **📊 Auto-Diagrams**: Generates architectural flowcharts, class diagrams, and sequence diagrams automatically.
- **📝 Documentation Generator**: Turns code into comprehensive Markdown documentation.
- **💬 Context-Aware Chat**: Chat with your codebase! Ask "Where is the auth logic?" or "How do I add a new API route?".
- **⚡ Real-time Streaming**: Watch the analysis happen step-by-step with live updates.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TailwindCSS v4, Framer Motion
- **Backend**: FastAPI (Python), Uvicorn
- **AI Engine**: Ollama (Local) OR Google Gemini (Cloud)
- **Tools**: LangChain, Mermaid.js, react-markdown

## 🏁 Getting Started

### Prerequisites

1.  **Node.js** (v18+)
2.  **Python** (v3.10+)
3.  **Ollama** (Required for local use) - [Download here](https://ollama.com)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/LogicLens.git
    cd LogicLens
    ```

2.  **Setup the Backend**
    ```bash
    cd backend
    python -m venv venv
    
    # Windows
    .\venv\Scripts\activate
    # Mac/Linux
    source venv/bin/activate
    
    pip install -r requirements.txt
    ```

3.  **Setup the Frontend**
    ```bash
    cd ../frontend
    npm install
    ```

4.  **Configure Environment**
    Create a `.env` file in `backend/.env`:
    
    ```env
    # Option 1: LOCAL (Recommended - Free & Private)
    LLM_PROVIDER=ollama
    OLLAMA_BASE_URL=http://localhost:11434
    OLLAMA_MODEL=mistral  # Make sure to run: ollama pull mistral
    
    # Option 2: CLOUD (Google Gemini)
    # LLM_PROVIDER=gemini
    # GEMINI_API_KEY=your_gemini_key_here
    
    DEBUG=true
    ```

## 🏃‍♂️ Usage

1.  **Start the Backend**
    ```bash
    # In /backend terminal
    python -m uvicorn app.main:app --reload --port 8000
    ```

2.  **Start the Frontend**
    ```bash
    # In /frontend terminal
    npm run dev
    ```

3.  **Analyze a Repo**
    - Open [http://localhost:5173](http://localhost:5173)
    - Enter a GitHub URL (e.g., `https://github.com/pallets/flask`)
    - Click **🚀 Analyze**
    - Switch tabs to view **Docs**, **Diagrams**, or **Chat** with the code.

## ⚠️ Troubleshooting

**"Ollama connection failed"**
- Ensure Ollama is running (`ollama serve` or open the app).
- Check if you can open http://localhost:11434 in your browser.

**"Analysis failed / No diagrams"**
- Local models (Mistral/7B) sometimes struggle with complex JSON.
- We have built-in fallback mechanisms, but trying `ollama pull llama3` might yield better results than `mistral`.

## 🤝 Contributing

Contributions are welcome. Feel free to open an issue or submit a pull request.

## 📄 License

MIT License
