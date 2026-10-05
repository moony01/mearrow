import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(
  resolve(process.cwd(), 'src/components/layout/Header/Header.module.scss'),
  'utf8',
);

describe('Header responsive visibility', () => {
  it('keeps the global header mobile-only from the tablet breakpoint', () => {
    const headerRule = stylesheet.match(
      /\.header\s*\{[\s\S]*?@media\s*\(min-width:\s*769px\)\s*\{([\s\S]*?)\}/,
    );

    expect(stylesheet).toMatch(/\.header\s*\{[\s\S]*?display:\s*block\s*;/);
    expect(headerRule?.[1] ?? '').toMatch(/display:\s*none\s*;/);
  });
});
