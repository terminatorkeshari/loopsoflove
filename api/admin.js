const crypto = require('crypto');
const { getPool, ensureSchema } = require('./_lib/db');
const { requireAdmin } = require('./_lib/supabase');
const { uploadToCloudinary } = require('./_lib/cloudinary');

const ALLOWED_SETTINGS_KEYS = ['block_orders', 'store_domain', 'whatsapp_number', 'announcement_text'];

// Merged admin CRUD dispatcher: /api/admin?resource=banners|coupons|discounts|orders|products|settings
// Combined into one file because Vercel's Hobby plan caps a deployment at
// 12 serverless functions — each file directly under api/ counts as one,
// regardless of size.
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  const resource = req.query.resource;

  // ---------------- banners ----------------
  // Uses CockroachDB (same database as every other resource here) and
  // Cloudinary for image storage.
  if (resource === 'banners') {
    if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });
    const pool = getPool();
    if (ensureSchema) await ensureSchema(pool);

    try {
      if (req.method === 'GET') {
        const { rows } = await pool.query('SELECT * FROM banners ORDER BY sort_order ASC');
        return json(200, { banners: rows });
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        let imageUrl = body.image_url;

        if (body.image_base64) {
          try {
            const uploadResult = await uploadToCloudinary(body.image_base64, 'banners');
            imageUrl = uploadResult.public_url;
          } catch (err) {
            return json(500, { error: `Image upload failed: ${err.message}` });
          }
        }

        if (!imageUrl && body.preset !== 'gradient') {
          return json(400, { error: 'An image or gradient is required.' });
        }

        const id = crypto.randomUUID();
        const preset = body.preset || 'image';
        const gradient_css = body.gradient_css || null;
        const video_url = body.video_url || null;
        const overlay_color = body.overlay_color || '#000000';
        const overlay_opacity = parseFloat(body.overlay_opacity) || 0.35;
        const cta_text = body.cta_text || 'Shop the Collection';
        const cta_url = body.cta_url || '#shop';
        const height_vh = parseInt(body.height_vh) || 60;
        const text_align = body.text_align || 'left';
        const font_size_preset = body.font_size_preset || 'lg';
        const animate_on_load = body.animate_on_load !== false;

        const insertSql = `INSERT INTO banners (
            id, eyebrow, title, subtitle, image_url, sort_order, active,
            preset, gradient_css, video_url, overlay_color, overlay_opacity,
            cta_text, cta_url, height_vh, text_align, font_size_preset, animate_on_load
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17, $18
          )`;
        const insertParams = [
          id, body.eyebrow || '', body.headline || '', body.subtitle || '', imageUrl || '', parseInt(body.order) || 0, body.status === 'Active',
          preset, gradient_css, video_url, overlay_color, overlay_opacity,
          cta_text, cta_url, height_vh, text_align, font_size_preset, animate_on_load
        ];

        try {
          await pool.query(insertSql, insertParams);
        } catch (insertErr) {
          // If a column is missing, run migration and retry once
          if (ensureSchema) await ensureSchema(pool);
          await pool.query(insertSql, insertParams);
        }

        return json(200, { success: true, id, message: 'Slide saved!' });
      }

      if (req.method === 'DELETE') {
        const body = req.body || {};
        if (!body.id) return json(400, { error: 'Missing id' });
        await pool.query('DELETE FROM banners WHERE id = $1', [body.id]);
        return json(200, { success: true, message: 'Slide deleted!' });
      }

      return json(405, { error: 'Method Not Allowed' });
    } catch (error) {
      return json(500, { error: error.message });
    }
  }

  // ---------------- coupons ----------------
  if (resource === 'coupons') {
    if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM coupons ORDER BY created_at DESC');
      return json(200, { coupons: rows });
    }

    let body = {};
    try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }

    if (req.method === 'POST') {
      const id = crypto.randomUUID();
      try {
        await pool.query(
          'INSERT INTO coupons (id, code, discount_type, discount_value, min_order_amount, max_uses, active) VALUES ($1, $2, $3, $4, $5, $6, true)',
          [id, body.code.trim().toUpperCase(), body.discount_type, body.discount_value, body.min_order_amount || 0, body.max_uses || null]
        );
      } catch (err) {
        if (String(err).includes('unique constraint')) return json(400, { error: 'That code already exists.' });
        throw err;
      }
      return json(200, { ok: true, id });
    }

    if (req.method === 'PUT') {
      if (!body.id) return json(400, { error: 'Missing id' });
      await pool.query('UPDATE coupons SET active = $1 WHERE id = $2', [body.active !== false, body.id]);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  }

  // ---------------- discounts ----------------
  if (resource === 'discounts') {
    if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });
    const pool = getPool();

    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM discounts ORDER BY created_at DESC');
      return json(200, { discounts: rows });
    }

    let body = {};
    try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }

    if (req.method === 'POST') {
      const id = crypto.randomUUID();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          'INSERT INTO discounts (id, name, percent, applies_to, target, active) VALUES ($1, $2, $3, $4, $5, true)',
          [id, body.name, body.percent, body.applies_to, body.applies_to === 'category' ? body.target : null]
        );

        if (body.applies_to === 'category') {
          await client.query('UPDATE products SET discount_percent = $1 WHERE category = $2', [body.percent, body.target]);
        } else {
          await client.query('UPDATE products SET discount_percent = $1', [body.percent]);
        }

        await client.query('COMMIT');
        return json(200, { ok: true, id });
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    if (req.method === 'PUT') {
      if (!body.id) return json(400, { error: 'Missing id' });
      await pool.query('UPDATE discounts SET active = false WHERE id = $1', [body.id]);
      return json(200, { ok: true });
    }

    return json(405, { error: 'Method not allowed' });
  }

  // ---------------- orders ----------------
  if (resource === 'orders') {
    if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });
    const pool = getPool();

    if (req.method === 'GET') {
      try {
        const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
        const orders = rows.map(o => ({ ...o, items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items }));
        return json(200, { orders });
      } catch (err) {
        console.error('Error fetching orders:', err);
        return json(500, { error: 'Database error fetching orders' });
      }
    }

    if (req.method === 'PUT') {
      let body = {};
      try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }
      if (!body.id || !body.status) return json(400, { error: 'Missing id or status' });

      try {
        await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [body.status, body.id]);
        return json(200, { ok: true });
      } catch (err) {
        console.error('Error updating order:', err);
        return json(500, { error: 'Database error updating order' });
      }
    }

    if (req.method === 'DELETE') {
      let body = {};
      try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }
      if (!body.id) return json(400, { error: 'Missing id' });

      try {
        await pool.query('DELETE FROM orders WHERE id = $1', [body.id]);
        return json(200, { ok: true });
      } catch (err) {
        console.error('Error deleting order:', err);
        return json(500, { error: 'Database error deleting order' });
      }
    }

    return json(405, { error: 'Method not allowed' });
  }

  // ---------------- products ----------------
  if (resource === 'products') {
    if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });
    const pool = getPool();

    if (req.method === 'GET') {
      try {
        const { rows } = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        return json(200, { products: rows });
      } catch (err) {
        console.error('Error fetching products:', err);
        return json(500, { error: 'Database error while fetching products' });
      }
    }

    let body = {};
    try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }

    if (req.method === 'POST') {
      const id = crypto.randomUUID();
      try {
        await pool.query(
          `INSERT INTO products (id, name, description, price, discount_percent, stock, image_url, category, active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [id, body.name, body.description || '', body.price, body.discount_percent || 0, body.stock, body.image_url || '', body.category || '', body.active !== false]
        );
        return json(200, { ok: true, id });
      } catch (err) {
        console.error('Error saving new product:', err);
        return json(500, { error: 'Database error while saving product' });
      }
    }

    if (req.method === 'PUT') {
      if (!body.id) return json(400, { error: 'Missing id' });
      try {
        await pool.query(
          `UPDATE products SET name=$1, description=$2, price=$3, discount_percent=$4, stock=$5, image_url=$6, category=$7, active=$8 WHERE id=$9`,
          [body.name, body.description || '', body.price, body.discount_percent || 0, body.stock, body.image_url || '', body.category || '', body.active !== false, body.id]
        );
        return json(200, { ok: true });
      } catch (err) {
        console.error('Error updating product:', err);
        return json(500, { error: 'Database error while updating product' });
      }
    }

    if (req.method === 'DELETE') {
      if (!body.id) return json(400, { error: 'Missing id' });
      try {
        await pool.query('DELETE FROM products WHERE id = $1', [body.id]);
        return json(200, { ok: true });
      } catch (err) {
        console.error('Error deleting product:', err);
        return json(500, { error: 'Database error while deleting product' });
      }
    }

    return json(405, { error: 'Method not allowed' });
  }

  // ---------------- settings ----------------
  if (resource === 'settings') {
    if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });
    if (req.method !== 'PUT') return json(405, { error: 'Method not allowed' });

    let body = {};
    try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }
    if (!ALLOWED_SETTINGS_KEYS.includes(body.key)) return json(400, { error: 'Unknown setting key.' });

    try {
      const pool = getPool();
      await pool.query('UPDATE settings SET value = $1 WHERE "key" = $2', [String(body.value), body.key]);
      return json(200, { ok: true });
    } catch (err) {
      console.error('Error saving setting:', err);
      return json(500, { error: 'Database error while saving settings.' });
    }
  }

  return json(400, { error: 'Unknown or missing "resource" query parameter.' });
};
