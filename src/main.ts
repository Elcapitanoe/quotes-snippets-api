interface Quote {
  id: string
  from: string
  quote: string
  responseTime?: string
}

class QuotesApp {
  private readonly apiUrl = 'https://quotes.domiadi.com/api'

  constructor() {
    this.init()
  }

  private init(): void {
    this.createHTML()
    this.loadInitialQuote()
  }

  private createHTML(): void {
    document.title = 'Random Quotes API'
    
    const favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.type = 'image/png'
    favicon.href = '/quotes.png'
    document.head.appendChild(favicon)

    const style = document.createElement('style')
    style.textContent = `
      body {
        font-family: 'Segoe UI', Tahoma, sans-serif;
        max-width: 720px;
        margin: 60px auto;
        padding: 0 24px;
        line-height: 1.6;
        color: #333;
      }
      h1 { font-size: 2em; margin-bottom: 0.2em; }
      code {
        background: #f5f5f5;
        padding: 4px 8px;
        border-radius: 6px;
        font-family: monospace;
      }
      pre {
        background: #f8f8f8;
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
      }
      a { color: #0070f3; text-decoration: none; }
      a:hover { text-decoration: underline; }
      footer {
        margin-top: 48px;
        font-size: 0.9em;
        color: #888;
      }
    `
    document.head.appendChild(style)

    document.body.innerHTML = `
      <h1>Random Quotes API</h1>
      <p>A lightweight public API that delivers random inspirational quotes in JSON format.</p>

      <h2>API Endpoint</h2>
      <p><code>GET ${this.apiUrl}</code></p>

      <h2>Sample Response</h2>
      <pre>{
  "id": "000001",
  "from": "Albert Einstein",
  "quote": "Imagination is more important than knowledge.",
  "responseTime": "1.100ms"
}</pre>

      <h2>How to Use</h2>
      <ul>
        <li>Send a <strong>GET</strong> request to the API URL above</li>
        <li>Receive one random quote per request in JSON format</li>
        <li>No authentication or API key required</li>
      </ul>

      <h2>How to Contribute Quotes</h2>
      <p>Fork this <a href="https://github.com/Elcapitanoe/quotes-snippets-api" target="_blank">repository on GitHub</a> and submit a Pull Request with your quotes file.</p>
      <ul>
        <li>Check the last used ID in the <code>/assets</code> folder</li>
        <li>Create a file: <code>(number)-quotes.txt</code></li>
        <li>Use this format per line: <code>ID|Full Name|Your Quote</code></li>
      </ul>
      <p>Rules:</p>
      <ul>
        <li>Name must contain at least 2 words</li>
        <li>Quotes must be in English and at least 5 words</li>
        <li>One quote per line only</li>
      </ul>

      <footer>
        &copy; 2025 <a href="https://domiadi.com" target="_blank">Domi Adiwijaya</a>
      </footer>
    `
  }

  private async loadInitialQuote(): Promise<void> {
    try {
      const response = await fetch(this.apiUrl)
      if (response.ok) {
        const quote: Quote = await response.json()
        console.log('Sample quote loaded:', quote)
      }
    } catch (error) {
      console.log('Quote loading failed (expected in development):', error)
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new QuotesApp())
} else {
  new QuotesApp()
}
