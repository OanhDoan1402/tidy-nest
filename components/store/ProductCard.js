import Link from 'next/link';
import AddToCart from './AddToCart';
import { money } from '@/lib/format';

export default function ProductCard({ p }) {
  const sale = p.compare_at && Number(p.compare_at) > Number(p.price);
  return (
    <article className="p-card">
      <Link href={`/products/${p.slug}`} className="p-link">
        <div className="p-img">
          {p.image_url && <img src={p.image_url} alt={p.title} loading="lazy" />}
          {sale && <span className="badge">Sale</span>}
          {p.available < 1 && <span className="badge" style={{ background: '#5B6661' }}>Sold out</span>}
        </div>
        <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{p.collection}</span>
        <h3 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.35 }}>{p.title}</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span className="price num">{money(p.price)}</span>
          {sale && <s className="old num">{money(p.compare_at)}</s>}
        </div>
      </Link>
      <AddToCart product={p} compact />
    </article>
  );
}
