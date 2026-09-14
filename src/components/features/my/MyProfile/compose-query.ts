export function shouldOpenFeedComposer(search: string): boolean {
  return new URLSearchParams(search).get('compose') === '1';
}
