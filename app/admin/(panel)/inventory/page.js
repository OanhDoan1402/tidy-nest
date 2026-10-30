import Link from 'next/link';
import { db } from '@/lib/supabase/admin';
import { saveInventory } from '@/app/admin/actions';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Inventory({ searchParams }) {
  const view = ['all', 'low', 'out'].includes(searchParams?.view) ? searchParams.view : 'all';
  const supabase = db();
  const [{ data: products = [] }, { data: open = [] }] = await Promise.all([
    supabase.from('products').select('id, title, sku, price, available, image_url, status').neq('status', 'archived').order('title'),
    supabase.from('orders').select('order_items(product_id, quantity)').eq('fulfillment_status', 'unfulfilled'),
  ]);
  const committed = {};
  (open || []).forEach((o) => (o.order_items || []).forEach((i) => { committed[i.product_id] = (committed[i.product_id] || 0) + i.quantity; }));

  const all = products || [];
  const test = { all: () => true, low: (p) => p.available > 0 && p.available < 10, out: (p) => p.available === 0 };
  const list = all.filter(test[view]);
  const units = all.reduce((a, p) => a + p.available, 0);
  const comm = Object.values(committed).reduce((a, b) => a + b, 0);
  const value = all.reduce((a, p) => a + (p.available + (committed[p.id] || 0)) * Number(p.price), 0);

  return (
    <>
      <div className="page-head">
        <h1>Inventory</h1>
        <div className="right"><Link className="btn btn-ghost" href="/admin/products">View products</Link></div>
      </div>
      {searchParams?.saved === '1' && <div role="status" className="success">Inventory saved.</div>}

      <div className="kpis">
        <div className="card kpi"><span className="label">Units available</span><span className="value">{units.toLocaleString('en-US')}</span></div>
        <div className="card kpi"><span className="label">Units committed</span><span className="value">{comm.toLocaleString('en-US')}</span></div>
        <div className="card kpi"><span className="label">Low or out of stock</span><span className="value">{all.filter((p) => p.available < 10).length}</span></div>
        <div className="card kpi"><span className="label">Stock value at retail</span><span className="value">{money(value)}</span></div>
      </div>

      <section className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <nav className="tabs" aria-label="Filter inventory" style={{ display: 'inline-flex' }}>
            {[['all', 'All'], ['low', 'Low stock'], ['out', 'Out of stock']].map(([k, l]) => (
              <Link key={k} href={`/admin/inventory?view=${k}`} className={'tab' + (k === view ? ' tab-on' : '')}>{l} <span className="muted">{all.filter(test[k]).length}</span></Link>
            ))}
          </nav>
        </div>
        <form action={saveInventory}>
          <div className="table-wrap">
            <table className="t" style={{ minWidth: 700 }}>
              <thead><tr><th>Product</th><th>SKU</th><th style={{ textAlign: 'right' }}>Committed</th><th style={{ textAlign: 'right' }}>Available</th><th style={{ textAlign: 'right' }}>On hand</th></tr></thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={5} className="muted">Nothing here.</td></tr>}
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p.image_url && <img src={p.image_url} alt="" className="thumb" />}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontWeight: 600 }}>{p.title}</strong>
                          <span style={{ fontSize: 12, color: p.available < 10 ? 'var(--bad)' : 'var(--muted)' }}>{p.available === 0 ? 'Out of stock' : p.available < 10 ? 'Low stock' : 'In stock'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="muted">{p.sku || 'No SKU'}</td>
                    <td style={{ textAlign: 'right' }} className="muted">{committed[p.id] || 0}</td>
                    <td style={{ textAlign: 'right' }}>
                      <label className="sr" htmlFor={`a-${p.id}`}>Available for {p.title}</label>
                      <input id={`a-${p.id}`} name={`avail_${p.id}`} type="number" min="0" defaultValue={p.available} className="input num" style={{ width: 96, textAlign: 'right' }} />
                    </td>
                    <td style={{ textAlign: 'right' }}>{p.available + (committed[p.id] || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
            <span className="muted" style={{ fontSize: 13, flex: 1 }}>Committed = units in unfulfilled orders. On hand = Available + Committed.</span>
            <button className="btn" type="submit">Save inventory</button>
          </div>
        </form>
      </section>
    </>
  );
}
