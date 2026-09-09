/* ============================================================
   BeCRM — Email Builder · render/vml.ts
   Outlook (Word engine) hardening applied as a post-render string pass, because
   React (renderToStaticMarkup) can't emit raw conditional comments without a
   wrapper element. The renderer emits tiny inline <i> MARKER elements and we
   swap them for `<!--[if mso]>…<![endif]-->` comments here, plus we inject the
   head-level MSO blocks (DPI, ghost-table) and normalize attribute casing.
   ============================================================ */

export type VmlBgSpec = {
  src: string; // absolute image URL
  color: string; // solid fallback / fill color
  width: number; // rect width px (content width)
  height: number; // rect height px (hero/section height)
  overlay?: { color: string; opacity: number } | null; // scrim for legibility
};

const OPEN_ATTR = "data-eevml-open";
const CLOSE_ATTR = "data-eevml-close";
const GHOST_OPEN_ATTR = "data-eeghost-open";
const GHOST_CLOSE_ATTR = "data-eeghost-close";

const enc = (s: string) => encodeURIComponent(s);
const dec = (s: string) => decodeURIComponent(s);

export function vmlOpenPayload(spec: VmlBgSpec): string {
  return enc(JSON.stringify(spec));
}
export function ghostOpenPayload(width: number): string {
  return enc(JSON.stringify({ width }));
}

const VMLNS = `xmlns:v="urn:schemas-microsoft-com:vml"`;

/** HTML-attribute-encode a value before it's concatenated RAW into the VML comment
 *  string. Defense-in-depth: the model already restricts src to http(s) and color
 *  to a safe syntax (schema.ts safeHttpUrl/safeCssColor), but this guarantees no
 *  interpolated value can break out of its quoted attribute regardless of source. */
const attr = (s: string): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function vmlOpenComment(spec: VmlBgSpec): string {
  const w = Math.max(1, Math.round(spec.width));
  const h = Math.max(1, Math.round(spec.height));
  const ov = spec.overlay && spec.overlay.opacity > 0 ? spec.overlay : null;
  if (ov) {
    const op = Math.max(0, Math.min(100, Math.round(ov.opacity)));
    // v:image (the photo) + a position:absolute v:rect scrim whose textbox holds
    // the real content — the canonical Outlook "image with overlay text" pattern.
    return (
      `<!--[if mso]>` +
      `<v:image ${VMLNS} style="width:${w}px;height:${h}px;" src="${attr(spec.src)}" />` +
      `<v:rect ${VMLNS} fill="true" stroke="false" style="position:absolute;top:0;left:0;width:${w}px;height:${h}px;">` +
      `<v:fill opacity="${op}%" color="${attr(ov.color)}" />` +
      `<v:textbox inset="0,0,0,0"><div>` +
      `<![endif]-->`
    );
  }
  return (
    `<!--[if mso]>` +
    `<v:rect ${VMLNS} fill="true" stroke="false" style="width:${w}px;height:${h}px;mso-width-percent:0;">` +
    `<v:fill type="frame" src="${attr(spec.src)}" color="${attr(spec.color)}" />` +
    `<v:textbox inset="0,0,0,0"><div>` +
    `<![endif]-->`
  );
}

const VML_CLOSE_COMMENT = `<!--[if mso]></div></v:textbox></v:rect><![endif]-->`;

/** MSO DPI/PNG block — pins Outlook to 96 DPI so fixed px / VML aren't upscaled. */
const MSO_HEAD = `<!--[if mso]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->`;

function ghostOpenComment(width: number): string {
  const w = Math.max(1, Math.round(width));
  return `<!--[if mso]><table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="${w}"><tr><td><![endif]-->`;
}
const GHOST_CLOSE_COMMENT = `<!--[if mso]></td></tr></table><![endif]-->`;

const ws = "\\s+";

