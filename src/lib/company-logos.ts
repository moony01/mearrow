/**
 * Official company logo assets used across the ranking UI.
 *
 * The database still contains legacy fan-art URLs for some companies. Keep
 * those URLs as a fallback for companies that are not in this registry, but
 * prefer the verified brand assets below whenever a company ID or name is known.
 */
const OFFICIAL_COMPANY_LOGOS: Record<string, string> = {
  '71315875-2632-4406-8e60-c571f2008955': '/images/company-logos/a2o.svg',
  'ba57c11a-bf5b-4058-93e8-449c572d72c2': '/images/company-logos/yg.svg',
  'df715750-e434-441b-b361-3134b29d320f': '/images/company-logos/sm.webp',
  '9e920899-4937-4c61-9aa6-5539e4953d2b': '/images/company-logos/the-muze.webp',
  'b9858ae7-7021-4a84-98c5-beeb68fb91c2': '/images/company-logos/jyp.webp',
  'ec0fc96a-9c29-4dee-960b-0a4020d17241': '/images/company-logos/kq.webp',
  '3264d1b3-9d2f-4377-94a0-86c948e3cb2f': '/images/company-logos/asnd.webp',
  '0b2e0cb7-232f-4d73-ab77-427552523542': '/images/company-logos/p-nation.webp',
  '3b630eff-8b66-4c9b-97e7-2f6016bb0f58': '/images/company-logos/s2.webp',
  '80b0c28e-ec51-4872-bae3-c7e612072d86': '/images/company-logos/hybe.svg',
  '7f87360a-a79f-44d6-83e7-f4ed347da2fb': '/images/company-logos/modhaus.webp',
};

const OFFICIAL_COMPANY_LOGOS_BY_NAME: Record<string, string> = {
  a2o: '/images/company-logos/a2o.svg',
  'a2o entertainment': '/images/company-logos/a2o.svg',
  hybe: '/images/company-logos/hybe.svg',
  'hybe corporation': '/images/company-logos/hybe.svg',
  sm: '/images/company-logos/sm.webp',
  'sm entertainment': '/images/company-logos/sm.webp',
  yg: '/images/company-logos/yg.svg',
  'yg entertainment': '/images/company-logos/yg.svg',
  jyp: '/images/company-logos/jyp.webp',
  'jyp entertainment': '/images/company-logos/jyp.webp',
  'the muze': '/images/company-logos/the-muze.webp',
  'the muze entertainment': '/images/company-logos/the-muze.webp',
  kq: '/images/company-logos/kq.webp',
  'kq entertainment': '/images/company-logos/kq.webp',
  asnd: '/images/company-logos/asnd.webp',
  'asnd entertainment': '/images/company-logos/asnd.webp',
  'p nation': '/images/company-logos/p-nation.webp',
  'p nation entertainment': '/images/company-logos/p-nation.webp',
  s2: '/images/company-logos/s2.webp',
  's2 entertainment': '/images/company-logos/s2.webp',
  modhaus: '/images/company-logos/modhaus.webp',
  'modhaus entertainment': '/images/company-logos/modhaus.webp',
  attrakt: '/images/company-logos/attrakt.svg',
  wakeone: '/images/company-logos/wakeone.svg',
  'wakeone entertainment': '/images/company-logos/wakeone.svg',
  fantagio: '/images/company-logos/fantagio.webp',
  'fantagio entertainment': '/images/company-logos/fantagio.webp',
  cube: '/images/company-logos/cube.svg',
  'cube entertainment': '/images/company-logos/cube.svg',
  'high up': '/images/company-logos/high-up.svg',
  'high up entertainment': '/images/company-logos/high-up.svg',
  rbw: '/images/company-logos/rbw.webp',
  'rbw entertainment': '/images/company-logos/rbw.webp',
  woollim: '/images/company-logos/woollim.webp',
  'woollim entertainment': '/images/company-logos/woollim.webp',
  wm: '/images/company-logos/wm.webp',
  'wm entertainment': '/images/company-logos/wm.webp',
  'mystic story': '/images/company-logos/mystic-story.webp',
  'mystic story entertainment': '/images/company-logos/mystic-story.webp',
};

const DARK_LOGO_BACKGROUNDS = new Set([
  '/images/company-logos/wakeone.svg',
  '/images/company-logos/high-up.svg',
]);

function normalizeCompanyName(name?: string | null): string {
  return name?.trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim() || '';
}

export function getCompanyLogoUrl(
  companyId: string,
  fallbackLogoUrl?: string | null,
  companyName?: string | null,
): string {
  const logoById = OFFICIAL_COMPANY_LOGOS[companyId];
  if (logoById) return logoById;

  const logoByName = OFFICIAL_COMPANY_LOGOS_BY_NAME[normalizeCompanyName(companyName)];
  return logoByName || fallbackLogoUrl || '';
}

/**
 * Keep logo discs to a strict black/white palette so the official mark keeps
 * enough contrast regardless of the company ranking color.
 */
export function getCompanyLogoBackground(
  companyId: string,
  companyName?: string | null,
  logoUrl?: string | null,
): '#000' | '#fff' {
  const resolvedLogoUrl = getCompanyLogoUrl(companyId, logoUrl, companyName);
  return DARK_LOGO_BACKGROUNDS.has(resolvedLogoUrl) ? '#000' : '#fff';
}
