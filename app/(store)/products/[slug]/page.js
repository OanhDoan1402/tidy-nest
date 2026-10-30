import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/admin';
import AddToCart from '@/components/store/AddToCart';
import { money } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }) {
  const { data: p } = await db()
    .from('products')
    .select('id, slug, title, description, collection, price, compare_at, available, image_url, status')
    .eq('slug', params.slug)
    .maybeSingle();
  if (!p || p.status !== 'active') notFound();
  const sale = p.compare_at && Number(p.compare_at) > Number(p.price);

  return (
    <div className="wrap" style={{ paddingTop: 24 }}>
      <Link href={`/?c=${encodeURIComponent(p.collection)}#shop`} className="muted" style={{ fontSize: 14 }}>← {p.collection}</Link>
      <div className="row" style={{ marginTop: 14, alignItems: 'flex-start', gap: 32 }}>
        <div className="p-img" style={{ flex: '1 1 340px', maxWidth: 560, borderRadius: 20 }}>
          {p.image_url && <img src={p.image_url} alt={p.title} />}
        </div>
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>{p.title}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span className="price num" style={{ fontSize: 24 }}>{money(p.price)}</span>
            {sale && <s className="old num" style={{ fontSize: 16 }}>{money(p.compare_at)}</s>}
          </div>
          <span className={p.available < 10 ? 'pill pill-warn' : 'pill pill-ok'} style={{ alignSelf: 'flex-start' }}>
            {p.available < 1 ? 'Sold out' : p.available < 10 ? `Only ${p.available} left` : 'In stock'}
          </span>
          <p style={{ margin: 0, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', maxWidth: '60ch' }}>{p.description}</p>
          <div style={{ maxWidth: 320 }}><AddToCart product={p} /></div>
          <span className="muted" style={{ fontSize: 13 }}>Free US shipping on orders $50+. 30-day returns.</span>
        </div>
      </div>
    </div>
  );
}
