import React from 'react';
import { render } from 'react-dom';

const App = () => (
  <div style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif", maxWidth: '720px', margin: '60px auto', padding: '0 24px', lineHeight: 1.6, color: '#333' }}>
    <h1 style={{ fontSize: '2em', marginBottom: '0.2em' }}>Random Quotes API</h1>
    <p>A lightweight public API that delivers random inspirational quotes in JSON format.</p>

    <h2>API Endpoint</h2>
    <p><code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>GET https://quotes.domiadi.com/api</code></p>

    <h2>Sample Response</h2>
    <pre style={{ background: '#f8f8f8', padding: '12px', borderRadius: '6px', overflowX: 'auto' }}>
      {`{
  "id": 1,
  "from": "Albert Einstein",
  "quote": "Imagination is more important than knowledge.",
  "responseTime": "1.100ms"
}`}
    </pre>

    <h2>How to Use</h2>
    <ul>
      <li>Send a <strong>GET</strong> request to the API URL above</li>
      <li>Receive one random quote per request in JSON format</li>
      <li>No authentication or API key required</li>
    </ul>

    <h2>How to Contribute Quotes</h2>
    <p>
      Fork this{' '}
      <a href="https://github.com/Elcapitanoe/quotes-snippets-api" target="_blank" style={{ color: '#0070f3', textDecoration: 'none' }}>
        repository on GitHub
      </a>{' '}
      and submit a Pull Request with your quotes file.
    </p>
    <ul>
      <li>Check the last used ID in the <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>/assets</code> folder</li>
      <li>Create a file: <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>quotes-&lt;startid&gt;-&lt;endid&gt;.txt</code></li>
      <li>Use this format per line: <code style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>ID|Full Name|Your Quote</code></li>
    </ul>
    <p>Rules:</p>
    <ul>
      <li>Name must contain at least 2 words</li>
      <li>Quotes must be in English and at least 5 words</li>
      <li>One quote per line only</li>
    </ul>

    <footer style={{ marginTop: '48px', fontSize: '0.9em', color: '#888' }}>
      &copy; 2025{' '}
      <a href="https://domiadi.com" target="_blank" style={{ color: '#0070f3', textDecoration: 'none' }}>
        Domi Adiwijaya
      </a>
    </footer>
  </div>
);

render(<App />, document.getElementById('root'));