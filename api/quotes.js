import quotes from '../public/assets/quotes.min.json';

export default function handler(req, res) {
  const idx = Math.floor(Math.random() * quotes.length);
  const { id, name, quote } = quotes[idx];
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  return res.status(200).json({ id, name, quote });
}
