/**
 * Produce a safe, readable server-rendered fallback from rich notice HTML.
 *
 * Full rich HTML is still sanitized in the browser before it is injected with
 * dangerouslySetInnerHTML. This helper deliberately returns plain text so a
 * static document can include meaningful notice content without evaluating or
 * trusting unsanitized markup on the server/Worker bundle.
 */
export function getNoticePlainText(content: string): string {
  return content
    .replace(/<(script|style|iframe|object|embed|form|textarea)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
