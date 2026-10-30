import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase/admin';

const clip = (v, n) => String(v || '').trim().slice(0, n);

async function thread(supabase, id) {
  const { data } = await supabase
    .from('messages')
    .select('id, sender, body, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })
    .limit(200);
  return data || [];
}

export async function POST(req) {
  let b;
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'Bad request.' }, { status: 400 }); }
  const text = clip(b.body, 2000);
  if (!text) return NextResponse.json({ error: 'Type a message first.' }, { status: 400 });
  const supabase = db();

  if (b.action === 'start') {
    const name = clip(b.name, 80);
    if (!name) return NextResponse.json({ error: 'Please add your name.' }, { status: 400 });
    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ customer_name: name, email: clip(b.email, 160) || null })
      .select('id, token')
      .single();
    if (error) return NextResponse.json({ error: 'Could not start the chat.' }, { status: 500 });
    await supabase.from('messages').insert({ conversation_id: conv.id, sender: 'customer', body: text });
    return NextResponse.json({ id: conv.id, token: conv.token, messages: await thread(supabase, conv.id) });
  }

  if (b.action === 'send') {
    const { data: conv } = await supabase
      .from('conversations').select('id, token').eq('id', b.id).maybeSingle();
    if (!conv || conv.token !== b.token) return NextResponse.json({ error: 'Chat not found.' }, { status: 404 });
    await supabase.from('messages').insert({ conversation_id: conv.id, sender: 'customer', body: text });
    await supabase.from('conversations')
      .update({ unread_admin: true, status: 'open', last_message_at: new Date().toISOString() })
      .eq('id', conv.id);
    return NextResponse.json({ messages: await thread(supabase, conv.id) });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
