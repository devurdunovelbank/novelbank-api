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
      return res.status(500).json({ error: "DATABASE_URL missing" });
  }

  try {
    if (query) {
      // FUSE.JS LOGIC: Search ko alag alag words mein tod do
      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      let values = [];
      let andConditions = [];
      let orConditions = [];

      words.forEach((word, index) => {
         andConditions.push(`"Titles" ILIKE $${index + 1}`);
         orConditions.push(`"Titles" ILIKE $${index + 1}`);
         values.push(`%${word}%`);
      });

      // LEVEL 1: Pehle check karo ke kiya saare lafz kisi novel mein hain? (Strict Match)
      let sql = `SELECT "Titles", "Links" FROM novels WHERE ${andConditions.join(' AND ')} LIMIT 50;`;
      let result = await pool.query(sql, values);
      
      // LEVEL 2: Agar saare lafz ek sath na milein, to Fuse.js ki tarah jin mein 1-2 lafz milen wo dikha do (Fuzzy/Partial Match)
      if (result.rows.length === 0 && words.length > 1) {
          let fallbackSql = `SELECT "Titles", "Links" FROM novels WHERE ${orConditions.join(' OR ')} LIMIT 50;`;
          result = await pool.query(fallbackSql, values);
      }

      return res.status(200).json({ data: result.rows, total: result.rows.length });
    } else {
      // Normal Library Loading
      const sql = `SELECT "Titles", "Links" FROM novels LIMIT 21 OFFSET $1;`;
      const values = [parseInt(offset)];
      const result = await pool.query(sql, values);
      
      return res.status(200).json({ data: result.rows, total: 78500 });
    }
  } catch (error) {
    return res.status(500).json({ error: 'DB Error', message: error.message });
  }
}
