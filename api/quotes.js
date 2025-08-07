const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

module.exports = (req, res) => {
  const startTime = performance.now();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const quotesFile = path.join(__dirname, '../output/quotes-all.txt');

    if (!fs.existsSync(quotesFile)) {
      return res.status(404).json({ error: 'quotes-all.txt not found.' });
    }

    const data = fs.readFileSync(quotesFile, 'utf8').trim();
    if (!data) {
      return res.status(500).json({ error: 'quotes-all.txt is empty.' });
    }

    const lines = data.split('\n');
    const randomLine = lines[Math.floor(Math.random() * lines.length)];
    const parts = randomLine.split('|');

    if (parts.length !== 3) {
      return res.status(500).json({ error: 'Invalid quote format.' });
    }

    const [id, from, quoteText] = parts;

    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(3);

    res.status(200).json({
      id: Number(id),
      from: from.trim(),
      quote: quoteText.trim(),
      responseTime: `${responseTime}ms`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read quotes.' });
  }
};
