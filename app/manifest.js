import { STORE_NAME } from '@/lib/format';

export default function manifest() {
  return {
    name: `${STORE_NAME} Admin`,
    short_name: STORE_NAME,
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F6F3',
    theme_color: '#17201D',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
