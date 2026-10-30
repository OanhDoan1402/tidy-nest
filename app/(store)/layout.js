import Link from 'next/link';
import Logo from '@/components/Logo';
import CartButton from '@/components/store/CartButton';
import ChatWidget from '@/components/store/ChatWidget';
import Tracker from '@/components/store/Tracker';
import { COLLECTIONS, DEMO, STORE_NAME } from '@/lib/format';

export default function StoreLayout({ children }) {
  return (
    <>
      <div className="topbar">Free US shipping on orders $50+ · 30-day returns</div>
      {DEMO && (
        <div className="demo-bar">Demo store: orders placed here are not shipped and no payment is taken.</div>
      )}
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="brand"><Logo /> {STORE_NAME}</Link>
          <nav className="nav" aria-label="Collections">
            <Link href="/#shop">Shop all</Link>
            {COLLECTIONS.map((c) => (
              <Link key={c} href={`/?c=${encodeURIComponent(c)}#shop`}>{c}</Link>
            ))}
          </nav>
          <CartButton />
        </div>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <div className="wrap">
          <div style={{ flex: '2 1 260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <strong style={{ color: '#fff', fontSize: 18 }}>{STORE_NAME}</strong>
            <span>Everyday home goods.</span>
          </div>
          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <strong style={{ color: '#fff' }}>Help</strong>
            <span>Shipping: free on orders $50+, otherwise $5.99</span>
            <span>Returns within 30 days</span>
          </div>
          <div style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <strong style={{ color: '#fff' }}>Contact</strong>
            <span>[Your support email]</span>
          </div>
        </div>
      </footer>
      <ChatWidget storeName={STORE_NAME} />
      <Tracker />
    </>
  );
}
