const { Pool } = require('pg');

// Direct Database Connection!
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export default async function handler(req, res) {
  // CORS Headers for Blogger
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, offset = 0 } = req.query;

  if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "Vercel mein DATABASE_URL missing hai!" });
  }

  try {
    if (query) {
      // Super Fast ILIKE Search (Case Insensitive)
      const sql = `SELECT "Titles", "Links" FROM novels WHERE "Titles" ILIKE $1 LIMIT 50;`;
      const values = [`%${query}%`];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: result.rows.length });
    } else {
      // Fast Loading for Library Pagination
      const sql = `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET $1;`;
      const values = [parseInt(offset)];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: 78500 });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Database Query Error', message: error.message });
  }
}
