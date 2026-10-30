import Link from 'next/link';
import { DEMO } from '@/lib/format';

export const metadata = { title: 'Thank you' };

export default function ThankYou({ searchParams }) {
  const n = String(searchParams?.order || '').replace(/\D/g, '');
  return (
    <div className="wrap" style={{ paddingTop: 40 }}>
      <div className="card" style={{ padding: 28, maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Thanks for your order{n ? ` #${n}` : ''}!</h1>
        <p style={{ margin: 0, color: 'var(--ink-2)' }}>
          {DEMO
            ? 'This is a demo store, so the order is saved for testing only. Nothing will be shipped or charged.'
            : 'We will email you when your order ships.'}
        </p>
        <div><Link className="btn" href="/">Back to the store</Link></div>
      </div>
    </div>
  );
}
