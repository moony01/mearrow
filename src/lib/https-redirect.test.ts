import { describe, expect, it } from 'vitest';
import { getHttpsRedirect } from './https-redirect';

describe('public HTTPS redirect', () => {
  it.each(['mearrow.com', 'www.mearrow.com'])('preserves path and query on %s', (host) => {
    const response = getHttpsRedirect(`http://${host}/ko/news/article?from=home&lang=ko`);
    expect(response?.status).toBe(308);
    expect(response?.headers.get('location')).toBe(`https://${host}/ko/news/article?from=home&lang=ko`);
  });

  it.each(['/ads.txt', '/robots.txt', '/sitemap.xml', '/_next/static/app.js', '/api/news.json'])('also redirects %s', (path) => {
    expect(getHttpsRedirect(`http://mearrow.com${path}`)?.headers.get('location')).toBe(`https://mearrow.com${path}`);
  });

  it.each(['https://mearrow.com/en', 'https://www.mearrow.com/en', 'http://localhost:3000/en', 'http://127.0.0.1:3000/en', 'http://preview.workers.dev/en', 'http://mearrow.com.example/en'])('does not redirect %s', (url) => {
    expect(getHttpsRedirect(url)).toBeNull();
  });
});
