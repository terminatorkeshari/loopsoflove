import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const SUPABASE_URL = 'https://wjwkrdnckdnolvxrebjz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqd2tyZG5ja2Rub2x2eHJlYmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MjkzODgsImV4cCI6MjEwMjEwNTM4OH0.-FGvquX2sACyUevQTm1ucrTHDFwDfnWCWXEb69IotTQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function phoneToSyntheticEmail(phone) {
  const digits = String(phone).replace(/\D/g, '');
  const normalized = digits.length > 10 ? digits.slice(-10) : digits;
  return `p${normalized}@customers.loopsoflove.app`;
}

async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session) headers.Authorization = `Bearer ${session.access_token}`;

  const res = await fetch(`/api/${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

const CART_KEY = 'loh_cart';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

export function addToCart(product, qty = 1) {
  const parsedQty = parseInt(qty, 10) || 1;
  const cart = getCart();
  const existing = cart.find(i => i.product_id === product.id);
  if (existing) existing.qty += parsedQty;
  else cart.push({ product_id: product.id, qty: parsedQty });
  saveCart(cart);
}

export function setQty(productId, qty) {
  const parsedQty = parseInt(qty, 10);
  let cart = getCart();
  if (isNaN(parsedQty) || parsedQty <= 0) {
    cart = cart.filter(i => i.product_id !== productId);
  } else {
    const item = cart.find(i => i.product_id === productId);
    if (item) item.qty = parsedQty;
  }
  saveCart(cart);
}

export function removeFromCart(productId) {
  saveCart(getCart().filter(i => i.product_id !== productId));
}

export function clearCart() { saveCart([]); }

export function cartCount() {
  return getCart().reduce((sum, i) => sum + (parseInt(i.qty, 10) || 0), 0);
}

export function updateCartBadge() {
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = cartCount();
  });
}

export function effectivePrice(product) {
  const pct = product.discount_percent || 0;
  return Math.round(product.price * (1 - pct / 100) * 100) / 100;
}

export function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export async function fetchProducts() {
  const data = await api('products');
  return data.products;
}

export async function fetchProduct(id) {
  const data = await api(`products?id=${encodeURIComponent(id)}`);
  return data.product;
}

export async function fetchProductsByIds(ids) {
  if (ids.length === 0) return [];
  const data = await api(`products?ids=${ids.map(encodeURIComponent).join(',')}`);
  return data.products;
}

export async function fetchBanners() {
  const data = await api('banners');
  return Array.isArray(data) ? data : (data.banners || []);
}

export async function fetchSettings() {
  const data = await api('settings');
  return data.settings || {};
}

export async function renderBlockNotice() {
  const settings = await fetchSettings();
  if (settings.block_orders === 'true') {
    const bar = document.createElement('div');
    bar.className = 'notice-bar';
    bar.textContent = "We're temporarily paused and not accepting new orders — please check back soon.";
    document.body.prepend(bar);
    return true;
  }
  return false;
}

export async function renderAnnouncementBar() {
  const el = document.getElementById('announce-bar');
  if (!el) return;
  const settings = await fetchSettings();
  if (settings.announcement_text) el.textContent = settings.announcement_text;
  else el.style.display = 'none';
}

export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
export const getCurrentProfile = getCurrentUser;

export async function requireLogin(redirectTo = 'checkout.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `login.html?next=${encodeURIComponent(redirectTo)}`;
    return null;
  }
  return user;
}

export async function signUpCustomer(full_name, phone, password) {
  const { error } = await supabase.auth.signUp({
    email: phoneToSyntheticEmail(phone),
    password,
    options: { data: { phone, full_name } },
  });
  if (error) throw new Error(error.message.includes('already') ? 'An account with this number already exists.' : error.message);
}

export async function logInCustomer(phone, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToSyntheticEmail(phone),
    password,
  });
  if (error) throw new Error('Incorrect mobile number or password.');
}

export async function logOut() {
  await supabase.auth.signOut();
}

export async function validateCoupon(code, subtotal) {
  return api('validate-coupon', { method: 'POST', body: JSON.stringify({ code, subtotal }) });
}

export async function placeOrder({ customer_name, phone, street, city, state, pincode, items, coupon_code }) {
  return api('place-order', { method: 'POST', body: JSON.stringify({ customer_name, phone, street, city, state, pincode, items, coupon_code }) });
}

export async function subscribeNewsletter(email) {
  return api('newsletter-subscribe', { method: 'POST', body: JSON.stringify({ email }) });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateCartBadge);
} else {
  updateCartBadge();
}