// Repair merge tags so AWS SES's Handlebars compiler accepts them. The
// contentEditable rich-text editor can split a tag with markup the browser
// injects ({{<span>nombre</span>}}, {{&nbsp;email&nbsp;}}); that markup between
// the braces makes SES throw "Handlebars compilation failed for input Template
// Content". For every balanced {{ ... }} we strip the inner markup/entities to a
// plain token; a balanced pair that still isn't a usable variable is escaped to
// literal entities so it renders as text instead of breaking compilation.
export function healMergeTags(html: string): string {
  if (!html || html.indexOf("{{") === -1) return html;
  // `[^{}]` (not `[\s\S]`) keeps a tag's inner from straddling across braces, so
  // a stray "{{" can't swallow the next real "{{tag}}" (it stays unbalanced and
  // is caught by hasBalancedMergeBraces). Editor-injected markup has no braces,
  // so it is still stripped.
  return html.replace(/\{\{([^{}]*?)\}\}/g, (whole: string, inner: string) => {
    const cleaned = inner
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim();
    // A real merge tag is a plain token/path (letters, digits, underscore, dot).
    if (cleaned && /^[\w.\s]+$/.test(cleaned)) return `{{${cleaned}}}`;
    return whole.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;");
  });
}

// True only when every "{{" has a matching "}}" — used to reject a half-deleted
// (unbalanced) tag with a clear error before AWS does it with a cryptic 502.
export function hasBalancedMergeBraces(value: string | null | undefined): boolean {
  if (!value) return true;
  return (value.match(/\{\{/g)?.length ?? 0) === (value.match(/\}\}/g)?.length ?? 0);
}

/** Final hardening pass over the rendered HTML. Idempotent on already-clean HTML. */
export function finalizeEmailHtml(html: string): string {
  let out = html;

  // 0) Repair merge tags so SES's Handlebars compiler never chokes on markup the
  //    rich-text editor may have injected inside {{ ... }}.
  out = healMergeTags(out);

  // 1) Outlook ghost-table wrapper around the content container (fixed 600px).
  out = out.replace(new RegExp(`<i${ws}${GHOST_OPEN_ATTR}="([^"]*)"[^>]*>\\s*<\\/i>`, "g"), (_m, payload: string) => {
    try {
      const { width } = JSON.parse(dec(payload)) as { width: number };
      return ghostOpenComment(width);
    } catch {
      return "";
    }
  });
  out = out.replace(new RegExp(`<i${ws}${GHOST_CLOSE_ATTR}="[^"]*"[^>]*>\\s*<\\/i>`, "g"), GHOST_CLOSE_COMMENT);

  // 2) VML background fills (whitespace-tolerant for pretty + compact output).
  out = out.replace(new RegExp(`<i${ws}${OPEN_ATTR}="([^"]*)"[^>]*>\\s*<\\/i>`, "g"), (_m, payload: string) => {
    try {
      return vmlOpenComment(JSON.parse(dec(payload)) as VmlBgSpec);
    } catch {
      return "";
    }
  });
  out = out.replace(new RegExp(`<i${ws}${CLOSE_ATTR}="[^"]*"[^>]*>\\s*<\\/i>`, "g"), VML_CLOSE_COMMENT);

  // 3) Inject the MSO DPI block right after <head> (idempotent).
  if (!out.includes("OfficeDocumentSettings")) {
    out = out.replace(/<head([^>]*)>/i, (m) => `${m}${MSO_HEAD}`);
  }

  // 4) Normalize camelCase table attributes that renderToStaticMarkup leaves
  //    (strict/legacy parsers may ignore camelCase, reintroducing cell gaps).
  out = out.replace(/cellPadding=/g, "cellpadding=").replace(/cellSpacing=/g, "cellspacing=");

  return out;
}

export const VML_MARKER_ATTRS = { OPEN_ATTR, CLOSE_ATTR, GHOST_OPEN_ATTR, GHOST_CLOSE_ATTR };
