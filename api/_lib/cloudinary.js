const crypto = require('crypto');

// Server-side signed upload to Cloudinary. No SDK dependency needed —
// Cloudinary's upload API accepts a plain form POST, and Vercel's Node
// runtime has global fetch and crypto built in.
//
// Requires these Vercel env vars (Project Settings → Environment
// Variables): CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
// CLOUDINARY_API_SECRET — all three are in your Cloudinary dashboard
// under Settings → Access Keys, once you create a free account at
// cloudinary.com.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * @param {string} fileData - a data URI (e.g. "data:image/png;base64,...")
 *   or a remote URL Cloudinary should fetch and re-host.
 * @param {string} folder - Cloudinary folder to file it under, e.g. "banners" or "products/<id>"
 * @returns {Promise<{public_url:string, storage_path:string, width:number, height:number}>}
 */
async function uploadToCloudinary(fileData, folder) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in Vercel.');
  }

  const timestamp = Math.round(Date.now() / 1000);

  // Cloudinary requires the signature to cover exactly the extra params
  // you send (not `file` or `api_key`), sorted alphabetically by key.
  const paramsToSign = { folder, timestamp };
  const toSign = Object.keys(paramsToSign).sort().map(k => `${k}=${paramsToSign[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

  const body = new URLSearchParams({
    file: fileData,
    api_key: apiKey,
    timestamp: String(timestamp),
    folder,
    signature
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error?.message || 'Cloudinary upload failed.');

  return {
    public_url: data.secure_url,
    storage_path: data.public_id,
    width: data.width,
    height: data.height
  };
}

module.exports = { uploadToCloudinary };
