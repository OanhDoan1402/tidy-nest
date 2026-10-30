'use client';

import { useRouter } from 'next/navigation';
import { browserClient } from '@/lib/supabase/browser';

export default function SignOut({ style }) {
  const router = useRouter();
  async function out() {
    await browserClient().auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }
  return (
    <button type="button" onClick={out} style={{ background: 'transparent', border: '1px solid #3A4843', color: '#C9D1CD', borderRadius: 10, minHeight: 40, cursor: 'pointer', ...style }}>
      Sign out
    </button>
  );
}
