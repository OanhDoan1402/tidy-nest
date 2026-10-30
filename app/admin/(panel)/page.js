import Link from 'next/link';
import { db } from '@/lib/supabase/admin';
import { loadPeriod, rangeInfo, summarize, delta } from '@/lib/analytics';
import LineChart from '@/components/admin/LineChart';
import AutoRefresh from '@/components/admin/AutoRefresh';
import { PayPill, FulPill } from '@/components/admin/Pills';
import { DEMO, money, int, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const METRICS = {
  sales: ['Total sales', (t) => money(t.sales), (t) => delta(t.sales, t.psales), 'sales', 'psales', (v) => '$' + Math.round(v)],
  orders: ['Orders', (t) => int(t.orders), (t) => delta(t.orders, t.porders), 'orders', 'porders', (v) => String(Math.round(v * 10) / 10)],
  sessions: ['Sessions', (t) => int(t.sessions), (t) => delta(t.sessions, t.psessions), 'sess', 'psess', (v) => String(Math.round(v))],
};

export default async function AdminHome({ searchParams }) {
  const range = ['today', '7d', '30d'].includes(searchParams?.range) ? searchParams.range : 'today';
  const metric = METRICS[searchParams?.m] ? searchParams.m : 'sales';
  const r = rangeInfo(range);
  const supabase = db();
  const [period, { data: recent = [] }, { data: low = [] }, { count: toFulfill }, { count: unread }] = await Promise.all([
    loadPeriod(r),
    supabase.from('orders').select('id, number, customer_name, total, fulfillment_status, payment_status, created_at').order('created_at', { ascending: false }).limit(6),
    supabase.from('products').select('id, title, available, image_url').eq('status', 'active').lt('available', 10).order('available').limit(5),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('fulfillment_status', 'unfulfilled'),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('unread_admin', true),
  ]);
  const s = summarize(r, period);
  const t = s.totals;
  const m = METRICS[metric];
  const q = (k, v) => `/admin?${new URLSearchParams({ range, m: metric, [k]: v })}`;

  return (
    <>
      <AutoRefresh seconds={30} />
      <div className="page-head">
        <h1>Home</h1>
        {DEMO && <span className="pill pill-warn">Demo store</span>}
        <nav className="tabs right" aria-label="Date range">
          {[['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days']].map(([k, l]) => (
            <Link key={k} href={q('range', k)} className={'tab' + (k === range ? ' tab-on' : '')}>{l}</Link>
          ))}
        </nav>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div role="tablist" aria-label="Metric" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', borderBottom: '1px solid var(--line-2)' }}>
          {Object.entries(METRICS).map(([k, def]) => {
            const d = def[2](t);
            return (
              <Link key={k} href={q('m', k)} role="tab" aria-selected={k === metric}
                style={{ padding: '12px 18px', textDecoration: 'none', color: 'var(--ink)', borderBottom: k === metric ? '3px solid var(--accent)' : '3px solid transparent', background: k === metric ? '#F5F9F7' : 'transparent', display: 'flex', flexDirection: 'column' }}>
                <span className="muted" style={{ fontSize: 13 }}>{def[0]}</span>
                <span style={{ fontSize: 22, fontWeight: 700 }} className="num">{def[1](t)}</span>
                <span className={d.cls} style={{ fontSize: 12, fontWeight: 600 }}>{d.txt}</span>
              </Link>
            );
          })}
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column' }}>
            <span className="muted" style={{ fontSize: 13 }}>Conversion rate</span>
            <span style={{ fontSize: 22, fontWeight: 700 }} className="num">{t.cr.toFixed(2)}%</span>
            <span className={delta(t.cr, t.pcr).cls} style={{ fontSize: 12, fontWeight: 600 }}>{delta(t.cr, t.pcr).txt}</span>
          </div>
        </div>
        <div style={{ padding: 18 }}>
          <LineChart cur={s.series[m[3]]} prev={s.series[m[4]]} labels={r.labels} format={m[5]} curLabel={r.curLabel} prevLabel={r.prevLabel} />
        </div>
      </section>

      <div className="row">
        <section className="card" style={{ flex: '1 1 280px', overflow: 'hidden' }}>
          <Link href="/admin/orders?view=unfulfilled" style={{ display: 'flex', padding: 14, borderBottom: '1px solid var(--line-2)', color: 'var(--ink)', textDecoration: 'none' }}><strong className="num">{toFulfill || 0}</strong>&nbsp;orders to fulfill<span style={{ marginLeft: 'auto' }}>›</span></Link>
          <Link href="/admin/inbox" style={{ display: 'flex', padding: 14, borderBottom: '1px solid var(--line-2)', color: 'var(--ink)', textDecoration: 'none' }}><strong className="num">{unread || 0}</strong>&nbsp;unanswered chats<span style={{ marginLeft: 'auto' }}>›</span></Link>
          <Link href="/admin/inventory" style={{ display: 'flex', padding: 14, color: 'var(--ink)', textDecoration: 'none' }}><strong className="num">{low?.length || 0}</strong>&nbsp;products low on stock<span style={{ marginLeft: 'auto' }}>›</span></Link>
        </section>
        <section className="card" style={{ flex: '1 1 300px', padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="section-title">Low stock</h2>
          {(low || []).length === 0 && <span className="muted">Everything is well stocked.</span>}
          {(low || []).map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {p.image_url && <img src={p.image_url} alt="" className="thumb" />}
              <span style={{ flex: 1 }}>{p.title}</span>
              <span className="pill pill-bad num">{p.available} left</span>
            </div>
          ))}
        </section>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px' }}>
          <h2 className="section-title">Recent orders</h2>
          <Link href="/admin/orders" style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 600 }}>View all</Link>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Fulfillment</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>
              {(recent || []).length === 0 && <tr><td colSpan={6} className="muted">No orders yet. Place a test order from the storefront.</td></tr>}
              {(recent || []).map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`} style={{ fontWeight: 700 }}>#{o.number}</Link></td>
                  <td className="muted">{dateTime(o.created_at)}</td>
                  <td>{o.customer_name}</td>
                  <td><PayPill s={o.payment_status} /></td>
                  <td><FulPill s={o.fulfillment_status} /></td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
