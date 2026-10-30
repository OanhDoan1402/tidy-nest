export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || 'Shopify';
export const DEMO = (process.env.NEXT_PUBLIC_DEMO_MODE || 'true') !== 'false';
export const TZ = process.env.STORE_TIMEZONE || 'America/New_York';
export const COLLECTIONS = ['Kitchen', 'Bed & Bath', 'Storage & Cleaning'];
export const FREE_SHIPPING_MIN = 50;
export const SHIPPING_FEE = 5.99;

export function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function int(n) {
  return Math.round(Number(n || 0)).toLocaleString('en-US');
}

export function dateTime(iso) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'product';
}

export function initials(name) {
  const p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?')[0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
