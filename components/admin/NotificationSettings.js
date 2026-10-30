'use client';

import { useEffect, useState } from 'react';

function keyToBytes(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android phone';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  return 'Device';
}

const ROWS = [
  ['orders', 'New orders', 'Order number, total and item count'],
  ['chats', 'Customer chat messages', 'Opens the chat when tapped'],
  ['updates', 'Order updates', 'When an order is marked paid, fulfilled or canceled'],
  ['practice', 'Practice-mode chats', 'Always start with [Practice]'],
  ['quiet', 'Quiet hours (11 PM to 7 AM)', 'Alerts still arrive, without sound'],
];

export default function NotificationSettings({ publicKey }) {
  const [support, setSupport] = useState('checking');
  const [endpoint, setEndpoint] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      if (!ok) {
        const ios = /iPhone|iPad/.test(navigator.userAgent);
        setSupport(ios ? 'ios-install' : 'unsupported');
        return;
      }
      setSupport('ok');
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const sub = await reg.pushManager.getSubscription();
        const r = await fetch('/api/push' + (sub ? `?endpoint=${encodeURIComponent(sub.endpoint)}` : ''), { cache: 'no-store' });
        const d = await r.json();
        setPrefs(d.prefs);
        if (sub && d.subscribed) setEndpoint(sub.endpoint);
      } catch {
        setMsg('Could not check this device. Reload the page and try again.');
      }
    })();
  }, []);

  async function turnOn() {
    setBusy(true); setMsg('');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMsg('Notifications are blocked for this site. Allow them in your browser or phone settings, then try again.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey) }));
      const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON(), label: deviceLabel(), prefs }) });
      if (!r.ok) throw new Error((await r.json()).error || 'Could not save this device.');
      setEndpoint(sub.endpoint);
      setMsg('Notifications are on for this device.');
    } catch (e) {
      setMsg(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true); setMsg('');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove', endpoint }) });
      setEndpoint(null);
      setMsg('Notifications are off for this device.');
    } finally {
      setBusy(false);
    }
  }

  async function save(next) {
    setPrefs(next);
    if (endpoint) {
      await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'prefs', endpoint, prefs: next }) });
    }
  }

  async function test() {
    setMsg('');
    const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'test', endpoint }) });
    const d = await r.json();
    setMsg(r.ok ? 'Test sent. It should arrive in a few seconds.' : d.error);
  }

  if (support === 'checking') return <p className="muted">Checking this device…</p>;
  if (support === 'ios-install') {
    return (
      <div className="notice">
        On iPhone, notifications work only from the Home Screen app. In Safari tap <strong>Share → Add to Home Screen</strong>,
        open the admin from the new icon, then come back to this page.
      </div>
    );
  }
  if (support === 'unsupported') return <div className="notice">This browser does not support notifications. Try Chrome, Edge or Safari.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <span className={'pill ' + (endpoint ? 'pill-ok' : 'pill-mute')}>{endpoint ? 'On for this device' : 'Off for this device'}</span>
        {endpoint ? (
          <>
            <button className="btn btn-ghost btn-sm" type="button" onClick={test}>Send test notification</button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={turnOff} disabled={busy}>Turn off on this device</button>
          </>
        ) : (
          <button className="btn" type="button" onClick={turnOn} disabled={busy || !prefs}>{busy ? 'Turning on…' : 'Turn on notifications'}</button>
        )}
      </div>
      {msg && <div role="status" className="notice">{msg}</div>}
      {prefs && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {ROWS.map(([key, label, hint]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--line-2)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <span className="muted" style={{ fontSize: 13 }}>{hint}</span>
                {key === 'chats' && prefs.chats && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {[['first', 'First message of each chat'], ['all', 'Every message']].map(([v, l]) => (
                      <button key={v} type="button" className={'btn btn-sm ' + (prefs.chatMode === v ? 'btn-dark' : 'btn-ghost')} style={{ borderRadius: 999 }}
                        aria-pressed={prefs.chatMode === v} onClick={() => save({ ...prefs, chatMode: v })}>{l}</button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" role="switch" aria-checked={!!prefs[key]} aria-label={label}
                onClick={() => save({ ...prefs, [key]: !prefs[key] })}
                style={{ width: 46, height: 28, borderRadius: 999, border: 0, cursor: 'pointer', position: 'relative', flex: 'none', background: prefs[key] ? 'var(--accent)' : '#C9CFCB' }}>
                <span style={{ position: 'absolute', top: 3, left: prefs[key] ? 21 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
              </button>
            </div>
          ))}
        </div>
      )}
      {!endpoint && <span className="muted" style={{ fontSize: 13 }}>Choose your settings, then tap Turn on notifications. Each phone or computer is turned on separately.</span>}
    </div>
  );
}
