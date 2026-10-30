import webpush from 'web-push';
import { db } from '@/lib/supabase/admin';
import { TZ, allowedFirstEmail } from '@/lib/pushConfig';

export function pushReady() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function configure() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${allowedFirstEmail() || 'owner@example.com'}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function inQuietHours() {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
  return h >= 23 || h < 7;
}

/**
 * Sends a phone/desktop notification to every device that wants this kind.
 * kind: 'order' | 'update' | 'chat_first' | 'chat' | 'practice' | 'test'
 * Never throws: a failed notification must not break an order or a chat.
 */
export async function notify(kind, { title, body, url = '/admin', tag, only } = {}) {
  if (!pushReady()) return;
  try {
    configure();
    const supabase = db();
    let q = supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth, prefs');
    if (only) q = q.eq('id', only);
    const { data: subs } = await q;
    const quiet = inQuietHours();
    const wanted = (p = {}) => {
      if (kind === 'test') return true;
      if (kind === 'order') return p.orders !== false;
      if (kind === 'update') return p.updates === true;
      if (kind === 'chat_first') return p.chats !== false;
      if (kind === 'chat') return p.chats !== false && p.chatMode === 'all';
      if (kind === 'practice') return p.practice !== false;
      return false;
    };
    const payload = (p) => JSON.stringify({
      title: kind === 'practice' ? `[SHOPIFY] ${title}` : title,
      body,
      url,
      tag: tag || kind,
      silent: Boolean(p?.quiet && quiet),
    });
    await Promise.allSettled((subs || []).filter((s) => wanted(s.prefs)).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload(s.prefs),
          { TTL: 3600, urgency: 'high' }
        );
      } catch (err) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }));
  } catch {
    // ignore
  }
}

export function newVapidKeys() {
  return webpush.generateVAPIDKeys();
}
