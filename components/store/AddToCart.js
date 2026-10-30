'use client';

import { useState } from 'react';
import { addItem } from './cart';

export default function AddToCart({ product, compact = false }) {
  const [done, setDone] = useState(false);
  const soldOut = product.available < 1;

  function add() {
    addItem(product, 1);
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }

  return (
    <button
      type="button"
      className={compact ? 'btn btn-ghost' : 'btn'}
      onClick={add}
      disabled={soldOut}
      style={compact ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
    >
      {soldOut ? 'Sold out' : done ? 'Added' : 'Add to cart'}
    </button>
  );
}
