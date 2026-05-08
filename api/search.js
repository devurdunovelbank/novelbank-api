export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, offset = 0 } = req.query;
  const XATA_API_KEY = process.env.XATA_API_KEY;
  const XATA_REST_URL = process.env.XATA_REST_URL;

  if (!XATA_API_KEY || !XATA_REST_URL) {
      return res.status(500).json({ error: "Missing Keys in Vercel. Please add Environment Variables." });
  }

  try {
    const endpoint = query ? `${XATA_REST_URL}/search` : `${XATA_REST_URL}/sql`;
    const bodyData = query 
      ? { query: query, tables: ["novels"], fuzziness: 1, prefix: "phrase" }
      : { statement: `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET ${parseInt(offset)};` };

    const fetchRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XATA_API_KEY}`
      },
      body: JSON.stringify(bodyData)
    });

    // Pehle response ko simple text mein parhein taake HTML aaye to system crash na ho
    const textResponse = await fetchRes.text(); 

    try {
        const data = JSON.parse(textResponse);
        
        if (!fetchRes.ok) {
           return res.status(fetchRes.status).json({ error: "Xata API Error", details: data });
        }
        
        if (query) {
            const results = data.records ? data.records.map(r => ({ Titles: r.Titles, Links: r.Links })) : [];
            return res.status(200).json({ data: results, total: results.length });
        } else {
            return res.status(200).json({ data: data.records || [], total: 78500 });
        }
    } catch (parseError) {
        // Agar dobara URL ki galti hui aur Xata ne HTML bheja, to ye asaan lafzon mein batayega
        return res.status(500).json({ 
            error: "Invalid Xata URL", 
            message: "Xata ne database nahi dhoonda. Apne Vercel mein XATA_REST_URL check karein.",
            url_used: endpoint
        });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Server Network Error', message: error.message });
  }
}
