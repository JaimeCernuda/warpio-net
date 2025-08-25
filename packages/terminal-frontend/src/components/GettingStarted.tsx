export function GettingStarted() {
  return (
    <div style={{
      height: '100vh',
      overflow: 'auto',
      padding: '2rem',
      background: '#000',
      color: '#fff',
      fontFamily: 'monospace'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ color: '#0f0', marginBottom: '2rem' }}>🚀 Getting Started with Warpio Net</h1>
        
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0af', marginBottom: '1rem' }}>What is Warpio?</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Warpio is an AI-powered CLI tool that helps with software development, scientific computing, and data analysis. 
            It provides intelligent assistance through specialized agents and MCP (Model Context Protocol) servers.
          </p>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0af', marginBottom: '1rem' }}>🤖 AI Agents & Personas</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Warpio includes specialized personas for different workflows:
          </p>
          <ul style={{ paddingLeft: '2rem', lineHeight: '1.8' }}>
            <li><strong style={{ color: '#0f0' }}>data-expert:</strong> Data analysis, visualization, and processing</li>
            <li><strong style={{ color: '#0f0' }}>analysis-viz-expert:</strong> Advanced analytics and visualization</li>
            <li><strong style={{ color: '#0f0' }}>General AI:</strong> Code assistance, debugging, and development tasks</li>
          </ul>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0af', marginBottom: '1rem' }}>🔌 MCP Servers</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Model Context Protocol servers provide specialized tools and capabilities:
          </p>
          <ul style={{ paddingLeft: '2rem', lineHeight: '1.8' }}>
            <li><strong style={{ color: '#0f0' }}>arxiv-mcp:</strong> Search and retrieve scientific papers</li>
            <li><strong style={{ color: '#0f0' }}>compression-mcp:</strong> File compression and decompression</li>
            <li><strong style={{ color: '#0f0' }}>hdf5-mcp:</strong> HDF5 scientific data format handling</li>
            <li><strong style={{ color: '#0f0' }}>pandas-mcp:</strong> Data analysis with pandas</li>
            <li><strong style={{ color: '#0f0' }}>plot-mcp:</strong> Data visualization and plotting</li>
            <li><strong style={{ color: '#0f0' }}>node-hardware-mcp:</strong> System hardware information</li>
            <li><strong style={{ color: '#0f0' }}>adios-mcp:</strong> High-performance I/O operations</li>
          </ul>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0af', marginBottom: '1rem' }}>📁 Your Personal Workspace</h2>
          <p style={{ lineHeight: '1.6', marginBottom: '1rem' }}>
            Each user has a dedicated workspace directory with:
          </p>
          <ul style={{ paddingLeft: '2rem', lineHeight: '1.8' }}>
            <li><strong style={{ color: '#0f0' }}>Personal API Key:</strong> Your own Gemini API key for isolated usage</li>
            <li><strong style={{ color: '#0f0' }}>File Storage:</strong> Your project files and data</li>
            <li><strong style={{ color: '#0f0' }}>Command History:</strong> Your terminal session persistence</li>
          </ul>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0af', marginBottom: '1rem' }}>🖥️ Interface Overview</h2>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#f84', marginBottom: '0.5rem' }}>Terminal Tab</h3>
            <p style={{ lineHeight: '1.6' }}>
              Interactive command-line interface with Warpio CLI. Use natural language commands 
              or specific warpio commands like <code style={{ background: '#222', padding: '0.2rem' }}>warpio -p "your prompt"</code>
            </p>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#f84', marginBottom: '0.5rem' }}>Files Tab</h3>
            <p style={{ lineHeight: '1.6' }}>
              Browse, upload, download, and manage your files. Create new files, edit existing ones, 
              and organize your workspace.
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ color: '#0af', marginBottom: '1rem' }}>🏃 Quick Start</h2>
          <ol style={{ paddingLeft: '2rem', lineHeight: '1.8' }}>
            <li>Go to the <strong style={{ color: '#0f0' }}>Terminal</strong> tab to start using Warpio</li>
            <li>Try: <em style={{ color: '#0f0' }}>"Help me analyze some data from a CSV file"</em></li>
            <li>Use the <strong style={{ color: '#0f0' }}>Files</strong> tab to upload your data files</li>
            <li>Ask Warpio to use specific MCP servers: <em>"Use arxiv to find papers about machine learning"</em></li>
            <li>In Terminal view, check available personas: <em style={{ color: '#0f0' }}>--list-personas</em></li>
          </ol>
        </div>

        <div style={{ 
          background: '#111', 
          border: '1px solid #333', 
          borderRadius: '4px', 
          padding: '1rem',
          marginTop: '2rem'
        }}>
          <h3 style={{ color: '#f84', marginBottom: '0.5rem' }}>💡 Pro Tips</h3>
          <ul style={{ paddingLeft: '2rem', lineHeight: '1.8', fontSize: '0.9rem' }}>
            <li>Use <strong style={{ color: '#0f0' }}>!</strong> to introduce standard shell commands from within Warpio (e.g., <em>!ls</em>, <em>!pwd</em>)</li>
            <li>Your API key is private to your workspace - quota isolation per user</li>
            <li>Files are preserved between sessions in your personal directory</li>
            <li>Just type your requests naturally - Warpio understands conversational commands</li>
          </ul>
        </div>
      </div>
    </div>
  )
}