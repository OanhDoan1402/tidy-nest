import { db } from '@/lib/supabase/admin';
import { TZ } from '@/lib/format';

const DAY = 86400000;

function parts(d) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(d);
  const o = {};
  f.forEach((p) => { if (p.type !== 'literal') o[p.type] = Number(p.value); });
  return o;
}

function offsetMs(d) {
  const p = parts(d);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - d.getTime();
}

export function startOfDay(d) {
  const p = parts(d);
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - offsetMs(d));
}

const dayLabel = (d) => d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' });

export const RANGES = { today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };

export function rangeInfo(key) {
  const now = new Date();
  const today = startOfDay(now);
  if (key === 'today') {
    return {
      key, now, curStart: today, curEnd: now, prevStart: new Date(today - DAY), prevEnd: new Date(now - DAY),
      buckets: 12, curLabel: 'Today', prevLabel: 'Yesterday',
      labels: ['12 AM', '2 AM', '4 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'],
      bucketOf: (t, start) => Math.min(11, Math.floor(parts(new Date(t)).hour / 2)),
    };
  }
  const n = key === '30d' ? 30 : 7;
  const curStart = new Date(today - (n - 1) * DAY);
  const prevStart = new Date(curStart - n * DAY);
  const labels = Array.from({ length: n }, (_, i) => dayLabel(new Date(curStart.getTime() + i * DAY + DAY / 2)));
  return {
    key, now, curStart, curEnd: now, prevStart, prevEnd: curStart, buckets: n,
    curLabel: `${labels[0]} to ${labels[n - 1]}`,
    prevLabel: `${dayLabel(new Date(prevStart.getTime() + DAY / 2))} to ${dayLabel(new Date(curStart - DAY / 2))}`,
    labels,
    bucketOf: (t, start) => Math.max(0, Math.min(n - 1, Math.floor((t - start) / DAY))),
  };
}

async function fetchAll(build) {
  const out = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error || !data) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

export async function loadPeriod(r) {
  const supabase = db();
  const since = r.prevStart.toISOString();
  const [orders, views] = await Promise.all([
    fetchAll(() => supabase
      .from('orders')
      .select('id, number, created_at, subtotal, shipping, total, payment_status, fulfillment_status, order_items(title, quantity, unit_price, product_id, products(collection, image_url))')
      .gte('created_at', since)
      .order('created_at', { ascending: true })),
    fetchAll(() => supabase
      .from('page_views')
      .select('session_id, path, referrer, device, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })),
  ]);
  return { orders, views };
}

export function summarize(r, { orders, views }) {
  const inCur = (iso) => { const t = new Date(iso).getTime(); return t >= r.curStart && t <= r.curEnd; };
  const inPrev = (iso) => { const t = new Date(iso).getTime(); return t >= r.prevStart && t < r.prevEnd; };
  const live = (o) => o.fulfillment_status !== 'canceled';

  const z = () => Array(r.buckets).fill(0);
  const s = { sales: z(), psales: z(), orders: z(), porders: z(), sess: z(), psess: z() };
  const cur = orders.filter((o) => inCur(o.created_at) && live(o));
  const prev = orders.filter((o) => inPrev(o.created_at) && live(o));
  cur.forEach((o) => { const i = r.bucketOf(new Date(o.created_at).getTime(), r.curStart); s.sales[i] += Number(o.total); s.orders[i] += 1; });
  prev.forEach((o) => { const i = r.bucketOf(new Date(o.created_at).getTime(), r.prevStart); s.psales[i] += Number(o.total); s.porders[i] += 1; });

  const sessions = (list, start) => {
    const map = new Map();
    list.forEach((v) => {
      if (!map.has(v.session_id)) map.set(v.session_id, { first: v, paths: new Set() });
      map.get(v.session_id).paths.add(v.path);
    });
    return map;
  };
  const curViews = views.filter((v) => inCur(v.created_at));
  const prevViews = views.filter((v) => inPrev(v.created_at));
  const curS = sessions(curViews);
  const prevS = sessions(prevViews);
  curS.forEach((x) => { s.sess[r.bucketOf(new Date(x.first.created_at).getTime(), r.curStart)] += 1; });
  prevS.forEach((x) => { s.psess[r.bucketOf(new Date(x.first.created_at).getTime(), r.prevStart)] += 1; });

  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const totals = {
    sales: sum(s.sales), psales: sum(s.psales), orders: cur.length, porders: prev.length,
    sessions: curS.size, psessions: prevS.size,
  };
  totals.aov = totals.orders ? totals.sales / totals.orders : 0;
  totals.paov = totals.porders ? totals.psales / totals.porders : 0;
  totals.cr = totals.sessions ? (totals.orders / totals.sessions) * 100 : 0;
  totals.pcr = totals.psessions ? (totals.porders / totals.psessions) * 100 : 0;

  // Funnel from visited pages
  let cart = 0, checkout = 0;
  curS.forEach((x) => {
    if (x.paths.has('/cart') || x.paths.has('/checkout')) cart += 1;
    if (x.paths.has('/checkout')) checkout += 1;
  });

  // Breakdowns
  const tally = (pairs) => {
    const m = new Map();
    pairs.forEach(([k, v, extra]) => { const e = m.get(k) || { name: k, value: 0, extra }; e.value += v; m.set(k, e); });
    return [...m.values()].sort((a, b) => b.value - a.value);
  };
  const items = cur.flatMap((o) => o.order_items || []);
  const topProducts = tally(items.map((i) => [i.title, i.quantity, i.products?.image_url])).slice(0, 5);
  const byCollection = tally(items.map((i) => [i.products?.collection || 'Other', i.quantity * Number(i.unit_price)]));
  const byDevice = tally([...curS.values()].map((x) => [x.first.device || 'Desktop', 1]));
  const bySource = tally([...curS.values()].map((x) => [sourceName(x.first.referrer), 1])).slice(0, 6);
  const landing = tally([...curS.values()].map((x) => [x.first.path, 1])).slice(0, 6);

  const allCur = orders.filter((o) => inCur(o.created_at));
  const gross = allCur.reduce((a, o) => a + Number(o.subtotal), 0);
  const shipping = allCur.reduce((a, o) => a + Number(o.shipping), 0);
  const returns = allCur.filter((o) => !live(o)).reduce((a, o) => a + Number(o.total), 0);

  return {
    series: s, totals,
    funnel: { sessions: totals.sessions, cart, checkout, purchased: totals.orders },
    topProducts, byCollection, byDevice, bySource, landing,
    breakdown: { gross, shipping, returns, total: gross + shipping - returns },
  };
}

function sourceName(ref) {
  if (!ref) return 'Direct';
  const h = ref.toLowerCase();
  if (/google|bing|duckduckgo|yahoo/.test(h)) return 'Search';
  if (/facebook|fb\.|instagram|pinterest|tiktok|t\.co|twitter|x\.com|reddit/.test(h)) return 'Social';
  if (/mail/.test(h)) return 'Email';
  return 'Referral · ' + h.replace(/^www\./, '');
}

export function delta(a, b) {
  if (!b) return { txt: a ? 'new' : '—', cls: 'muted' };
  const p = ((a - b) / b) * 100;
  return { txt: (p > 0 ? '↑ ' : p < 0 ? '↓ ' : '') + Math.abs(p).toFixed(1) + '%', cls: p > 0 ? 'up' : p < 0 ? 'down' : 'muted' };
}
