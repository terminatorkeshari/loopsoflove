const pool = require('./_lib/db');

// GET /api/products — public read, only active products.
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE active = true ORDER BY created_at DESC');
    return json(200, { products: rows });
  } catch (err) {
    console.error('Error fetching products:', err);
    return json(500, { error: 'Database error fetching products' });
  }
};
