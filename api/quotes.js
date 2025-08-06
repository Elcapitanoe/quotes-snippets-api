const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {

    const assetsDir = path.join(__dirname, '../assets');

    const txtFiles = fs.readdirSync(assetsDir).filter(file => file.endsWith('.txt'));

    let lines = [];
    txtFiles.forEach(file => {
      const data = fs.readFileSync(path.join(assetsDir, file), 'utf8');
      lines = lines.concat(data.trim().split('\n'));
    });

    const randomLine = lines[Math.floor(Math.random() * lines.length)];
    const [id, from, quotes] = randomLine.split('|');

    res.status(200).json({
      id: Number(id),
      from,
      quotes
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read quotes.' });
  }
};
