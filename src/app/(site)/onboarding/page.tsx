import type { Metadata } from 'next';
import OnboardingClient from './OnboardingClient';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: '최애 그룹 설정',
    robots: { index: false, follow: false },
  };
}

export default function OnboardingPage() {
  return <OnboardingClient />;
}
