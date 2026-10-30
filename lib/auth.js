import { redirect } from 'next/navigation';
import { authClient } from '@/lib/supabase/server';

export function allowedEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// Use at the top of every admin page and admin server action.
export async function requireAdmin() {
  const supabase = authClient();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email?.toLowerCase();
  if (!email || !allowedEmails().includes(email)) {
    redirect('/admin/login');
  }
  return data.user;
}
