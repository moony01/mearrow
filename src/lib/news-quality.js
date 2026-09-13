/**
 * Shared news publication quality rules.
 *
 * The source articles remain in the repository. These rules provide an
 * editorial audit signal for unsupported or low-context articles; publication
 * status is controlled separately by explicit frontmatter `active: false`.
 */

const EXTERNAL_MARKDOWN_LINK_PATTERN =
  /(?<!!)\[([^\]]+)\]\(\s*(https?:\/\/[^\s)]+)(?:\s+["'][^)]*["'])?\s*\)/gi;

const ORIGINAL_ANALYSIS_PATTERN =
  /\bMEARROW(?:['’]s)?\s+(?:View|Take|Perspective|Read|Analysis|Point of View|Data|Analytical|Is Watching|Will Be Watching)\b/i;

const PRACTICAL_GUIDE_CATEGORY = 'Trainee System';

export const NEWS_QUALITY_POLICY = Object.freeze({
  minimumWords: 700,
  minimumExternalSources: 1,
  practicalGuideMinimumSources: 3,
});

/**
 * @typedef {{ label: string; url: string }} NewsSource
 */

/**
 * Extracts unique external markdown links while ignoring markdown images.
 *
 * @param {string} markdown
 * @returns {NewsSource[]}
 */
export function extractExternalSources(markdown) {
  const sources = [];
  const seen = new Set();

  for (const match of markdown.matchAll(EXTERNAL_MARKDOWN_LINK_PATTERN)) {
    const label = match[1]?.replace(/[\*_`]/g, '').replace(/\s+/g, ' ').trim();
    const rawUrl = match[2]?.trim();

    if (!label || !rawUrl) continue;

    try {
      const parsedUrl = new URL(rawUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) continue;

      const url = parsedUrl.toString();
      if (seen.has(url)) continue;
      seen.add(url);
      sources.push({ label, url });
    } catch {
      // Ignore malformed source links rather than failing the whole build.
    }
  }

  return sources;
}

/**
 * @param {string} markdown
 * @returns {number}
 */
export function countNewsWords(markdown) {
  return markdown.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * @param {string} markdown
 * @returns {boolean}
 */
export function hasOriginalAnalysis(markdown) {
  return ORIGINAL_ANALYSIS_PATTERN.test(markdown);
}

/**
 * @param {string} markdown
 * @param {{ category?: string }} [metadata]
 * @returns {{ eligible: boolean; wordCount: number; sources: NewsSource[]; hasAnalysis: boolean; isPracticalGuide: boolean; reasons: string[] }}
 */
export function evaluateNewsQuality(markdown, metadata = {}) {
  const wordCount = countNewsWords(markdown);
  const sources = extractExternalSources(markdown);
  const hasAnalysis = hasOriginalAnalysis(markdown);
  const isPracticalGuide = metadata.category === PRACTICAL_GUIDE_CATEGORY;
  const reasons = [];

  if (wordCount < NEWS_QUALITY_POLICY.minimumWords) {
    reasons.push(`word_count_below_${NEWS_QUALITY_POLICY.minimumWords}`);
  }

  if (sources.length < NEWS_QUALITY_POLICY.minimumExternalSources) {
    reasons.push('missing_external_source');
  }

  const guideHasEnoughSources =
    isPracticalGuide && sources.length >= NEWS_QUALITY_POLICY.practicalGuideMinimumSources;

  if (!hasAnalysis && !guideHasEnoughSources) {
    reasons.push('missing_original_analysis');
  }

  return {
    eligible: reasons.length === 0,
    wordCount,
    sources,
    hasAnalysis,
    isPracticalGuide,
    reasons,
  };
}
