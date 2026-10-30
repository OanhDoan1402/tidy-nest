import Link from 'next/link';
import { db } from '@/lib/supabase/admin';
import { fulfillOrders } from '@/app/admin/actions';
import { PayPill, FulPill } from '@/components/admin/Pills';
import SelectAll from '@/components/admin/SelectAll';
import AutoRefresh from '@/components/admin/AutoRefresh';
import { money, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

const VIEWS = [
  ['all', 'All'],
  ['open', 'Open'],
  ['unfulfilled', 'Unfulfilled'],
  ['unpaid', 'Unpaid'],
  ['paid', 'Paid'],
];

function applyView(query, view) {
  if (view === 'open' || view === 'unfulfilled') return query.eq('fulfillment_status', 'unfulfilled');
  if (view === 'unpaid') return query.eq('payment_status', 'pending').neq('fulfillment_status', 'canceled');
  if (view === 'paid') return query.eq('payment_status', 'paid');
  return query;
}

export default async function Orders({ searchParams }) {
  const view = VIEWS.some(([k]) => k === searchParams?.view) ? searchParams.view : 'all';
  const q = String(searchParams?.q || '').trim();
  const desc = searchParams?.sort !== 'oldest';
  const supabase = db();

  let query = supabase
    .from('orders')
    .select('id, number, customer_name, email, total, payment_status, fulfillment_status, created_at, order_items(quantity)')
    .order('created_at', { ascending: !desc })
    .limit(200);
  query = applyView(query, view);
  if (q) {
    const n = parseInt(q.replace('#', ''), 10);
    query = Number.isFinite(n) ? query.eq('number', n) : query.ilike('customer_name', `%${q.replace(/[%_]/g, '')}%`);
  }
  const { data: orders = [] } = await query;

  const counts = await Promise.all(VIEWS.map(([k]) => applyView(supabase.from('orders').select('id', { count: 'exact', head: true }), k)));
  const link = (o) => `/admin/orders?${new URLSearchParams({ view, q, sort: desc ? 'newest' : 'oldest', ...o })}`;

  return (
    <>
      <AutoRefresh seconds={20} />
      <div className="page-head">
        <h1>Orders</h1>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <nav aria-label="Order views" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 12px', borderBottom: '1px solid var(--line)' }}>
          {VIEWS.map(([k, l], i) => (
            <Link key={k} href={link({ view: k })} aria-current={k === view ? 'page' : undefined}
              style={{ padding: '14px 10px', fontWeight: 600, fontSize: 14, textDecoration: 'none', color: k === view ? 'var(--ink)' : 'var(--ink-2)', borderBottom: k === view ? '2px solid var(--accent)' : '2px solid transparent' }}>
              {l} <span className="muted" style={{ fontWeight: 500 }}>{counts[i].count ?? 0}</span>
            </Link>
          ))}
        </nav>

        <form method="get" action="/admin/orders" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--line-2)' }}>
          <input type="hidden" name="view" value={view} />
          <label className="sr" htmlFor="oq">Search orders</label>
          <input id="oq" name="q" defaultValue={q} className="input" placeholder="Order number or customer name" style={{ flex: '1 1 260px' }} />
          <button className="btn btn-ghost" type="submit">Search</button>
          <Link className="btn btn-ghost" href={link({ sort: desc ? 'oldest' : 'newest' })}>{desc ? 'Newest first' : 'Oldest first'}</Link>
        </form>

        <form id="orders-form" action={fulfillOrders}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 16px', background: '#F8F9F7', borderBottom: '1px solid var(--line-2)' }}>
            <span className="muted" style={{ fontSize: 13 }}>Selected orders:</span>
            <button className="btn btn-sm btn-dark" type="submit">Mark as fulfilled</button>
          </div>
          <div className="table-wrap">
            <table className="t" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ width: 18 }}><SelectAll formId="orders-form" /></th>
                  <th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Fulfillment</th><th>Items</th><th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(orders || []).length === 0 && (
                  <tr><td colSpan={8} className="muted">No orders match this view.</td></tr>
                )}
                {(orders || []).map((o) => {
                  const items = (o.order_items || []).reduce((a, i) => a + i.quantity, 0);
                  return (
                    <tr key={o.id}>
                      <td><input type="checkbox" name="ids" value={o.id} aria-label={`Select order ${o.number}`} style={{ width: 18, height: 18, accentColor: '#1E6B57' }} /></td>
                      <td><Link href={`/admin/orders/${o.id}`} style={{ fontWeight: 700 }}>#{o.number}</Link></td>
                      <td className="muted" style={{ whiteSpace: 'nowrap' }}>{dateTime(o.created_at)}</td>
                      <td>{o.customer_name}</td>
                      <td><PayPill s={o.payment_status} /></td>
                      <td><FulPill s={o.fulfillment_status} /></td>
                      <td className="muted">{items} {items === 1 ? 'item' : 'items'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(o.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      </section>
    </>
  );
}
