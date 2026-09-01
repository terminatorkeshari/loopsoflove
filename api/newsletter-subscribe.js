const crypto = require('crypto');
const pool = require('./_lib/db');

// POST /api/newsletter-subscribe — public. Body: { email }
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return json(400, { error: 'Enter a valid email address.' });
  }

  try {
    await pool.query(
      'INSERT INTO newsletter_subscribers (id, email) VALUES ($1, $2)',
      [crypto.randomUUID(), email.toLowerCase().trim()]
    );
    return json(200, { subscribed: true });
  } catch (err) {
    if (String(err.message).includes('unique')) {
      return json(200, { subscribed: true }); // already on the list — not an error from the user's perspective
    }
    console.error('Error subscribing to newsletter:', err);
    return json(500, { error: 'Something went wrong — try again.' });
  }
};
