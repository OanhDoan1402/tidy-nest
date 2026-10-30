'use client';

import Link from 'next/link';
import { setQty, useCart } from '@/components/store/cart';
import { FREE_SHIPPING_MIN, SHIPPING_FEE, money } from '@/lib/format';

export default function CartPage() {
  const { items, subtotal } = useCart();
  const shipping = subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : SHIPPING_FEE;

  return (
    <div className="wrap" style={{ paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>Your cart</h1>
      {items.length === 0 ? (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <span>Your cart is empty.</span>
          <Link className="btn" href="/#shop">Continue shopping</Link>
        </div>
      ) : (
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: '2 1 420px', overflow: 'hidden' }}>
            {items.map((i) => (
              <div key={i.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14, borderBottom: '1px solid var(--line-2)' }}>
                <img src={i.image_url} alt="" className="thumb" style={{ width: 64, height: 64 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <Link href={`/products/${i.slug}`} style={{ color: 'var(--ink)', fontWeight: 600, textDecoration: 'none' }}>{i.title}</Link>
                  <span className="muted num">{money(i.price)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" type="button" aria-label={`Decrease ${i.title}`} onClick={() => setQty(i.id, i.quantity - 1)}>−</button>
                  <span className="num" style={{ minWidth: 24, textAlign: 'center' }}>{i.quantity}</span>
                  <button className="btn btn-ghost btn-sm" type="button" aria-label={`Increase ${i.title}`} onClick={() => setQty(i.id, i.quantity + 1)} disabled={i.quantity >= i.max}>+</button>
                </div>
                <strong className="num" style={{ minWidth: 80, textAlign: 'right' }}>{money(i.price * i.quantity)}</strong>
              </div>
            ))}
          </div>
          <div className="card" style={{ flex: '1 1 280px', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span className="num">{money(subtotal)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><span className="num">{shipping ? money(shipping) : 'Free'}</span></div>
            {shipping > 0 && (
              <span className="muted" style={{ fontSize: 13 }}>Add {money(FREE_SHIPPING_MIN - subtotal)} more for free shipping.</span>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
              <span>Total</span><span className="num">{money(subtotal + shipping)}</span>
            </div>
            <Link className="btn" href="/checkout">Check out</Link>
          </div>
        </div>
      )}
    </div>
  );
}
