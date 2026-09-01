-- ============================================================
-- Loops of Love — CockroachDB (Postgres-wire) schema
--
-- CORRECTED FROM MySQL DIALECT: the actual code in
-- netlify/functions/lib/db.js connects with the `pg` driver using
-- a CockroachDB connection string, and every query in this project
-- uses Postgres-style $1/$2 placeholders and boolean comparisons
-- like `WHERE active = true` — none of that is valid MySQL. This
-- file now matches what the code actually runs against. If you
-- genuinely want Oracle Cloud MySQL instead, the code (lib/db.js
-- and every $1-style query) would need to switch to a MySQL driver
-- and ? placeholders — right now code and schema must both target
-- the same engine, and the code side already speaks Postgres.
--
-- Run this against your CockroachDB database (Cockroach Cloud SQL
-- console, `cockroach sql`, or any Postgres-compatible client).
--
-- Note: there is no `users` table here. Authentication and user
-- identity now live entirely in Supabase — this database only
-- stores the store's own data (products, orders, etc.) and
-- references Supabase users by their UUID (orders.user_id).
-- ============================================================

CREATE TABLE products (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  image_url VARCHAR(500),
  category VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE banners (
  id VARCHAR(36) PRIMARY KEY,
  eyebrow VARCHAR(255),
  title VARCHAR(500) NOT NULL,
  subtitle VARCHAR(500),
  image_url VARCHAR(500),
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  -- Hero banner editable preset fields
  preset VARCHAR(20) NOT NULL DEFAULT 'image',   -- 'image' | 'gradient' | 'video' | 'split'
  gradient_css VARCHAR(255),                     -- e.g. 'linear-gradient(135deg,#4D3E27,#7E7053)'
  video_url VARCHAR(500),                        -- used when preset = 'video' (image_url is the poster/fallback)
  overlay_color VARCHAR(20) DEFAULT '#000000',
  overlay_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.35,
  cta_text VARCHAR(100) DEFAULT 'Shop the collection',
  cta_url VARCHAR(500) DEFAULT '#shop',
  height_vh INT NOT NULL DEFAULT 60,
  text_align VARCHAR(10) NOT NULL DEFAULT 'left', -- 'left' | 'center' | 'right'
  font_size_preset VARCHAR(10) NOT NULL DEFAULT 'lg', -- 'sm' | 'md' | 'lg' | 'xl'
  animate_on_load BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Individual product images, hosted on Supabase Storage. products.image_url
-- stays as-is for backward compatibility (the primary/first image), this
-- table is the full set (including future multi-image support) and the
-- record of the Supabase storage_path for each uploaded file.
CREATE TABLE product_images (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,   -- e.g. products/<productId>/<sha1>.jpg
  public_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  width INT,
  height INT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discounts (

  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  percent DECIMAL(5,2) NOT NULL,
  applies_to VARCHAR(20) NOT NULL DEFAULT 'all',   -- 'all' | 'category'
  target VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coupons (
  id VARCHAR(36) PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  discount_type VARCHAR(10) NOT NULL DEFAULT 'percent',  -- 'percent' | 'flat'
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses INT NULL,
  times_used INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settings (
  "key" VARCHAR(50) PRIMARY KEY,
  value TEXT
);

INSERT INTO settings ("key", value) VALUES
  ('block_orders', 'false'),
  ('store_domain', ''),
  ('whatsapp_number', ''),
  ('announcement_text', 'Cash on Delivery available on all orders · Shipping pan-India');

CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  user_id VARCHAR(36),                -- Supabase auth user UUID
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  items JSONB NOT NULL,               -- [{product_id, name, price, qty}]
  subtotal DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  coupon_code VARCHAR(50),
  total DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'placed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE newsletter_subscribers (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- NOTE ON SECURITY MODEL
-- CockroachDB supports Row Level Security, but none is defined
-- here — every rule (only admins can write products, only the
-- order owner or an admin can see an order, etc.) is enforced in
-- the Netlify Function code — never by the database itself. The
-- DATABASE_URL credentials must never be exposed to the browser.
--
-- "Who is an admin" is decided by the ADMIN_EMAILS environment
-- variable in Netlify, checked against the verified Supabase user's
-- email on every admin-* function call — see
-- netlify/functions/lib/supabase.js.
-- ============================================================
