import { db } from '@/lib/supabase/admin';
import { pushReady, newVapidKeys } from '@/lib/push';
import { removeDevice } from '@/app/admin/actions';
import NotificationSettings from '@/components/admin/NotificationSettings';
import { dateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const ready = pushReady();
  const keys = ready ? null : newVapidKeys();
  const { data: devices = [] } = ready
    ? await db().from('push_subscriptions').select('id, label, created_at').order('created_at')
    : { data: [] };
  const aiReady = Boolean(process.env.GEMINI_API_KEY);

  return (
    <>
      <div className="page-head"><h1>Settings</h1></div>

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="section-title">Notifications</h2>
        {!ready ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="notice">
              One-time setup: notifications need two keys. Add the lines below in Vercel →
              Settings → Environment Variables, then Redeploy. Copy them now: a new pair is shown each time this page loads,
              and any one pair works.
            </div>
            <pre style={{ background: '#17201D', color: '#E8ECEA', padding: 14, borderRadius: 12, overflowX: 'auto', fontSize: 13, margin: 0 }}>
{`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}`}
            </pre>
            <span className="muted" style={{ fontSize: 13 }}>Keep the private key secret. It is never shown again once saved in Vercel.</span>
          </div>
        ) : (
          <NotificationSettings publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
        )}
      </section>

      {ready && (
        <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="section-title">Devices receiving notifications</h2>
          {(devices || []).length === 0 && <span className="muted">No devices yet.</span>}
          {(devices || []).map((d) => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1 }}>{d.label || 'Device'} <span className="muted" style={{ fontSize: 13 }}>· added {dateTime(d.created_at)}</span></span>
              <form action={removeDevice}>
                <input type="hidden" name="id" value={d.id} />
                <button className="btn btn-ghost btn-sm" type="submit">Remove</button>
              </form>
            </div>
          ))}
        </section>
      )}

      <section className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 className="section-title">Practice mode AI</h2>
        {aiReady ? (
          <span><span className="pill pill-ok">Connected</span> AI customers are written by Google Gemini ({process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'}).</span>
        ) : (
          <span>
            <span className="pill pill-warn">Not connected</span> Practice mode uses scripted customers. To use AI, create a free key at
            {' '}<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">aistudio.google.com</a>, add it in Vercel as
            {' '}<code>GEMINI_API_KEY</code>, then Redeploy.
          </span>
        )}
      </section>
    </>
  );
}
