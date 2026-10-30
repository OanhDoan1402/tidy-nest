import { authClient } from '@/lib/supabase/server';
import { allowedEmails } from '@/lib/auth';

// For API routes: true when the request comes from a signed-in admin.
export async function isAdmin() {
  try {
    const { data } = await authClient().auth.getUser();
    const email = data?.user?.email?.toLowerCase();
    return Boolean(email && allowedEmails().includes(email));
  } catch {
    return false;
  }
}
