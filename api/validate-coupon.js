const pool = require('./_lib/db');

// POST /api/validate-coupon — public. Body: { code, subtotal }
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const { code, subtotal } = req.body || {};
  if (!code) return json(400, { valid: false, message: 'Enter a coupon code.' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = true',
      [code]
    );
    const coupon = rows[0];

    if (!coupon) return json(200, { valid: false, message: 'That coupon code isn\u2019t valid.' });
    if (coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) {
      return json(200, { valid: false, message: 'This coupon has reached its usage limit.' });
    }
    if (subtotal < coupon.min_order_amount) {
      return json(200, { valid: false, message: `Minimum order of \u20b9${coupon.min_order_amount} required for this code.` });
    }

    let discount_amount = coupon.discount_type === 'percent'
      ? Math.round((subtotal * coupon.discount_value) / 100 * 100) / 100
      : Number(coupon.discount_value);
    discount_amount = Math.min(discount_amount, subtotal);

    return json(200, { valid: true, code: coupon.code, discount_amount });
  } catch (err) {
    console.error('Error validating coupon:', err);
    return json(500, { valid: false, message: 'Something went wrong validating that code.' });
  }
};
