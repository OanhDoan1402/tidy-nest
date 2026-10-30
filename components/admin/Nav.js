'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const I = {
  home: 'M4 11.5 12 5l8 6.5V20h-5v-5H9v5H4z',
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  products: 'm12 3 8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  inventory: 'M3 10 12 4l9 6v10H3zM7 20v-6h10v6M7 17h10',
  inbox: 'M4 5h16v11H9l-5 4z',
  analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
};

const ITEMS = [
  ['/admin', 'Home', 'home'],
  ['/admin/orders', 'Orders', 'orders'],
  ['/admin/products', 'Products', 'products'],
  ['/admin/inventory', 'Inventory', 'inventory'],
  ['/admin/inbox', 'Inbox', 'inbox'],
  ['/admin/analytics', 'Analytics', 'analytics'],
  ['/admin/settings', 'Settings', 'settings'],
];

function Icon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={I[name]} />
    </svg>
  );
}

function isOn(path, href) {
  return href === '/admin' ? path === '/admin' : path.startsWith(href);
}

export function SideNav({ counts }) {
  const path = usePathname();
  return (
    <>
      {ITEMS.map(([href, label, icon]) => (
        <Link key={href} href={href} className={'nav-a' + (isOn(path, href) ? ' nav-on' : '')} aria-current={isOn(path, href) ? 'page' : undefined}>
          <Icon name={icon} />{label}
          {counts[icon] > 0 && <span className="count">{counts[icon]}</span>}
        </Link>
      ))}
    </>
  );
}

export function MobileTabs({ counts }) {
  const path = usePathname();
  const tabs = ITEMS.filter(([, , icon]) => icon !== 'inventory' && icon !== 'settings');
  return (
    <nav className="mobile-tabs" aria-label="Admin sections">
      {tabs.slice(0, 5).map(([href, label, icon]) => (
        <Link key={href} href={href} className={isOn(path, href) ? 'on' : ''} aria-current={isOn(path, href) ? 'page' : undefined}>
          <span style={{ position: 'relative' }}>
            <Icon name={icon} size={22} />
            {counts[icon] > 0 && <span style={{ position: 'absolute', top: -4, right: -8, background: 'var(--sun)', color: 'var(--ink)', borderRadius: 999, fontSize: 10, padding: '0 5px', fontWeight: 700 }}>{counts[icon]}</span>}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
