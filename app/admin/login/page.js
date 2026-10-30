'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { browserClient } from '@/lib/supabase/browser';
import { STORE_NAME } from '@/lib/format';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Enter your email and password.'); return; }
    setBusy(true);
    const { error } = await browserClient().auth.signInWithPassword({ email, password });
    if (error) {
      setErr('Email or password is not correct.');
      setBusy(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={submit} className="card" style={{ width: 380, maxWidth: '100%', padding: 26, display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <strong style={{ fontSize: 18 }}>{STORE_NAME}</strong>
            <span className="muted" style={{ fontSize: 13 }}>Store admin</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {err && <div role="alert" className="error">{err}</div>}
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
