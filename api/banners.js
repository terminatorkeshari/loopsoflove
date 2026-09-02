const { getPool, ensureSchema } = require('./_lib/db');

// GET /api/banners — public read, no auth required. Only returns active
// slides, ordered for the homepage slideshow.
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const pool = getPool();
    if (ensureSchema) await ensureSchema(pool);
    const { rows } = await pool.query(
      'SELECT * FROM banners WHERE active = true ORDER BY sort_order ASC'
    );
    return json(200, rows);
  } catch (err) {
    console.error('Error fetching banners:', err);
    return json(500, { error: 'Database error fetching banners' });
  }
};
