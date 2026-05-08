const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // SSL connection ko mazeed behtar banane ke liye
});

export default async function handler(req, res) {
  // Blogger ke liye CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { query, offset = 0 } = req.query;

  try {
    if (query) {
      // 1. "Bharam Baqa batil" ko "%Bharam%Baqa%batil%" mein badalna
      // Is se agar beech mein koi aur lafz bhi hua (jaise 'by') to ye usay dhoond lega
      const searchPattern = `%${query.trim().replace(/\s+/g, '%')}%`;

      // 2. Hum check karenge "Titles" (Capital T) aur titles (Small t) dono ko
      // Taake column name ka koi bhi masla hamesha ke liye khatam ho jaye
      const sql = `
        SELECT * FROM novels 
        WHERE "Titles" ILIKE $1 
           OR "titles" ILIKE $1
        LIMIT 50;
      `;
      
      const result = await pool.query(sql, [searchPattern]);
      
      // Data format ko sahi karke bhejna
      const formattedData = result.rows.map(row => ({
          Titles: row.Titles || row.titles,
          Links: row.Links || row.links
      }));

      return res.status(200).json({ 
        data: formattedData, 
        total: formattedData.length 
      });

    } else {
      // Library Pagination
      const sql = `SELECT * FROM novels LIMIT 21 OFFSET $1;`;
      const result = await pool.query(sql, [parseInt(offset) || 0]);
      
      const formattedData = result.rows.map(row => ({
          Titles: row.Titles || row.titles,
          Links: row.Links || row.links
      }));

      return res.status(200).json({ data: formattedData, total: 78500 });
    }
  } catch (error) {
    // Agar query fail ho to exact error message return karein
    return res.status(500).json({ 
        error: 'DATABASE_ERROR', 
        msg: error.message,
        hint: "Check if your table name is exactly 'novels' in Xata dashboard"
    });
  }
}
