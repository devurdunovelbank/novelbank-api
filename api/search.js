const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, offset = 0 } = req.query;

  if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "DATABASE_URL is missing!" });
  }

  try {
    if (query) {
      // THE FIX: word_similarity() acts exactly like Fuse.js substring matching
      // Exact word match ya start hone walay words hamesha Top par aayenge!
      const sql = `
        SELECT "Titles", "Links", 
               word_similarity($1, "Titles") as score
        FROM novels 
        WHERE "Titles" ILIKE $2 
           OR word_similarity($1, "Titles") > 0.15
        ORDER BY 
           "Titles" ILIKE $3 DESC,  -- Agar exactly wahi naam ho to No. 1 par aaye
           score DESC 
        LIMIT 50;
      `;
      // $1 = exact query, $2 = partial match, $3 = starts with match
      const values = [query, `%${query}%`, `${query}%`];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: result.rows.length });
    } else {
      const sql = `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET $1;`;
      const values = [parseInt(offset)];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: 78500 });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Database Query Error', message: error.message });
  }
}
