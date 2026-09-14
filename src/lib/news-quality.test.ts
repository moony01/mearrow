import { describe, expect, it } from 'vitest';
import {
  NEWS_QUALITY_POLICY,
  evaluateNewsQuality,
  extractExternalSources,
} from './news-quality.js';

const longBody = Array.from({ length: NEWS_QUALITY_POLICY.minimumWords }, () => 'context').join(' ');

describe('news publication quality audit', () => {
  it('extracts unique external sources and ignores image URLs', () => {
    const sources = extractExternalSources(`
      ![thumbnail](https://example.com/image.png)
      [Billboard](https://example.com/report)
      [Billboard again](https://example.com/report)
      [Official page](https://example.com/official)
    `);

    expect(sources).toEqual([
      { label: 'Billboard', url: 'https://example.com/report' },
      { label: 'Official page', url: 'https://example.com/official' },
    ]);
  });

  it('publishes source-backed articles with an original MEARROW analysis', () => {
    const result = evaluateNewsQuality(
      `${longBody}\n[Source](https://example.com/source)\n## MEARROW's View`,
      { category: 'Industry' },
    );

    expect(result.eligible).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('reports articles without provenance or original analysis', () => {
    const result = evaluateNewsQuality(longBody, { category: 'Industry' });

    expect(result.eligible).toBe(false);
    expect(result.reasons).toEqual(['missing_external_source', 'missing_original_analysis']);
  });

  it('allows a source-rich official audition guide without an opinion section', () => {
    const result = evaluateNewsQuality(
      `${longBody}\n[Agency A](https://example.com/a) [Agency B](https://example.com/b) [Agency C](https://example.com/c)`,
      { category: 'Trainee System' },
    );

    expect(result.eligible).toBe(true);
    expect(result.isPracticalGuide).toBe(true);
  });
});
