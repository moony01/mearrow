import type { CompaniesResponse } from '@/types/api';
import type { HallOfFameData } from '@/types/hall-of-fame';
import { getCompanies } from '@/lib/api/companies';
import { getHallOfFame } from '@/lib/api/hall-of-fame';

/**
 * Public ranking data embedded in the statically generated HTML.
 *
 * The client keeps its existing SWR refresh afterwards, but a crawler and a
 * first-time visitor receive the current ranking cards in the initial document.
 */
export async function getInitialLeagueData(): Promise<CompaniesResponse | null> {
  try {
    const { source, ...data } = await getCompanies();
    return source === 'db' ? data : null;
  } catch {
    return null;
  }
}

/**
 * Hall-of-fame records for the statically generated first render.
 *
 * `getHallOfFame` already returns an explicit empty-record shape if no season
 * has been decided, which is preferable to emitting a loading-only document.
 */
export async function getInitialHallOfFameData(): Promise<HallOfFameData | null> {
  try {
    return await getHallOfFame();
  } catch {
    return null;
  }
}
