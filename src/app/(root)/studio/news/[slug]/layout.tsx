import type { ReactNode } from 'react';
import AuthProvider from '@/components/providers/AuthProvider';

export default function NewsDetailLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
