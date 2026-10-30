import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/admin';
import { setOrderStatus } from '@/app/admin/actions';
import { PayPill, FulPill } from '@/components/admin/Pills';
import { money, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrderDetail({ params }) {
  const { data: o } = await db()
    .from('orders')
    .select('*, order_items(id, title, unit_price, quantity, products(image_url, slug))')
    .eq('id', params.id)
    .maybeSingle();
  if (!o) notFound();

  const Btn = ({ action, children, dark }) => (
    <form action={setOrderStatus}>
      <input type="hidden" name="id" value={o.id} />
      <input type="hidden" name="action" value={action} />
      <button className={'btn ' + (dark ? 'btn-dark' : 'btn-ghost')} type="submit">{children}</button>
    </form>
  );

  return (
    <>
      <Link href="/admin/orders" className="muted" style={{ fontSize: 14 }}>← Orders</Link>
      <div className="page-head">
        <h1>Order #{o.number}</h1>
        <PayPill s={o.payment_status} />
        <FulPill s={o.fulfillment_status} />
        <div className="right">
          {o.payment_status === 'pending' && o.fulfillment_status !== 'canceled' && <Btn action="paid">Mark as paid</Btn>}
          {o.fulfillment_status === 'unfulfilled' && <Btn action="cancel">Cancel order</Btn>}
          {o.fulfillment_status === 'unfulfilled' && <Btn action="fulfilled" dark>Mark as fulfilled</Btn>}
        </div>
      </div>
      <span className="muted">{dateTime(o.created_at)}</span>

      <div className="row" style={{ alignItems: 'flex-start' }}>
        <section className="card" style={{ flex: '2 1 420px', overflow: 'hidden' }}>
          {(o.order_items || []).map((i) => (
            <div key={i.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 14, borderBottom: '1px solid var(--line-2)' }}>
              {i.products?.image_url && <img src={i.products.image_url} alt="" className="thumb" />}
              <span style={{ flex: 1 }}>{i.title}</span>
              <span className="muted num">{money(i.unit_price)} × {i.quantity}</span>
              <strong className="num" style={{ minWidth: 80, textAlign: 'right' }}>{money(i.unit_price * i.quantity)}</strong>
            </div>
          ))}
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }} className="num">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><span>{Number(o.shipping) ? money(o.shipping) : 'Free'}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Total</span><span>{money(o.total)}</span></div>
          </div>
        </section>
        <aside className="card" style={{ flex: '1 1 260px', padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 className="section-title">Customer</h2>
          <span>{o.customer_name}</span>
          <a href={`mailto:${o.email}`}>{o.email}</a>
          {o.phone && <span>{o.phone}</span>}
          <h2 className="section-title" style={{ marginTop: 10 }}>Ship to</h2>
          <span>{o.address1}</span>
          <span>{o.city}, {o.state} {o.zip}</span>
          {o.note && (<><h2 className="section-title" style={{ marginTop: 10 }}>Note</h2><span style={{ whiteSpace: 'pre-wrap' }}>{o.note}</span></>)}
        </aside>
      </div>
    </>
  );
}
