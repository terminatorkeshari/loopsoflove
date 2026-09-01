-- ============================================================
-- Migration: hero banner presets + product_images table
-- Safe to run even if you already created the original schema —
-- every statement is additive (IF NOT EXISTS / new table only).
-- Run this against the SAME CockroachDB database as schema.sql.
-- ============================================================

ALTER TABLE banners ADD COLUMN IF NOT EXISTS preset VARCHAR(20) NOT NULL DEFAULT 'image';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS gradient_css VARCHAR(255);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS video_url VARCHAR(500);
ALTER TABLE banners ADD COLUMN IF NOT EXISTS overlay_color VARCHAR(20) DEFAULT '#000000';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS overlay_opacity DECIMAL(3,2) NOT NULL DEFAULT 0.35;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_text VARCHAR(100) DEFAULT 'Shop the collection';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_url VARCHAR(500) DEFAULT '#shop';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS height_vh INT NOT NULL DEFAULT 60;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS text_align VARCHAR(10) NOT NULL DEFAULT 'left';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS font_size_preset VARCHAR(10) NOT NULL DEFAULT 'lg';
ALTER TABLE banners ADD COLUMN IF NOT EXISTS animate_on_load BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS product_images (
  id VARCHAR(36) PRIMARY KEY,
  product_id VARCHAR(36) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255),
  width INT,
  height INT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
