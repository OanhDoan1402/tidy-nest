export const TZ = process.env.STORE_TIMEZONE || 'America/New_York';

export function allowedFirstEmail() {
  return (process.env.ADMIN_EMAILS || '').split(',')[0]?.trim() || '';
}
