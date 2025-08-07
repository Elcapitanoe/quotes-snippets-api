export async function onRequestGet(context) {
  const startTime = performance.now();

  try {
    const res = await context.env.ASSETS.fetch('http://dummy/data/quotes.min.json');
    const text = (await res.text()).trim();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'quotes.min.json not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (!text) {
      return new Response(JSON.stringify({ error: 'quotes.min.json is empty.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const quotes = JSON.parse(text);
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const endTime = performance.now();
    const responseTime = (endTime - startTime).toFixed(3);

    return new Response(JSON.stringify({
      ...randomQuote,
      responseTime: `${responseTime}ms`
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read or parse quotes.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
