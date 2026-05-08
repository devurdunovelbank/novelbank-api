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
      // THE MAGIC: Postgres Fuzzy Search (Trigram) + Exact Match Combine
      // Ye spelling mistakes aur aage peeche words ko Fuse.js ki tarah handle karega
      const sql = `
        SELECT "Titles", "Links", similarity("Titles", $1) as score
        FROM novels 
        WHERE "Titles" ILIKE $2 
           OR similarity("Titles", $1) > 0.15
        ORDER BY score DESC 
        LIMIT 50;
      `;
      const values = [query, `%${query}%`];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: result.rows.length });
    } else {
      // Normal loading logic
      const sql = `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET $1;`;
      const values = [parseInt(offset)];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: 78500 });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Database Query Error', message: error.message });
  }
}
