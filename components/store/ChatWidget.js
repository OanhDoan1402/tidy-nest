'use client';

import { useEffect, useRef, useState } from 'react';

const KEY = 'tn-chat';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export default function ChatWidget({ storeName }) {
  const [open, setOpen] = useState(false);
  const [conv, setConv] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => { setConv(load()); }, []);

  useEffect(() => {
    if (!open || !conv) return;
    let stop = false;
    async function poll() {
      try {
        const r = await fetch(`/api/chat/${conv.id}?token=${conv.token}`, { cache: 'no-store' });
        if (r.status === 404) { localStorage.removeItem(KEY); setConv(null); return; }
        const d = await r.json();
        if (!stop && d.messages) setMsgs(d.messages);
      } catch {}
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => { stop = true; clearInterval(t); };
  }, [open, conv]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, open]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    setErr('');
    if (!body) { setErr('Type a message first.'); return; }
    if (!conv && !name.trim()) { setErr('Please add your name.'); return; }
    setBusy(true);
    try {
      const payload = conv
        ? { action: 'send', id: conv.id, token: conv.token, body }
        : { action: 'start', name: name.trim(), email: email.trim(), body };
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Could not send. Please try again.');
      if (!conv) {
        const c = { id: d.id, token: d.token };
        localStorage.setItem(KEY, JSON.stringify(c));
        setConv(c);
      }
      setMsgs(d.messages || msgs);
      setText('');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open && (
        <section className="chat-panel" aria-label={`Chat with ${storeName}`}>
          <div className="chat-head">
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: 15 }}>Chat with {storeName}</strong>
              <span style={{ fontSize: 12, color: '#D5E6DF' }}>We usually reply within a few hours</span>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setOpen(false)} style={{ width: 36, height: 36, border: 0, background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {msgs.length === 0 && (
              <div className="bubble b-them">Hi! Ask us anything about our products, shipping or your order.</div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={'bubble ' + (m.sender === 'customer' ? 'b-me' : 'b-them')}>{m.body}</div>
            ))}
          </div>
          <form onSubmit={send} style={{ borderTop: '1px solid var(--line)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!conv && (
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="sr" htmlFor="chat-name">Your name</label>
                <input id="chat-name" className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="sr" htmlFor="chat-email">Email (optional)</label>
                <input id="chat-email" className="input" type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <label className="sr" htmlFor="chat-text">Message</label>
              <input id="chat-text" className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
              <button className="btn" type="submit" disabled={busy} aria-label="Send">Send</button>
            </div>
            {err && <span role="alert" style={{ color: 'var(--bad)', fontSize: 13 }}>{err}</span>}
          </form>
        </section>
      )}
      <button type="button" className="chat-fab" aria-label={open ? 'Close chat' : 'Chat with us'} onClick={() => setOpen(!open)}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>
      </button>
    </>
  );
}
