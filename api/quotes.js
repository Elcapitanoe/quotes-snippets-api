const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

module.exports = (req, res) => {
  const startTime = performance.now();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const quotesFile = path.join(__dirname, '../data/quotes.min.json');

    if (!fs.existsSync(quotesFile)) {
      return res.status(404).json({ error: 'quotes.min.json not found.' });
    }

    const data = fs.readFileSync(quotesFile, 'utf8').trim();
    if (!data) {
      return res.status(500).json({ error: 'quotes.min.json is empty.' });
    }

    const quotes = JSON.parse(data);
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    const elapsed = Math.round(performance.now() - startTime);
    const responseTime = `${elapsed}ms`;

    res.status(200).json({
      ...randomQuote,
      responseTime
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read or parse quotes.' });
  }
};
