import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/admin';
import { isAdmin } from '@/lib/isAdmin';
import { notify } from '@/lib/push';

export const dynamic = 'force-dynamic';

const DEFAULT_PREFS = { orders: true, updates: false, chats: true, chatMode: 'first', practice: true, quiet: false };

function cleanPrefs(p = {}) {
  return {
    orders: p.orders !== false,
    updates: p.updates === true,
    chats: p.chats !== false,
    chatMode: p.chatMode === 'all' ? 'all' : 'first',
    practice: p.practice !== false,
    quiet: p.quiet === true,
  };
}

export async function GET(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  const endpoint = new URL(req.url).searchParams.get('endpoint');
  if (!endpoint) return NextResponse.json({ subscribed: false, prefs: DEFAULT_PREFS });
  const { data } = await db().from('push_subscriptions').select('id, prefs').eq('endpoint', endpoint).maybeSingle();
  return NextResponse.json({ subscribed: Boolean(data), prefs: data ? cleanPrefs(data.prefs) : DEFAULT_PREFS });
}

export async function POST(req) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const supabase = db();

  if (b.action === 'subscribe') {
    const s = b.subscription || {};
    if (!s.endpoint || !s.keys?.p256dh || !s.keys?.auth) return NextResponse.json({ error: 'Invalid subscription.' }, { status: 400 });
    const { error } = await supabase.from('push_subscriptions').upsert({
      endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth,
      label: String(b.label || 'Device').slice(0, 60), prefs: cleanPrefs(b.prefs),
    }, { onConflict: 'endpoint' });
    if (error) return NextResponse.json({ error: 'Could not save this device.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'prefs') {
    await supabase.from('push_subscriptions').update({ prefs: cleanPrefs(b.prefs) }).eq('endpoint', String(b.endpoint));
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'remove') {
    await supabase.from('push_subscriptions').delete().eq('endpoint', String(b.endpoint));
    return NextResponse.json({ ok: true });
  }

  if (b.action === 'test') {
    const { data } = await supabase.from('push_subscriptions').select('id').eq('endpoint', String(b.endpoint)).maybeSingle();
    if (!data) return NextResponse.json({ error: 'This device is not turned on yet.' }, { status: 400 });
    await notify('test', { title: 'Notifications are on', body: 'This is a test from your store admin.', url: '/admin/settings', only: data.id });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
