export default async function handler(req, res) {
  // CORS Headers (Aapki Blogger website ko allow karne ke liye)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { query, offset = 0 } = req.query;
  const XATA_API_KEY = process.env.XATA_API_KEY;
  const XATA_REST_URL = process.env.XATA_REST_URL;

  try {
    if (query) {
      // 1. FUZZY SEARCH (Jab user kuch search kare)
      const fetchRes = await fetch(`${XATA_REST_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XATA_API_KEY}`
        },
        body: JSON.stringify({
          query: query,
          tables: ["novels"],
          fuzziness: 1, // Ye har qisam ki spelling mistake theek karega
          prefix: "phrase"
        })
      });
      const data = await fetchRes.json();
      const results = data.records ? data.records.map(r => ({ Titles: r.Titles, Links: r.Links })) : [];
      return res.status(200).json({ data: results, total: results.length });
      
    } else {
      // 2. NORMAL LOAD (Jab user library scroll kare)
      const fetchRes = await fetch(`${XATA_REST_URL}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XATA_API_KEY}`
        },
        body: JSON.stringify({
          statement: `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET ${parseInt(offset)};`
        })
      });
      const data = await fetchRes.json();
      return res.status(200).json({ data: data.records || [], total: 78500 });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server Error' });
  }
}
