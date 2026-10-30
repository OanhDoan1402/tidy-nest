'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase/admin';
import { COLLECTIONS, slugify, money } from '@/lib/format';
import { notify } from '@/lib/push';

// ---------- Orders ----------
export async function fulfillOrders(formData) {
  await requireAdmin();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  if (ids.length) {
    const { data } = await db().from('orders').update({ fulfillment_status: 'fulfilled' }).in('id', ids).eq('fulfillment_status', 'unfulfilled').select('number');
    if (data?.length) {
      await notify('update', {
        title: data.length === 1 ? `Order #${data[0].number} fulfilled` : `${data.length} orders fulfilled`,
        body: data.map((o) => '#' + o.number).join(', '),
        url: '/admin/orders', tag: 'update',
      });
    }
  }
  revalidatePath('/admin', 'layout');
}

export async function setOrderStatus(formData) {
  await requireAdmin();
  const id = String(formData.get('id'));
  const action = String(formData.get('action'));
  const supabase = db();
  if (action === 'paid') await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', id);
  if (action === 'fulfilled') await supabase.from('orders').update({ fulfillment_status: 'fulfilled' }).eq('id', id).eq('fulfillment_status', 'unfulfilled');
  if (action === 'cancel') await supabase.rpc('cancel_order', { p_order: id });
  const { data: o } = await supabase.from('orders').select('number, total').eq('id', id).maybeSingle();
  const label = { paid: 'Payment received', fulfilled: 'Marked as fulfilled', cancel: 'Canceled' }[action];
  if (o && label) await notify('update', { title: `Order #${o.number}: ${label}`, body: money(o.total), url: `/admin/orders/${id}`, tag: 'update' });
  revalidatePath('/admin', 'layout');
}

// ---------- Products ----------
function num(v, fallback = null) {
  const n = parseFloat(String(v ?? '').replace(/[$,]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
}

export async function saveProduct(prevState, formData) {
  await requireAdmin();
  const supabase = db();
  const id = String(formData.get('id') || '');
  const title = String(formData.get('title') || '').trim().slice(0, 140);
  const price = num(formData.get('price'));
  if (!title) return { error: 'Add a product title.' };
  if (price === null) return { error: 'Enter a valid price, for example 24.99.' };

  const row = {
    title,
    description: String(formData.get('description') || '').slice(0, 4000),
    collection: COLLECTIONS.includes(formData.get('collection')) ? formData.get('collection') : COLLECTIONS[0],
    price,
    compare_at: num(formData.get('compare_at')),
    sku: String(formData.get('sku') || '').trim().slice(0, 40) || null,
    available: Math.max(0, parseInt(formData.get('available'), 10) || 0),
    status: ['active', 'draft', 'archived'].includes(formData.get('status')) ? formData.get('status') : 'draft',
  };

  const file = formData.get('image');
  if (file && typeof file === 'object' && file.size > 0) {
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(file.type)) return { error: 'Upload a PNG, JPG, WebP, GIF or SVG image.' };
    if (file.size > 4 * 1024 * 1024) return { error: 'Image must be under 4 MB.' };
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
    if (error) return { error: 'Image upload failed. Check that the product-images bucket exists.' };
    row.image_url = supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
  }

  if (id) {
    const { error } = await supabase.from('products').update(row).eq('id', id);
    if (error) return { error: 'Could not save. ' + error.message };
  } else {
    let slug = slugify(title);
    const { data: clash } = await supabase.from('products').select('id').eq('slug', slug).maybeSingle();
    if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await supabase.from('products').insert({ ...row, slug }).select('id').single();
    if (error) return { error: 'Could not create the product. ' + error.message };
    revalidatePath('/admin', 'layout');
    redirect(`/admin/products/${data.id}?saved=1`);
  }
  revalidatePath('/admin', 'layout');
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ---------- Inventory ----------
export async function saveInventory(formData) {
  await requireAdmin();
  const supabase = db();
  const updates = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('avail_')) {
      updates.push({ id: key.slice(6), available: Math.max(0, parseInt(value, 10) || 0) });
    }
  }
  await Promise.all(updates.map((u) => supabase.from('products').update({ available: u.available }).eq('id', u.id)));
  revalidatePath('/admin', 'layout');
  redirect('/admin/inventory?saved=1');
}

