import Link from 'next/link';
import { db } from '@/lib/supabase/admin';
import { replyMessage, setConversationStatus } from '@/app/admin/actions';
import AutoRefresh from '@/components/admin/AutoRefresh';
import ReplyBox from '@/components/admin/ReplyBox';
import { initials, timeAgo, dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Inbox({ searchParams }) {
  const filter = searchParams?.f === 'unread' ? 'unread' : searchParams?.f === 'done' ? 'done' : 'open';
  const supabase = db();
  let q = supabase
    .from('conversations')
    .select('id, customer_name, email, status, unread_admin, last_message_at, messages(body, sender, created_at)')
    .order('last_message_at', { ascending: false })
    .order('created_at', { referencedTable: 'messages', ascending: false })
    .limit(1, { referencedTable: 'messages' })
    .limit(100);
  if (filter === 'unread') q = q.eq('unread_admin', true);
  else q = q.eq('status', filter);
  const { data: convs = [] } = await q;

  const selId = searchParams?.c || convs?.[0]?.id;
  let cur = null, msgs = [], lastOrder = null;
  if (selId) {
    const { data } = await supabase.from('conversations').select('*').eq('id', selId).maybeSingle();
    cur = data;
    if (cur) {
      if (cur.unread_admin && searchParams?.c) {
        await supabase.from('conversations').update({ unread_admin: false }).eq('id', cur.id);
      }
      const { data: m } = await supabase.from('messages').select('id, sender, body, created_at').eq('conversation_id', cur.id).order('created_at').limit(300);
      msgs = m || [];
      if (cur.email) {
        const { data: o } = await supabase.from('orders').select('id, number, total, fulfillment_status').eq('email', cur.email).order('created_at', { ascending: false }).limit(1).maybeSingle();
        lastOrder = o;
      }
    }
  }
  const link = (o) => `/admin/inbox?${new URLSearchParams({ f: filter, ...(selId ? { c: selId } : {}), ...o })}`;

  return (
    <>
      <AutoRefresh seconds={8} />
      <div className="page-head"><h1>Inbox</h1></div>
      <section className="card inbox">
        <div className="conv-list">
          <nav className="tabs" aria-label="Filter conversations" style={{ margin: 12 }}>
            {[['open', 'Open'], ['unread', 'Unread'], ['done', 'Done']].map(([k, l]) => (
              <Link key={k} href={`/admin/inbox?f=${k}`} className={'tab' + (k === filter ? ' tab-on' : '')}>{l}</Link>
            ))}
          </nav>
          {(convs || []).length === 0 && <p className="muted" style={{ padding: '0 16px' }}>No conversations yet. Messages from the chat button on your store show up here.</p>}
          {(convs || []).map((c) => {
            const last = c.messages?.[0];
            return (
              <Link key={c.id} href={link({ c: c.id })} className={'conv' + (c.id === selId ? ' conv-on' : '')}>
                <span className="avatar">{initials(c.customer_name)}</span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: c.unread_admin ? 700 : 500 }}>{c.customer_name}</span>
                    <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{timeAgo(c.last_message_at)}</span>
                  </span>
                  <span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {last ? (last.sender === 'admin' ? 'You: ' : '') + last.body : ''}
                  </span>
                </span>
                {c.unread_admin && <span aria-label="Unread" style={{ width: 10, height: 10, borderRadius: 999, background: '#D9822B', marginTop: 6 }} />}
              </Link>
            );
          })}
        </div>

        <div className="thread">
          {!cur ? (
            <p className="muted" style={{ padding: 20 }}>Select a conversation.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: '#fff', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                <span className="avatar">{initials(cur.customer_name)}</span>
                <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column' }}>
                  <strong>{cur.customer_name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{cur.email || 'No email given'} · started {dateTime(cur.created_at)}</span>
                </div>
                {lastOrder && <Link href={`/admin/orders/${lastOrder.id}`} className="pill pill-info">Latest order #{lastOrder.number}</Link>}
                <form action={setConversationStatus}>
                  <input type="hidden" name="conversation_id" value={cur.id} />
                  <input type="hidden" name="status" value={cur.status === 'done' ? 'open' : 'done'} />
                  <button className="btn btn-ghost btn-sm" type="submit">{cur.status === 'done' ? 'Reopen' : 'Mark as done'}</button>
                </form>
              </div>
              <div className="thread-body">
                {msgs.map((m) => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'admin' ? 'flex-end' : 'flex-start' }}>
                    <div className={'bubble ' + (m.sender === 'admin' ? 'b-shop' : 'b-cust')}>{m.body}</div>
                    <span className="muted" style={{ fontSize: 11, margin: '2px 4px 6px' }}>{m.sender === 'admin' ? 'You · ' : ''}{timeAgo(m.created_at)}</span>
                  </div>
                ))}
              </div>
              <ReplyBox conversationId={cur.id} action={replyMessage} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
