import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const token = new URL(req.url).searchParams.get('token');
  const supabase = db();
  const { data: conv } = await supabase.from('conversations').select('id, token').eq('id', params.id).maybeSingle();
  if (!conv || conv.token !== token) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
  const { data } = await supabase
    .from('messages')
    .select('id, sender, body, created_at')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: true })
    .limit(200);
  return NextResponse.json({ messages: data || [] });
}
