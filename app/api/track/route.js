import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/admin';

export async function POST(req) {
  try {
    const b = await req.json();
    const path = String(b.path || '/').slice(0, 200);
    if (path.startsWith('/admin')) return NextResponse.json({ ok: true });
    let ref = '';
    try {
      const host = new URL(req.url).host;
      const r = b.referrer ? new URL(b.referrer) : null;
      ref = r && r.host !== host ? r.host.slice(0, 120) : '';
    } catch {}
    await db().from('page_views').insert({
      session_id: String(b.session_id || 'anon').slice(0, 64),
      path,
      referrer: ref,
      device: ['Mobile', 'Tablet', 'Desktop'].includes(b.device) ? b.device : 'Desktop',
    });
  } catch {}
  return NextResponse.json({ ok: true });
}
