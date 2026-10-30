import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Called once a day by Vercel Cron (see vercel.json) so the free Supabase project stays active.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { count, error } = await db().from('products').select('id', { count: 'exact', head: true });
  return NextResponse.json({ ok: !error, products: count ?? 0 });
}
