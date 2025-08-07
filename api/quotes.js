const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
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

    res.status(200).json({
      id: Number(id),
      from: from.trim(),
      quote: quoteText.trim()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read quotes.' });
  }
};
