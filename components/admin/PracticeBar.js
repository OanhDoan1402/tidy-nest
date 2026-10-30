'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

function elapsed(s) {
  if (!s) return 0;
  const now = Date.now();
  const pausedNow = s.status === 'paused' && s.paused_at ? now - new Date(s.paused_at).getTime() : 0;
  return Math.max(0, Math.round((now - new Date(s.started_at).getTime() - pausedNow) / 1000) - (s.paused_seconds || 0));
}

function clock(sec) {
  const m = Math.floor(sec / 60), r = sec % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function Btn({ children, dark }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={'btn btn-sm ' + (dark ? 'btn-dark' : 'btn-ghost')} disabled={pending}>{pending ? '…' : children}</button>;
}

const FREQ = [['low', 'Slow (about 1 a minute)'], ['mid', 'Steady (about 2 a minute)'], ['high', 'Rush (about 5 a minute)']];
const DIFF = [['easy', 'Friendly customers'], ['mixed', 'Mixed customers'], ['hard', 'Demanding customers']];

export default function PracticeBar({ session, stats, aiOn, startAction, stateAction }) {
  const router = useRouter();
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(elapsed(session));
    if (!session) return;
    const t = setInterval(() => setNow(elapsed(session)), 1000);
    return () => clearInterval(t);
  }, [session]);

  useEffect(() => {
    if (session?.status !== 'running') return;
    let stop = false;
    async function run() {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await fetch('/api/practice/tick', { method: 'POST' });
        const d = await r.json();
        if (!stop && d.changed) router.refresh();
      } catch {}
    }
    run();
    const t = setInterval(run, 4000);
    return () => { stop = true; clearInterval(t); };
  }, [session?.id, session?.status, router]);

  if (!session) {
    return (
      <form action={startAction} className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <strong style={{ marginRight: 'auto' }}>Practice replying to customers</strong>
        <label className="sr" htmlFor="p-freq">How often new chats arrive</label>
        <select id="p-freq" name="freq" defaultValue="mid" className="input" style={{ width: 'auto', minHeight: 36 }}>
          {FREQ.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label className="sr" htmlFor="p-diff">Customer type</label>
        <select id="p-diff" name="diff" defaultValue="mixed" className="input" style={{ width: 'auto', minHeight: 36 }}>
          {DIFF.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Btn dark>Start practice session</Btn>
        {!aiOn && <span className="muted" style={{ fontSize: 12, flexBasis: '100%' }}>No AI key yet: customers follow short scripts. Add GEMINI_API_KEY in Vercel for AI customers (see Settings).</span>}
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <span role="status" className="pill pill-warn num"><span style={{ width: 7, height: 7, borderRadius: 999, background: '#D9822B' }} />Practice · {now === null ? '–:––' : clock(now)}{session.status === 'paused' ? ' · paused' : ''}</span>
      <span className="muted" style={{ fontSize: 12 }}>{stats.handled}/{stats.total} answered · avg first reply {stats.avg}</span>
      <form action={stateAction} style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}
        onChange={(e) => { if (e.target.name === 'freq' || e.target.name === 'diff') e.currentTarget.requestSubmit(); }}>
        <input type="hidden" name="action" value="settings" />
        <label className="sr" htmlFor="s-freq">How often new chats arrive</label>
        <select id="s-freq" name="freq" defaultValue={session.freq} className="input" style={{ width: 'auto', minHeight: 32, fontSize: 13 }}>
          {FREQ.map(([v, l]) => <option key={v} value={v}>{l.split(' (')[0]}</option>)}
        </select>
        <label className="sr" htmlFor="s-diff">Customer type</label>
        <select id="s-diff" name="diff" defaultValue={session.diff} className="input" style={{ width: 'auto', minHeight: 32, fontSize: 13 }}>
          {DIFF.map(([v, l]) => <option key={v} value={v}>{l.split(' ')[0]}</option>)}
        </select>
      </form>
      <form action={stateAction}>
        <input type="hidden" name="action" value={session.status === 'paused' ? 'resume' : 'pause'} />
        <Btn>{session.status === 'paused' ? 'Resume' : 'Pause'}</Btn>
      </form>
      <form action={stateAction}>
        <input type="hidden" name="action" value="end" />
        <Btn dark>End session</Btn>
      </form>
    </div>
  );
}
