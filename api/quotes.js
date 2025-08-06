const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const filePath = path.join(__dirname, '../quotes.txt');
    const data = fs.readFileSync(filePath, 'utf8');

    const lines = data.trim().split('\n');
    const randomLine = lines[Math.floor(Math.random() * lines.length)];

    const [id, from, quotes] = randomLine.split('|');

    res.status(200).json({
      id: Number(id),
      from,
      quotes
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read quotes.' });
  }
};
