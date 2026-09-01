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

export const DEFAULT_BANNERS = [
  {
    id: 'default-1',
    eyebrow: 'HANDMADE IN INDIA 🌸',
    title: 'Loop in a little <em>love</em> today.',
    subtitle: 'Handcrafted, customizable accessories & heartfelt gifts — scrunchies, charms, bouquets & hampers.',
    image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=1600&auto=format&fit=crop',
    cta_text: 'Shop the Collection',
    cta_url: '#shop',
    sort_order: 1,
    active: true
  },
  {
    id: 'default-2',
    eyebrow: 'EVERLASTING BLOOMS 🌷',
    title: 'Handmade Crochet Flowers & Bouquets',
    subtitle: 'Flowers that never wilt. Crafted with premium soft yarn with personalized note cards.',
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1600&auto=format&fit=crop',
    cta_text: 'Explore Bouquets',
    cta_url: '#shop',
    sort_order: 2,
    active: true
  },
  {
    id: 'default-3',
    eyebrow: 'BESPOKE GIFTING 🎁',
    title: 'Curated Celebration Gift Hampers',
    subtitle: 'Thoughtful custom combos made for birthdays, anniversaries, and personal milestones.',
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1600&auto=format&fit=crop',
    cta_text: 'View Gift Combos',
    cta_url: '#combos',
    sort_order: 3,
    active: true
  }
];

export const DEFAULT_PRODUCTS = [
  {
    id: 'p1',
    name: 'Crochet Sunflower Everlasting Bouquet',
    description: 'A radiant handmade sunflower bloom paired with baby’s breath. Crafted with hypoallergenic milk cotton yarn.',
    price: 699,
    discount_percent: 20,
    stock: 12,
    image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800&auto=format&fit=crop',
    category: 'Crochet & Flowers',
    active: true
  },
  {
    id: 'p2',
    name: 'Luxury Mulberry Silk Scrunchies (Pack of 3)',
    description: 'Ultra-gentle silk scrunchies that prevent hair breakage and frizz. Includes champagne, blush pink, and mocha.',
    price: 399,
    discount_percent: 15,
    stock: 24,
    image_url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=800&auto=format&fit=crop',
    category: 'Scrunchies',
    active: true
  },
  {
    id: 'p3',
    name: 'Custom Initial Freshwater Pearl Charm Bracelet',
    description: 'Real freshwater pearls with a custom 18k gold-plated brass initial charm. Tarnish resistant.',
    price: 499,
    discount_percent: 20,
    stock: 8,
    image_url: 'https://images.unsplash.com/photo-1611591475155-4286fa7c2e60?q=80&w=800&auto=format&fit=crop',
    category: 'Bracelets',
    active: true
  },
  {
    id: 'p4',
    name: 'Handcrafted Strawberry & Daisy Plush Keychain',
    description: 'Charming crochet strawberry keychain with delicate daisy blossom and golden clasp.',
    price: 299,
    discount_percent: 10,
    stock: 15,
    image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800&auto=format&fit=crop',
    category: 'Keychains',
    active: true
  },
  {
    id: 'p5',
    name: '"With Love" Deluxe Birthday Gift Hamper',
    description: 'Includes a crochet mini bouquet, 2 silk scrunchies, a customized initial keychain, and a handwritten note.',
    price: 1499,
    discount_percent: 25,
    stock: 5,
    image_url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=800&auto=format&fit=crop',
    category: 'Gift Hampers',
    active: true
  },
  {
    id: 'p6',
    name: 'Pastel Lavender Tulip Potted Bloom',
    description: 'Cute miniature potted crochet tulip for study desks, workspaces, and car dashboards.',
    price: 549,
    discount_percent: 10,
    stock: 10,
    image_url: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?q=80&w=800&auto=format&fit=crop',
    category: 'Crochet & Flowers',
    active: true
  },
  {
    id: 'p7',
    name: 'Celestial Beaded Charm Anklet / Bracelet',
    description: 'Dainty glass seed beads with sparkling golden star and crescent moon pendants.',
    price: 349,
    discount_percent: 15,
    stock: 18,
    image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=800&auto=format&fit=crop',
    category: 'Bracelets',
    active: true
  },
  {
    id: 'p8',
    name: 'French Velvet Ribbon Hair Bow Barrette',
    description: 'Classic oversized velvet ribbon bow with a secure French barrette clip. Adds instant vintage elegance.',
    price: 249,
    discount_percent: 20,
    stock: 20,
    image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=800&auto=format&fit=crop',
    category: 'Accessories',
    active: true
  }
];

