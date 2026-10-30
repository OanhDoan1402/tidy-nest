import Link from 'next/link';
import Logo from '@/components/Logo';
import SignOut from '@/components/admin/SignOut';
import { SideNav, MobileTabs } from '@/components/admin/Nav';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase/admin';
import { removeSampleData } from '@/app/admin/actions';
import { DEMO, STORE_NAME } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }) {
  await requireAdmin();
  const supabase = db();
  const [{ count: openOrders }, { count: unread }, { count: sample }] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('fulfillment_status', 'unfulfilled'),
    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('unread_admin', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('is_sample', true),
  ]);
  const counts = { orders: openOrders || 0, inbox: unread || 0 };

  return (
    <div className="admin">
      <aside className="side" aria-label="Admin menu">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 18px' }}>
          <Logo />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <strong style={{ color: '#fff', fontSize: 17 }}>{STORE_NAME}</strong>
            <span style={{ color: '#9AA6A0', fontSize: 12 }}>{DEMO ? 'Demo store' : 'Store admin'}</span>
          </div>
        </div>
        <SideNav counts={counts} />
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link href="/" target="_blank" className="nav-a" style={{ border: '1px solid #3A4843', justifyContent: 'center' }}>View store ↗</Link>
          <SignOut />
        </div>
      </aside>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="admin-top-mobile">
          <Logo size={30} />
          <strong style={{ flex: 1 }}>{STORE_NAME}</strong>
          <Link href="/admin/inventory" style={{ color: '#C9D1CD', fontSize: 13 }}>Inventory</Link>
          <SignOut style={{ minHeight: 34, padding: '0 10px', fontSize: 13 }} />
        </div>
        <main className="admin-main">
          {sample > 0 && (
            <div role="status" className="notice" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <strong>Sample data</strong>
              <span style={{ flex: 1, minWidth: 220 }}>Numbers on these pages include generated practice orders, visits and chats.</span>
              <form action={removeSampleData}><button className="btn btn-ghost btn-sm" type="submit">Remove sample data</button></form>
            </div>
          )}
          {children}
        </main>
      </div>
      <MobileTabs counts={counts} />
    </div>
  );
}
