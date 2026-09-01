import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/assets/js/app.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data calls (attaches the current Supabase session token so each
// admin-* function can verify identity + admin status server-side).
export async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`/api/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export function effectivePrice(product) {
  const pct = product.discount_percent || 0;
  return Math.round(product.price * (1 - pct / 100) * 100) / 100;
}

// Every admin page (except login) calls this first. Being logged in
// via Supabase only proves identity — admin-me re-checks the email
// against the server-side ADMIN_EMAILS allowlist, since that's the
// real enforcement point (mirrored independently in every admin-*
// function too, not just trusted from this one check).
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.href = 'login.html'; return null; }

  try {
    const { user } = await api('admin-me');
    if (!user || !user.isAdmin) {
      await supabase.auth.signOut();
      location.href = 'login.html';
      return null;
    }
    return user;
  } catch {
    location.href = 'login.html';
    return null;
  }
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
  location.href = 'login.html';
}

const NAV_ITEMS = [
  { href: 'dashboard.html', label: 'Dashboard' },
  { href: 'products.html', label: 'Products & Stock' },
  { href: 'discounts.html', label: 'Discounts & Offers' },
  { href: 'coupons.html', label: 'Coupon Codes' },
  { href: 'banners.html', label: 'Home Page CMS' },
  { href: 'orders.html', label: 'Order Operations' },
  { href: 'settings.html', label: 'System Settings' },
];

export function renderSidebar(activeHref, whoLabel) {
  const nav = document.getElementById('admin-nav');
  nav.innerHTML = NAV_ITEMS.map(item =>
    `<a href="${item.href}" class="${item.href === activeHref ? 'active' : ''}">${item.label}</a>`
  ).join('');
  const who = document.getElementById('admin-who');
  if (who && whoLabel) who.textContent = whoLabel;
  const signout = document.getElementById('signout-btn');
  if (signout) signout.onclick = signOutAdmin;
}

export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}
