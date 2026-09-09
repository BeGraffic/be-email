/* ============================================================
   BeCRM — Email Builder · model/sanitizeHtml.ts
   Isomorphic (server + browser), dependency-free allowlist scrubber for the
   inline rich-text of heading/text blocks and the raw `code` of html blocks.

   Both reach `dangerouslySetInnerHTML` — in the live editor canvas (same-origin,
   authenticated app DOM) and in the rendered email sent via SES. Designs come
   from untrusted sources (pasted HTML, the AI HTML import, templates shared
   across workspace members), so we strip the practical XSS vectors here, at the
   normalize gate (`deserializeDesign` runs on every load AND on the AI import
   output), as defense-in-depth. It is intentionally conservative: it removes
   active-content elements, inline event handlers and javascript:/vbscript: URLs
   while leaving ordinary formatting/markup intact.
   ============================================================ */

export function sanitizeRichHtml(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  let out = value;
  // Drop active-content elements together with their contents.
  out = out.replace(/<(script|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "");
  // Drop any remaining/unclosed dangerous tags (opening or void).
  out = out.replace(
    /<\/?(script|iframe|object|embed|noscript|template|base|meta|link)\b[^>]*>/gi,
    "",
  );
  // Strip inline event handlers. The attribute separator is not just whitespace:
  // the HTML tokenizer also returns to before-attribute-name after a "/" and
  // after the closing quote of a quoted value, so `<img src="x"onerror=…>` and
  // `<img src=x/onerror=…>` are real handlers. The separator is PRESERVED (else
  // removing it would swallow the quote that closes the previous value), and the
  // pass repeats so back-to-back handlers all go.
  const eventAttr = /([\s/"'`])on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi;
  for (let i = 0; i < 5; i += 1) {
    const next = out.replace(eventAttr, "$1");
    if (next === out) break;
    out = next;
  }
  // Neutralize javascript:/vbscript: in href/src/xlink:href (tolerating leading
  // whitespace or entities the attacker might use to obfuscate the scheme).
  out = out.replace(
    /\b(href|src|xlink:href)\s*=\s*"(?:\s|&#?\w+;)*(?:javascript|vbscript)\s*:[^"]*"/gi,
    '$1="#"',
  );
  out = out.replace(
    /\b(href|src|xlink:href)\s*=\s*'(?:\s|&#?\w+;)*(?:javascript|vbscript)\s*:[^']*'/gi,
    "$1='#'",
  );
  return out;
}

/** Strip structural table/section tags from user HTML so a malformed snippet
 *  can't escape its cell and corrupt the surrounding table. Shared by the
 *  editor canvas (BlockVisual) and the send/preview render (EmailDocument)
 *  so both surfaces show the same result. */
export function sanitizeHtmlBlock(code: string): string {
  return (code || "").replace(/<\/?(?:table|thead|tbody|tfoot|tr|td|th|caption|colgroup|col)\b[^>]*>/gi, "");
}
