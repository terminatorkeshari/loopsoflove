# Loops of Love

Handmade, customizable accessories & gifts — storefront + admin panel.

## Actual current stack (read this before changing anything)

This project went through several pivots. Here is what it **actually
runs on right now** — not what any older comment, folder name, or
abandoned config might suggest:

| Piece | Technology |
|---|---|
| Hosting | **Vercel** (not Netlify — `netlify.toml` and a `netlify/functions` layout were removed) |
| Backend functions | Vercel Serverless Functions, plain Node.js (no framework), living in `/api/*.js` |
| Shared backend code | `/api/_lib/*.js` — the underscore prefix tells Vercel not to route these as endpoints |
| Database | **CockroachDB** (Postgres wire-compatible), accessed via the `pg` driver. Despite the folder name, `mysql/schema.sql` is written in Postgres/CockroachDB syntax, not MySQL — an earlier version really did target MySQL, the code was migrated to CockroachDB, and only the folder name never got renamed. |
| Auth | **Supabase Auth only** — nothing else about Supabase is used. Not the database, not Storage. |
| Image storage | **Cloudinary** (`api/_lib/cloudinary.js`), for both product images and banner images |
| WhatsApp order notifications | Meta WhatsApp Business API, via `api/_lib/whatsapp.js` — fails silently if not configured, never blocks an order |

If you ever see a reference to Netlify, MySQL, Turso, or Supabase
Storage/Database anywhere in this project going forward, it's stale —
none of those are part of the live system.

## Vercel Hobby plan note

Vercel's free (Hobby) plan caps a deployment at **12 serverless
functions**. This project intentionally keeps only **9** files
directly under `/api/` — the 6 separate admin CRUD endpoints
(banners/coupons/discounts/orders/products/settings) are merged into
one `api/admin.js`, dispatched by a `?resource=` query string (e.g.
`/api/admin?resource=products`). **Do not split that file back apart**
without either staying under 12 total or upgrading to Vercel Pro.

## Folder structure

```
/                     — static pages (index, product, cart, checkout, login, order-confirmation)
/admin/               — admin panel pages + admin/assets/js/admin.js
/assets/css/          — style.css (single stylesheet, "Elegant Evening" espresso/bronze theme)
/assets/js/           — app.js (data layer), product-carousel.js, photo-banner.js
/api/                 — Vercel serverless functions (9 files, see above)
/api/_lib/             — shared backend helpers (not routes)
/mysql/               — schema.sql (fresh install) + migration_hero_carousel_images.sql (adds banner presets + product_images to an existing DB)
/scripts/migrate-images.js — one-off script to move externally-hosted product images into Cloudinary
```

## Environment variables (set these in Vercel → Project Settings → Environment Variables)

- `DATABASE_URL` — CockroachDB connection string
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — for auth only
- `ADMIN_EMAIL` (or `ADMIN_EMAILS`, comma-separated) — which logged-in email(s) count as admin
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your Cloudinary dashboard
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` — optional, order notifications silently skip if unset

**Never commit real values for any of these.** `.gitignore` already
excludes `.env` and `.env.txt` — keep it that way.

## Setting up the database

Run `mysql/schema.sql` against a fresh CockroachDB database. If you
already have one from before the banner/carousel feature existed, run
`mysql/migration_hero_carousel_images.sql` instead (it's additive —
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, safe to run on an existing
database).
