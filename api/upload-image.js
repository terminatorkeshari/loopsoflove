const crypto = require('crypto');
const pool = require('./_lib/db');
const { requireAdmin } = require('./_lib/supabase');
const { uploadToCloudinary } = require('./_lib/cloudinary');

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// POST /api/upload-image (Vercel auto-routes any file directly under /api/ to a matching endpoint — no redirect config needed)
// Body (JSON): { product_id, filename, mime_type, data_base64, alt_text?, is_primary? }
//
// Client-side, convert a <input type="file"> selection to base64 first:
//   const buf = await file.arrayBuffer();
//   const base64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ''));
// then POST { filename: file.name, mime_type: file.type, data_base64: base64, product_id }
module.exports = async (req, res) => {
  const json = (statusCode, body) => res.status(statusCode).json(body);
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!(await requireAdmin(req))) return json(403, { error: 'Admin access required.' });

  let body;
  try { body = req.body || {}; } catch { return json(400, { error: 'Invalid request body' }); }

  const { product_id, filename, mime_type, data_base64, alt_text, is_primary } = body;

  if (!product_id || !filename || !mime_type || !data_base64) {
    return json(400, { error: 'product_id, filename, mime_type, and data_base64 are all required.' });
  }
  if (!ALLOWED_MIME.has(mime_type)) {
    return json(400, { error: `Unsupported file type "${mime_type}". Allowed: jpeg, png, webp, gif.` });
  }

  let buffer;
  try {
    buffer = Buffer.from(data_base64, 'base64');
  } catch {
    return json(400, { error: 'data_base64 could not be decoded.' });
  }
  if (buffer.length === 0) return json(400, { error: 'Uploaded file is empty.' });
  if (buffer.length > MAX_BYTES) return json(400, { error: `File exceeds the ${MAX_BYTES / 1024 / 1024}MB limit.` });

  let uploadResult;
  try {
    const dataUri = `data:${mime_type};base64,${data_base64}`;
    uploadResult = await uploadToCloudinary(dataUri, `products/${product_id}`);
  } catch (err) {
    return json(500, { error: `Upload failed: ${err.message}` });
  }

  const { public_url, storage_path, width, height } = uploadResult;

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO product_images (id, product_id, storage_path, public_url, alt_text, width, height, is_primary)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, product_id, storage_path, public_url, alt_text || null, width || null, height || null, !!is_primary]
  );

  // Keep products.image_url (the single legacy field every page currently
  // reads) pointed at the primary image, so existing pages need no changes.
  if (is_primary) {
    await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [public_url, product_id]);
  }

  return json(200, { id, public_url, storage_path, mime_type, width, height });
};
