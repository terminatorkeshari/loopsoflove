#!/usr/bin/env node
/**
 * scripts/migrate-images.js
 *
 * Moves every product's external image_url into Supabase Storage
 * (bucket: product-images) and records the result in product_images.
 * Also updates products.image_url to the new Supabase public URL, so
 * every page that already reads that column picks up the change with
 * zero frontend edits.
 *
 * Usage:
 *   node scripts/migrate-images.js --dry-run     # report only, no writes
 *   node scripts/migrate-images.js                # actually migrate
 *
 * Requires the same environment variables Netlify Functions use:
 *   DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Run locally with e.g.:
 *   DATABASE_URL=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/migrate-images.js --dry-run
 */

const crypto = require('crypto');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = 'product-images';
const MAX_RETRIES = 3;
const EXT_FOR_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

const pool = new Pool({
  connectionString: requireEnv('DATABASE_URL'),
  ssl: { rejectUnauthorized: false }
});

const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false }
});

async function fetchWithRetry(url, attempt = 1) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const backoffMs = 500 * attempt;
    console.log(`  retrying (${attempt}/${MAX_RETRIES - 1}) after ${backoffMs}ms — ${err.message}`);
    await new Promise(r => setTimeout(r, backoffMs));
    return fetchWithRetry(url, attempt + 1);
  }
}

async function migrateProduct(product) {
  const { id, name, image_url } = product;

  // Skip anything already pointed at our own Supabase project (already migrated).
  if (image_url.includes(new URL(process.env.SUPABASE_URL).host)) {
    return { id, name, status: 'skipped', reason: 'already on Supabase' };
  }

  const res = await fetchWithRetry(image_url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const contentType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
  const ext = EXT_FOR_MIME[contentType] || 'jpg';
  const sha1 = crypto.createHash('sha1').update(buffer).digest('hex');
  const storagePath = `products/${id}/${sha1}.${ext}`;

  if (DRY_RUN) {
    return { id, name, status: 'would-migrate', bytes: buffer.length, storagePath };
  }

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: true
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const public_url = pub.publicUrl;

  await pool.query(
    `INSERT INTO product_images (id, product_id, storage_path, public_url, is_primary)
     VALUES ($1, $2, $3, $4, true)`,
    [crypto.randomUUID(), id, storagePath, public_url]
  );
  await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [public_url, id]);

  return { id, name, status: 'migrated', public_url };
}

async function main() {
  console.log(DRY_RUN ? 'DRY RUN — no writes will be made\n' : 'LIVE RUN — uploading and updating the database\n');

  const { rows: products } = await pool.query(
    "SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != ''"
  );
  console.log(`Found ${products.length} product(s) with an image_url.\n`);

  const results = [];
  for (const product of products) {
    try {
      const result = await migrateProduct(product);
      results.push(result);
      console.log(`[${result.status}] ${product.name} (${product.id})`);
    } catch (err) {
      results.push({ id: product.id, name: product.name, status: 'failed', reason: err.message });
      console.log(`[failed] ${product.name} (${product.id}) — ${err.message}`);
    }
  }

  const migrated = results.filter(r => r.status === 'migrated' || r.status === 'would-migrate').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const failed = results.filter(r => r.status === 'failed');
  const successRate = products.length ? Math.round(((migrated + skipped) / products.length) * 100) : 100;

  console.log('\n---- Migration report ----');
  console.log(`Total:     ${products.length}`);
  console.log(`Migrated:  ${migrated}`);
  console.log(`Skipped:   ${skipped} (already on Supabase)`);
  console.log(`Failed:    ${failed.length}`);
  console.log(`Success rate: ${successRate}%`);
  if (failed.length) {
    console.log('\nFailures:');
    failed.forEach(f => console.log(`  - ${f.name} (${f.id}): ${f.reason}`));
  }

  await pool.end();
  process.exit(failed.length ? 1 : 0);
}

main().catch(err => {
  console.error('Migration script crashed:', err);
  process.exit(1);
});
