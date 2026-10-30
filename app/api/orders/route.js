import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/admin';

const clip = (v, n) => String(v || '').trim().slice(0, n);

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }

  const c = body.customer || {};
  const customer = {
    name: clip(c.name, 120), email: clip(c.email, 160), phone: clip(c.phone, 40),
    address1: clip(c.address1, 200), city: clip(c.city, 80), state: clip(c.state, 40), zip: clip(c.zip, 20),
  };
  for (const k of ['name', 'email', 'address1', 'city', 'state', 'zip']) {
    if (!customer[k]) return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }
  const items = (Array.isArray(body.items) ? body.items : [])
    .slice(0, 50)
    .map((i) => ({ product_id: String(i.product_id), quantity: Math.max(1, Math.min(99, parseInt(i.quantity, 10) || 1)) }));
  if (!items.length) return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });

  const { data, error } = await db().rpc('create_order', {
    payload: { customer, items, note: clip(body.note, 500) },
  });
  if (error) {
    const msg = /left of|no longer available|empty/.test(error.message) ? error.message : 'Could not place the order. Please try again.';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json(data);
}
