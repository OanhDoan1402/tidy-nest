'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveProduct } from '@/app/admin/actions';
import { COLLECTIONS } from '@/lib/format';

function Submit({ label }) {
  const { pending } = useFormStatus();
  return <button className="btn" type="submit" disabled={pending}>{pending ? 'Saving…' : label}</button>;
}

export default function ProductForm({ product, justSaved }) {
  const [state, action] = useFormState(saveProduct, justSaved ? { ok: true } : null);
  const p = product || { status: 'draft', collection: COLLECTIONS[0], available: 0 };

  return (
    <form action={action} className="row" style={{ alignItems: 'flex-start' }}>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <section className="card" style={{ flex: '2 1 420px', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" className="input" defaultValue={p.title || ''} required />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" className="input" rows={5} defaultValue={p.description || ''} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div className="field">
            <label htmlFor="price">Price (USD)</label>
            <input id="price" name="price" className="input" inputMode="decimal" defaultValue={p.price ?? ''} placeholder="24.99" />
          </div>
          <div className="field">
            <label htmlFor="compare_at">Compare-at price</label>
            <input id="compare_at" name="compare_at" className="input" inputMode="decimal" defaultValue={p.compare_at ?? ''} placeholder="Optional" />
          </div>
          <div className="field">
            <label htmlFor="available">Inventory</label>
            <input id="available" name="available" className="input" type="number" min="0" defaultValue={p.available ?? 0} />
          </div>
          <div className="field">
            <label htmlFor="sku">SKU</label>
            <input id="sku" name="sku" className="input" defaultValue={p.sku || ''} />
          </div>
        </div>
        {state?.error && <div role="alert" className="error">{state.error}</div>}
        {state?.ok && <div role="status" className="success">Saved.</div>}
        <div><Submit label={p.id ? 'Save' : 'Create product'} /></div>
      </section>

      <aside className="card" style={{ flex: '1 1 280px', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={p.status}>
            <option value="active">Active (shown in store)</option>
            <option value="draft">Draft (hidden)</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="collection">Collection</label>
          <select id="collection" name="collection" className="input" defaultValue={p.collection}>
            {COLLECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Photo</span>
          {p.image_url && <img src={p.image_url} alt="" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--line)' }} />}
          <label htmlFor="image" className="btn btn-ghost" style={{ cursor: 'pointer' }}>{p.image_url ? 'Replace photo' : 'Upload photo'}</label>
          <input id="image" name="image" type="file" accept="image/*" className="sr" />
          <span className="muted" style={{ fontSize: 12 }}>PNG, JPG or WebP, under 4 MB. Square photos look best.</span>
        </div>
      </aside>
    </form>
  );
}
