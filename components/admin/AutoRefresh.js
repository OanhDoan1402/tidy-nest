'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Re-loads the page data every few seconds (new orders, new chat messages).
export default function AutoRefresh({ seconds = 15 }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
