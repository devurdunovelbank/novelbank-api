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

  try {
    if (query) {
      // 1. Search term ko words mein torein (e.g. "Bharam", "Baqa", "batil")
      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      
      // 2. Dynamic Ranking Logic (Fuse.js style)
      // Hum har word ke liye check karenge aur score calculate karenge
      const matchConditions = words.map((_, i) => `("${Titles}" ILIKE $${i + 1})::int`).join(' + ');
      const whereConditions = words.map((_, i) => `"Titles" ILIKE $${i + 1}`).join(' OR ');
      const values = words.map(w => `%${w}%`);

      // 3. Query: Score calculate karo (kitne words match hue) aur us base par Sort karo
      const sql = `
        SELECT "Titles", "Links", 
               (${matchConditions}) as match_count
        FROM novels 
        WHERE ${whereConditions}
        ORDER BY match_count DESC, "Titles" ASC
        LIMIT 50;
      `;
      
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ 
        data: result.rows, 
        total: result.rows.length 
      });

    } else {
      // Library Load Logic
      const sql = `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET $1;`;
      const result = await pool.query(sql, [parseInt(offset) || 0]);
      return res.status(200).json({ data: result.rows, total: 78500 });
    }
  } catch (error) {
    return res.status(500).json({ error: 'DATABASE_ERROR', details: error.message });
  }
}
