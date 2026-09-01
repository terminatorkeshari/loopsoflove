const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

// Verifies the Supabase JWT sent in the Authorization header and returns
// the user object, or null if missing/invalid. This is the ONLY thing
// Supabase is still used for in this project — auth, nothing else.
async function verifyUser(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  
  return data.user;
}

async function requireAdmin(req) {
  const user = await verifyUser(req);
  if (!user || !isAdminEmail(user.email)) return null;
  return user;
}

module.exports = { supabase, verifyUser, requireAdmin, isAdminEmail };