export function effectivePrice(product) {
  const pct = product.discount_percent || 0;
  return Math.round(product.price * (1 - pct / 100) * 100) / 100;
}

export function formatPrice(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0 });
}

export async function fetchProducts() {
  try {
    const data = await api('products');
    if (data && Array.isArray(data.products) && data.products.length > 0) {
      return data.products;
    }
  } catch (e) {
    console.warn('API fetchProducts fallback to starter data:', e);
  }
  return DEFAULT_PRODUCTS;
}

export async function fetchProduct(id) {
  try {
    const data = await api(`products?id=${encodeURIComponent(id)}`);
    if (data?.product) return data.product;
  } catch (e) {
    console.warn('API fetchProduct fallback:', e);
  }
  const fallback = DEFAULT_PRODUCTS.find(p => p.id === id);
  if (fallback) return fallback;
  throw new Error('Product not found');
}

export async function fetchProductsByIds(ids) {
  if (ids.length === 0) return [];
  try {
    const data = await api(`products?ids=${ids.map(encodeURIComponent).join(',')}`);
    if (data && Array.isArray(data.products) && data.products.length > 0) {
      return data.products;
    }
  } catch (e) {
    console.warn('API fetchProductsByIds fallback:', e);
  }
  return DEFAULT_PRODUCTS.filter(p => ids.includes(p.id));
}

export async function fetchBanners() {
  try {
    const data = await api('banners');
    const list = Array.isArray(data) ? data : (data?.banners || []);
    const valid = list.filter(b => b && b.image_url);
    if (valid.length > 0) return valid;
  } catch (e) {
    console.warn('API fetchBanners fallback to starter banners:', e);
  }
  return DEFAULT_BANNERS;
}

export async function fetchSettings() {
  try {
    const data = await api('settings');
    return data.settings || {};
  } catch {
    return {
      announcement_text: 'Cash on Delivery Available · Free Shipping on orders over ₹1,999 · Pan-India Delivery',
      whatsapp_number: '919876543210',
      block_orders: 'false'
    };
  }
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
  
  const messages = [
    '🌸 100% Handmade with Love & Care',
    '📦 Cash on Delivery Available Pan-India',
    '🚚 Free Express Shipping on Orders Above ₹1,999',
    '💌 Customization Available on All Accessories'
  ];

  let currentIdx = 0;
  el.innerHTML = `<span class="announce-text">${messages[0]}</span>`;

  setInterval(() => {
    currentIdx = (currentIdx + 1) % messages.length;
    el.style.opacity = '0';
    setTimeout(() => {
      el.innerHTML = `<span class="announce-text">${messages[currentIdx]}</span>`;
      el.style.opacity = '1';
    }, 300);
  }, 4000);
}

export function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const closeBtn = document.getElementById('drawer-close-btn');

  if (!toggleBtn || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

export function initWhatsAppWidget(phone = '919876543210') {
  if (document.getElementById('floating-whatsapp')) return;
  const num = String(phone).replace(/\D/g, '') || '919876543210';
  const btn = document.createElement('a');
  btn.id = 'floating-whatsapp';
  btn.className = 'floating-whatsapp';
  btn.href = `https://wa.me/${num}?text=${encodeURIComponent('Hi Loops of Love! I have a question about my order/customization.')}`;
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.setAttribute('aria-label', 'Chat with us on WhatsApp');
  btn.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z"/>
    </svg>
    <span class="whatsapp-badge">Chat with us</span>
  `;
  document.body.appendChild(btn);
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
  document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    initMobileMenu();
    initWhatsAppWidget();
  });
} else {
  updateCartBadge();
  initMobileMenu();
  initWhatsAppWidget();
}