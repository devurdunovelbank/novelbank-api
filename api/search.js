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
      
      // 2. Har word ke liye ILIKE condition banayen
      // Hum exact "Titles" (double quotes ke sath) use karenge jaisa aapke DB mein hai
      const conditions = words.map((_, i) => `"Titles" ILIKE $${i + 1}`).join(' AND ');
      const values = words.map(w => `%${w}%`);

      // 3. Final Query: Ye dhoonde ga ke novel mein ye saare words kahin bhi hon
      const sql = `SELECT "Titles", "Links" FROM novels WHERE ${conditions} LIMIT 50;`;
      
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ 
        data: result.rows, 
        total: result.rows.length 
      });

    } else {
      // Library Load karne ke liye
      const sql = `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET $1;`;
      const result = await pool.query(sql, [parseInt(offset) || 0]);
      return res.status(200).json({ data: result.rows, total: 78500 });
    }
  } catch (error) {
    // Agar koi galti ho to error show kare
    return res.status(500).json({ error: 'DATABASE_ERROR', details: error.message });
  }
}
