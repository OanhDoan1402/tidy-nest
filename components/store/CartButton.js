'use client';

import Link from 'next/link';
import { useCart } from './cart';

export default function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="cart-btn" aria-label={`Cart, ${count} items`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h2.5l2.2 11h10.6L20.5 7H6.4" />
        <circle cx="9" cy="19.5" r="1.4" />
        <circle cx="17" cy="19.5" r="1.4" />
      </svg>
      Cart
      <span className="cart-count">{count}</span>
    </Link>
  );
}
