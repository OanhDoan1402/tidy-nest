'use client';

import { useEffect, useState } from 'react';

const KEY = 'tn-cart';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
  window.dispatchEvent(new Event('cart-change'));
}

export function addItem(p, qty = 1) {
  const items = read();
  const found = items.find((i) => i.id === p.id);
  if (found) {
    found.quantity = Math.min(found.quantity + qty, p.available);
  } else {
    items.push({ id: p.id, slug: p.slug, title: p.title, price: Number(p.price), image_url: p.image_url, max: p.available, quantity: Math.min(qty, p.available) });
  }
  write(items);
}

export function setQty(id, qty) {
  const items = read()
    .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, Math.min(qty, i.max || 99)) } : i))
    .filter((i) => i.quantity > 0);
  write(items);
}

export function clearCart() {
  write([]);
}

export function useCart() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener('cart-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('cart-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const count = items.reduce((a, i) => a + i.quantity, 0);
  const subtotal = items.reduce((a, i) => a + i.quantity * i.price, 0);
  return { items, count, subtotal };
}
