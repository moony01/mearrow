/** Use the edge request URL, never user-supplied forwarding headers. */
export function getHttpsRedirect(requestUrl: string): Response | null {
  const url = new URL(requestUrl);
  if (url.protocol !== 'http:' || !['mearrow.com', 'www.mearrow.com'].includes(url.hostname)) {
    return null;
  }

  url.protocol = 'https:';
  url.port = '';
  // 308 preserves the method and body for non-GET requests as well.
  return Response.redirect(url.toString(), 308);
}
