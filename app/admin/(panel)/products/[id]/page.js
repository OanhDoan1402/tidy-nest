import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/supabase/admin';
import ProductForm from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

export default async function EditProduct({ params, searchParams }) {
  const { data: p } = await db().from('products').select('*').eq('id', params.id).maybeSingle();
  if (!p) notFound();
  return (
    <>
      <Link href="/admin/products" className="muted" style={{ fontSize: 14 }}>← Products</Link>
      <div className="page-head">
        <h1>{p.title}</h1>
        {p.status === 'active' && <div className="right"><Link className="btn btn-ghost" href={`/products/${p.slug}`} target="_blank">View in store ↗</Link></div>}
      </div>
      <ProductForm key={p.id} product={p} justSaved={searchParams?.saved === '1'} />
    </>
  );
}
