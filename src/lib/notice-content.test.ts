import { describe, expect, it } from 'vitest';
import { getNoticePlainText } from './notice-content';

describe('getNoticePlainText', () => {
  it('keeps readable text while discarding executable or embedded markup', () => {
    expect(
      getNoticePlainText(
        '<p>MEARROW &amp; update</p><script>alert(1)</script><iframe src="https://bad.example">x</iframe><p>Read&nbsp;more</p>',
      ),
    ).toBe('MEARROW & update Read more');
  });
});
