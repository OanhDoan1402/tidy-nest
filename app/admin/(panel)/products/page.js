import Link from 'next/link';
import { db } from '@/lib/supabase/admin';
import { COLLECTIONS, money } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATUSES = ['all', 'active', 'draft', 'archived'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);

export default async function Products({ searchParams }) {
  const status = STATUSES.includes(searchParams?.status) ? searchParams.status : 'all';
  const coll = COLLECTIONS.includes(searchParams?.c) ? searchParams.c : '';
  const q = String(searchParams?.q || '').trim().toLowerCase();
  const { data: all = [] } = await db()
    .from('products')
    .select('id, title, sku, collection, price, available, status, image_url')
    .order('created_at', { ascending: true });

  const list = (all || []).filter((p) =>
    (status === 'all' || p.status === status) && (!coll || p.collection === coll) &&
    (!q || p.title.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)));
  const count = (s) => (all || []).filter((p) => s === 'all' || p.status === s).length;
  const link = (o) => `/admin/products?${new URLSearchParams({ status, c: coll, q, ...o })}`;

  return (
    <>
      <div className="page-head">
        <h1>Products</h1>
        <div className="right"><Link className="btn" href="/admin/products/new">Add product</Link></div>
      </div>
      <section className="card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <nav className="tabs" aria-label="Filter by status">
            {STATUSES.map((s) => (
              <Link key={s} href={link({ status: s })} className={'tab' + (s === status ? ' tab-on' : '')}>{cap(s)} <span className="muted">{count(s)}</span></Link>
            ))}
          </nav>
          <form method="get" action="/admin/products" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input type="hidden" name="status" value={status} />
            <label className="sr" htmlFor="pc">Collection</label>
            <select id="pc" name="c" defaultValue={coll} className="input" style={{ width: 'auto' }}>
              <option value="">All collections</option>
              {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="sr" htmlFor="pq">Search</label>
            <input id="pq" name="q" defaultValue={q} className="input" placeholder="Search products" style={{ width: 200 }} />
            <button className="btn btn-ghost" type="submit">Apply</button>
          </form>
        </div>
        <div className="table-wrap">
          <table className="t" style={{ minWidth: 720 }}>
            <thead><tr><th>Product</th><th>Status</th><th>Inventory</th><th>Collection</th><th style={{ textAlign: 'right' }}>Price</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={5} className="muted">No products match.</td></tr>}
              {list.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--ink)', textDecoration: 'none' }}>
                      {p.image_url ? <img src={p.image_url} alt="" className="thumb" /> : <span className="thumb" />}
                      <span style={{ display: 'flex', flexDirection: 'column' }}>
                        <strong style={{ fontWeight: 600 }}>{p.title}</strong>
                        <span className="muted" style={{ fontSize: 12 }}>{p.sku || 'No SKU'}</span>
                      </span>
                    </Link>
                  </td>
                  <td><span className={'pill ' + (p.status === 'active' ? 'pill-ok' : p.status === 'draft' ? 'pill-info' : 'pill-mute')}>{cap(p.status)}</span></td>
                  <td style={{ color: p.available < 10 ? 'var(--bad)' : 'var(--ink-2)', fontWeight: p.available < 10 ? 600 : 400 }}>
                    {p.available === 0 ? 'Out of stock' : `${p.available} in stock`}
                  </td>
                  <td className="muted">{p.collection}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{money(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
