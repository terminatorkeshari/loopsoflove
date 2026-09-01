const crypto = require('crypto');
const pool = require('./_lib/db');
const { verifyUser } = require('./_lib/supabase');
const { sendOrderWhatsapp } = require('./_lib/whatsapp');

const json = (res, statusCode, data) => res.status(statusCode).json(data);

function generateOrderNumber() {
  return 'LOL' + Date.now().toString().slice(-8);
}

// POST /api/place-order — public (works for guests and logged-in users).
// Body: { customer_name, phone, street, city, state, pincode, items, coupon_code }
module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    const { customer_name, phone, street, city, state, pincode, items, coupon_code } = req.body || {};

    const cleanPhone = (phone || '').trim();
    if (!customer_name || !cleanPhone || !street || !city || !state || !pincode) {
      return json(res, 400, { error: 'Please fill out all delivery address fields.' });
    }

    // 5. Cart Check
    if (!Array.isArray(items) || items.length === 0) {
      return json(res, 400, { error: 'Cart is empty.' });
    }

    // Identify the customer if they're logged in via Supabase — order stays
    // associable with their account, but a missing/invalid token never
    // blocks a Cash-on-Delivery order.
    const user = await verifyUser(req).catch(() => null);

    // 6. Look up authoritative prices + stock server-side. Never trust a
    // price the browser sends — someone could edit it in devtools.
    const ids = items.map(i => i.product_id);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const { rows: products } = await pool.query(
      `SELECT id, name, price, discount_percent, stock FROM products WHERE active = true AND id IN (${placeholders})`,
      ids
    );

    const lineItems = [];
    let subtotal = 0;

    for (const cartItem of items) {
      const product = products.find(p => p.id === cartItem.product_id);
      if (!product) return json(res, 400, { error: 'One of the items in your cart is no longer available.' });

      const qty = Number(cartItem.qty) || 0;
      if (qty <= 0) return json(res, 400, { error: 'Invalid quantity in cart.' });
      if (qty > product.stock) {
        return json(res, 400, { error: `Only ${product.stock} left of "${product.name}" — please update your cart.` });
      }

      const unitPrice = Math.round(product.price * (1 - (product.discount_percent || 0) / 100) * 100) / 100;
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      lineItems.push({ product_id: product.id, name: product.name, price: unitPrice, qty });
    }

    // 7. Apply the coupon the same way validate-coupon.js does, so the
    // discount actually charged always matches what the customer saw.
    let discount_amount = 0;
    let appliedCouponCode = null;
    if (coupon_code) {
      const { rows: couponRows } = await pool.query(
        'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND active = true',
        [coupon_code]
      );
      const coupon = couponRows[0];
      if (coupon && !(coupon.max_uses !== null && coupon.times_used >= coupon.max_uses) && subtotal >= coupon.min_order_amount) {
        discount_amount = coupon.discount_type === 'percent'
          ? Math.round(subtotal * coupon.discount_value / 100 * 100) / 100
          : Math.min(coupon.discount_value, subtotal);
        appliedCouponCode = coupon.code;
      }
      // An invalid/expired code at this point is silently ignored rather
      // than failing the order — the UI already validated it earlier.
    }

    const address = `${street}, ${city}, ${state} - ${pincode}`;
    const total = Math.round((subtotal - discount_amount) * 100) / 100;
    const id = crypto.randomUUID();
    const order_number = generateOrderNumber();

    // 8. Insert the order.
    await pool.query(
      `INSERT INTO orders (id, order_number, user_id, customer_name, phone, address, items, subtotal, discount_amount, coupon_code, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'placed')`,
      [id, order_number, user?.id || null, customer_name, cleanPhone, address, JSON.stringify(lineItems), subtotal, discount_amount, appliedCouponCode, total]
    );

    // 9. Decrement stock for each item ordered.
    for (const item of lineItems) {
      await pool.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.qty, item.product_id]);
    }

    // 10. Bump the coupon's usage count, if one was applied.
    if (appliedCouponCode) {
      await pool.query('UPDATE coupons SET times_used = times_used + 1 WHERE UPPER(code) = UPPER($1)', [appliedCouponCode]);
    }

    // 11. Best-effort WhatsApp notification — per lib/whatsapp.js, this
    // can never fail or block the order, which already exists by now.
    try {
      const { rows: settingsRows } = await pool.query(`SELECT value FROM settings WHERE "key" = 'whatsapp_number'`);
      const recipientNumber = settingsRows[0]?.value;
      await sendOrderWhatsapp(
        { order_number, customer_name, phone: cleanPhone, address, items: lineItems, total },
        recipientNumber
      );
    } catch (err) {
      console.error('WhatsApp notify failed (non-blocking):', err);
    }

    return json(res, 200, { success: true, order_number });

  } catch (error) {
    console.error('place-order error:', error);
    return json(res, 500, { error: error.message });
  }
};
