'use client';

import type { CompaniesResponse } from '@/types/api';

// Keep the existing vote/ranking implementation intact while moving it off
// the community-first home route.
import { HomeClient } from '@/app/(site)/HomeClient';

export default function RankingClient({
  initialData,
}: {
  initialData?: CompaniesResponse | null;
}) {
  return <HomeClient initialData={initialData} />;
}

export { HomeClient };
