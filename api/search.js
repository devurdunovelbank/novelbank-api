export default async function handler(req, res) {
  // CORS Headers
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

  // CHECK 1: Agar Vercel mein Keys save nahi huin
  if (!XATA_API_KEY || !XATA_REST_URL) {
      return res.status(500).json({ error: "Vercel Environment Variables Missing!" });
  }

  try {
    if (query) {
      const fetchRes = await fetch(`${XATA_REST_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XATA_API_KEY}`
        },
        body: JSON.stringify({
          query: query,
          tables: ["novels"],
          fuzziness: 1,
          prefix: "phrase"
        })
      });
      
      const data = await fetchRes.json();
      
      // CHECK 2: Agar Xata ne error diya (e.g. Galat API Key)
      if (!fetchRes.ok) {
         return res.status(fetchRes.status).json({ error: "Xata Search Error", details: data });
      }

      const results = data.records ? data.records.map(r => ({ Titles: r.Titles, Links: r.Links })) : [];
      return res.status(200).json({ data: results, total: results.length });
      
    } else {
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
      
      // CHECK 3: Agar SQL me masla hai
      if (!fetchRes.ok) {
         return res.status(fetchRes.status).json({ error: "Xata SQL Error", details: data });
      }

      return res.status(200).json({ data: data.records || [], total: 78500 });
    }
  } catch (error) {
    // CHECK 4: Agar Code phat jaye
    return res.status(500).json({ error: 'System Error', message: error.message });
  }
}
