'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PageFrame from '@/components/layout/PageFrame';

/** Static-export fallback; runtime page handlers and Pages rules redirect direct requests. */
export default function StudioArchiveRedirect({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <PageFrame size="narrow">
      <Link href={href}>{label}</Link>
    </PageFrame>
  );
}
