import './globals.css';
import { STORE_NAME } from '@/lib/format';

export const metadata = {
  title: { default: STORE_NAME, template: `%s · ${STORE_NAME}` },
  description: 'Everyday home goods.',
  icons: { icon: '/logo.svg', apple: '/apple-touch-icon.png' },
  appleWebApp: { capable: true, title: `${STORE_NAME} Admin`, statusBarStyle: 'default' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#17201D',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
