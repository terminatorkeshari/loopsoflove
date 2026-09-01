import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '/assets/js/app.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Data calls (attaches the current Supabase session token)
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
  return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export function effectivePrice(product) {
  const pct = product.discount_percent || 0;
  return Math.round(product.price * (1 - pct / 100) * 100) / 100;
}

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
  { href: 'dashboard.html', label: 'Dashboard', icon: '📊' },
  { href: 'products.html', label: 'Products & Stock', icon: '🧶' },
  { href: 'orders.html', label: 'Orders & Shipping', icon: '📦' },
  { href: 'banners.html', label: 'Home Page CMS', icon: '🖼️' },
  { href: 'coupons.html', label: 'Coupon Codes', icon: '🎟️' },
  { href: 'discounts.html', label: 'Discounts & Offers', icon: '🏷️' },
  { href: 'settings.html', label: 'System Settings', icon: '⚙️' },
];

export function renderSidebar(activeHref, whoLabel = 'Store Admin') {
  const nav = document.getElementById('admin-nav');
  if (nav) {
    nav.innerHTML = `
      <div class="nav-label">Store Operations</div>
      ${NAV_ITEMS.map(item => `
        <a href="${item.href}" class="${item.href === activeHref ? 'active' : ''}">
          <span class="nav-icon">${item.icon}</span>
          <span>${item.label}</span>
        </a>
      `).join('')}
    `;
  }

  const who = document.getElementById('admin-who');
  if (who && whoLabel) who.textContent = whoLabel;

  const signout = document.getElementById('signout-btn');
  if (signout) signout.onclick = signOutAdmin;
}

export function toast(msg, type = 'normal') {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  const icon = type === 'error' ? '⚠️' : '✨';
  el.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

