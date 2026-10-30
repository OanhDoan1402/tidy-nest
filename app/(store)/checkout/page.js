'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearCart, useCart } from '@/components/store/cart';
import { DEMO, FREE_SHIPPING_MIN, SHIPPING_FEE, money } from '@/lib/format';

const FIELDS = [
  ['name', 'Full name', 'text', 'name'],
  ['email', 'Email', 'email', 'email'],
  ['phone', 'Phone (optional)', 'tel', 'tel'],
  ['address1', 'Street address', 'text', 'address-line1'],
  ['city', 'City', 'text', 'address-level2'],
  ['state', 'State', 'text', 'address-level1'],
  ['zip', 'ZIP code', 'text', 'postal-code'],
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal } = useCart();
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const shipping = subtotal >= FREE_SHIPPING_MIN || subtotal === 0 ? 0 : SHIPPING_FEE;

  async function submit(e) {
    e.preventDefault();
    setErr('');
    for (const [key, label] of FIELDS) {
      if (key !== 'phone' && !String(form[key] || '').trim()) { setErr(`Please fill in: ${label}.`); return; }
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) { setErr('Please enter a valid email.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: form, note: form.note || '', items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })) }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not place the order.');
      clearCart();
      router.push(`/thank-you?order=${d.number}`);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="wrap" style={{ paddingTop: 28 }}>
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <span>Your cart is empty.</span>
          <Link className="btn" href="/#shop">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap" style={{ paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>Checkout</h1>
      {DEMO && <div className="notice">This is a demo store. Your order is saved for testing, but nothing is shipped and no payment is taken.</div>}
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <form onSubmit={submit} className="card" style={{ flex: '2 1 420px', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }} noValidate>
          {FIELDS.map(([key, label, type, ac]) => (
            <div className="field" key={key} style={key === 'address1' ? { gridColumn: '1 / -1' } : undefined}>
              <label htmlFor={`f-${key}`}>{label}</label>
              <input id={`f-${key}`} className="input" type={type} autoComplete={ac} value={form[key] || ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="f-note">Order note (optional)</label>
            <textarea id="f-note" className="input" value={form.note || ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          {err && <div role="alert" className="error" style={{ gridColumn: '1 / -1' }}>{err}</div>}
          <button className="btn" type="submit" disabled={busy} style={{ gridColumn: '1 / -1' }}>
            {busy ? 'Placing order…' : `Place order · ${money(subtotal + shipping)}`}
          </button>
        </form>
        <aside className="card" style={{ flex: '1 1 280px', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((i) => (
            <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <img src={i.image_url} alt="" className="thumb" />
              <span style={{ flex: 1, fontSize: 14 }}>{i.title} × {i.quantity}</span>
              <span className="num">{money(i.price * i.quantity)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>Shipping</span><span className="num">{shipping ? money(shipping) : 'Free'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}><span>Total</span><span className="num">{money(subtotal + shipping)}</span></div>
        </aside>
      </div>
    </div>
  );
}