// ---------- Inbox ----------
export async function replyMessage(formData) {
  await requireAdmin();
  const id = String(formData.get('conversation_id'));
  const body = String(formData.get('body') || '').trim().slice(0, 2000);
  if (!body) return;
  const supabase = db();
  await supabase.from('messages').insert({ conversation_id: id, sender: 'admin', body });
  await supabase.from('conversations').update({ unread_admin: false, last_message_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/admin', 'layout');
}

export async function setConversationStatus(formData) {
  await requireAdmin();
  const id = String(formData.get('conversation_id'));
  const status = formData.get('status') === 'done' ? 'done' : 'open';
  await db().from('conversations').update({ status, unread_admin: false }).eq('id', id);
  revalidatePath('/admin', 'layout');
}

// ---------- Sample data ----------
export async function removeSampleData() {
  await requireAdmin();
  const supabase = db();
  await supabase.from('page_views').delete().eq('is_sample', true);
  await supabase.from('conversations').delete().eq('is_sample', true);
  await supabase.from('orders').delete().eq('is_sample', true);
  revalidatePath('/admin', 'layout');
}

// ---------- Notification devices ----------
export async function removeDevice(formData) {
  await requireAdmin();
  await db().from('push_subscriptions').delete().eq('id', String(formData.get('id')));
  revalidatePath('/admin/settings');
}

// ---------- Practice mode ----------
export async function startPractice(formData) {
  await requireAdmin();
  const { activeSession } = await import('@/lib/practice');
  const supabase = db();
  if (!(await activeSession(supabase))) {
    const freq = ['low', 'mid', 'high'].includes(formData.get('freq')) ? formData.get('freq') : 'mid';
    const diff = ['easy', 'mixed', 'hard'].includes(formData.get('diff')) ? formData.get('diff') : 'mixed';
    await supabase.from('practice_sessions').insert({ freq, diff, next_at: new Date(Date.now() + 3000).toISOString() });
  }
  revalidatePath('/admin', 'layout');
}

export async function setPracticeState(formData) {
  await requireAdmin();
  const { activeSession, review } = await import('@/lib/practice');
  const supabase = db();
  const s = await activeSession(supabase);
  if (!s) return;
  const action = String(formData.get('action'));
  const now = new Date();
  if (action === 'pause' && s.status === 'running') {
    await supabase.from('practice_sessions').update({ status: 'paused', paused_at: now.toISOString() }).eq('id', s.id);
  }
  if (action === 'resume' && s.status === 'paused') {
    const extra = s.paused_at ? Math.round((now - new Date(s.paused_at)) / 1000) : 0;
    await supabase.from('practice_sessions').update({
      status: 'running', paused_at: null, paused_seconds: (s.paused_seconds || 0) + extra,
      next_at: new Date(now.getTime() + 8000).toISOString(),
    }).eq('id', s.id);
  }
  if (action === 'settings') {
    const freq = ['low', 'mid', 'high'].includes(formData.get('freq')) ? formData.get('freq') : s.freq;
    const diff = ['easy', 'mixed', 'hard'].includes(formData.get('diff')) ? formData.get('diff') : s.diff;
    await supabase.from('practice_sessions').update({ freq, diff }).eq('id', s.id);
  }
  if (action === 'end') {
    const settled = s.status === 'paused' && s.paused_at
      ? { ...s, paused_seconds: (s.paused_seconds || 0) + Math.round((now - new Date(s.paused_at)) / 1000), paused_at: null }
      : s;
    const feedback = await review(settled);
    await supabase.from('practice_sessions').update({ status: 'ended', ended_at: now.toISOString(), feedback }).eq('id', s.id);
    await supabase.from('conversations').update({ unread_admin: false, ai_pending_at: null }).eq('practice_session_id', s.id);
    revalidatePath('/admin', 'layout');
    redirect(`/admin/inbox?feedback=${s.id}`);
  }
  revalidatePath('/admin', 'layout');
}

export async function clearPracticeChats() {
  await requireAdmin();
  const supabase = db();
  await supabase.from('conversations').delete().eq('is_practice', true);
  await supabase.from('practice_sessions').delete().eq('status', 'ended');
  revalidatePath('/admin', 'layout');
  redirect('/admin/inbox');
}

// ---------- Test orders (marked as sample data, no notification) ----------
export async function createTestOrder() {
  await requireAdmin();
  const supabase = db();
  const { data: products } = await supabase.from('products').select('id, available').eq('status', 'active').gt('available', 0);
  if (!products?.length) return;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chosen = [...products].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
  const first = pick(['Emily', 'Jason', 'Sophia', 'Michael', 'Olivia', 'Daniel', 'Hannah', 'Tyler', 'Chloe', 'Ethan']);
  const last = pick(['Carter', 'Miller', 'Nguyen', 'Brooks', 'Reed', 'Kim', 'Scott', 'Lee', 'Adams', 'Turner']);
  const [city, state] = pick([['Austin', 'TX'], ['Columbus', 'OH'], ['Denver', 'CO'], ['Seattle', 'WA'], ['Raleigh', 'NC'], ['Phoenix', 'AZ']]);
  await supabase.rpc('create_order', {
    payload: {
      sample: true,
      note: 'Test order',
      customer: { name: `${first} ${last}`, email: `${first}.${last}@example.com`.toLowerCase(), address1: `${100 + Math.floor(Math.random() * 900)} Test St`, city, state, zip: String(10000 + Math.floor(Math.random() * 89999)) },
      items: chosen.map((p) => ({ product_id: p.id, quantity: 1 })),
    },
  });
  revalidatePath('/admin', 'layout');
}
