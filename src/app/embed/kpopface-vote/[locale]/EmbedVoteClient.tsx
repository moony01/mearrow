/**
 * Legacy import compatibility. Existing callers keep their URL while the
 * canonical VoteBoard receives the Kpopface surface adapter by default.
 */
import VoteBoardEmbedClient from '../../vote-board/[locale]/VoteBoardEmbedClient';
import type { CompaniesResponse } from '@/types/api';

export default function EmbedVoteClient({
  locale,
  initialData,
}: {
  locale: string;
  initialData?: CompaniesResponse | null;
}) {
  return (
    <VoteBoardEmbedClient
      locale={locale}
      surfaceOverride="kpopface"
      initialData={initialData}
    />
  );
}
