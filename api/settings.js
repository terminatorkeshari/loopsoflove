const pool = require('./_lib/db');

// GET /api/settings — public read. Converts the settings table's
// key/value rows into a flat object, e.g. { block_orders: 'false',
// announcement_text: '...', whatsapp_number: '...' }.
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  try {
    const { rows } = await pool.query('SELECT "key", value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    return json(200, { settings });
  } catch (err) {
    console.error('Error fetching settings:', err);
    return json(500, { error: 'Database error fetching settings' });
  }
};
