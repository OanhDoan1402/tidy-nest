'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase/admin';
import { COLLECTIONS, slugify } from '@/lib/format';

// ---------- Orders ----------
export async function fulfillOrders(formData) {
  await requireAdmin();
  const ids = formData.getAll('ids').map(String).filter(Boolean);
  if (ids.length) {
    await db().from('orders').update({ fulfillment_status: 'fulfilled' }).in('id', ids).eq('fulfillment_status', 'unfulfilled');
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
