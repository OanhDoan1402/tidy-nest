'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

function sessionId() {
  try {
    const now = Date.now();
    const raw = JSON.parse(sessionStorage.getItem('tn-session') || 'null');
    if (raw && now - raw.t < 30 * 60 * 1000) {
      raw.t = now;
      sessionStorage.setItem('tn-session', JSON.stringify(raw));
      return raw.id;
    }
    const id = Math.random().toString(36).slice(2) + now.toString(36);
    sessionStorage.setItem('tn-session', JSON.stringify({ id, t: now }));
    return id;
  } catch {
    return 'anon';
  }
}

// Records one page view per page visited. Used for Sessions, devices and traffic sources.
export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const body = JSON.stringify({
      session_id: sessionId(),
      path,
      referrer: document.referrer || '',
      device: window.innerWidth < 768 ? 'Mobile' : window.innerWidth < 1100 ? 'Tablet' : 'Desktop',
    });
    fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
