import Link from 'next/link';
import { db } from '@/lib/supabase/admin';
import ProductCard from '@/components/store/ProductCard';
import { COLLECTIONS } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const current = COLLECTIONS.includes(searchParams?.c) ? searchParams.c : 'All';
  const { data: products = [] } = await db()
    .from('products')
    .select('id, slug, title, collection, price, compare_at, available, image_url')
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  const list = (products || []).filter((p) => current === 'All' || p.collection === current);
  const hero = (products || [])[0];

  return (
    <div className="wrap">
      <section className="hero">
        <div className="hero-text">
          <span className="pill pill-ok" style={{ alignSelf: 'flex-start' }}>New for fall</span>
          <h1>Small things that keep <span style={{ color: 'var(--accent)' }}>your home tidy</span>.</h1>
          <p style={{ margin: 0, color: 'var(--ink-2)', fontSize: 17, maxWidth: '46ch' }}>
            Containers, racks, lights and everyday tools for the kitchen, bedroom and bath.
          </p>
          <div><Link className="btn" href="#shop">Shop now</Link></div>
        </div>
        {hero?.image_url && (
          <div className="hero-img"><img src={hero.image_url} alt={hero.title} /></div>
        )}
      </section>

      <section id="shop" style={{ paddingTop: 36, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 26, fontWeight: 700 }}>
            {current === 'All' ? 'Shop all' : current} <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>{list.length} products</span>
          </h2>
          <nav className="chips" aria-label="Filter by collection">
            {['All', ...COLLECTIONS].map((c) => (
              <Link key={c} className={'chip' + (c === current ? ' chip-on' : '')} aria-current={c === current ? 'true' : undefined}
                href={c === 'All' ? '/#shop' : `/?c=${encodeURIComponent(c)}#shop`}>{c}</Link>
            ))}
          </nav>
        </div>
        {list.length === 0 ? (
          <p className="muted">No products here yet.</p>
        ) : (
          <div className="grid">
            {list.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
