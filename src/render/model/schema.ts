/* ============================================================
   BeCRM — Email Builder · model/schema.ts
   (De)serialization + defensive normalization/validation of the persisted
   design. Normalization is explicit: every entity is rebuilt by PICKING the
   v3 fields (with defaults), which both backfills missing fields and DROPS
   legacy/email-unsafe fields (blur, color filters, foreground images, …).
   This is the single runtime gate between stored JSON and the renderer/editor.
   ============================================================ */
import { OVERRIDE_KEYS } from "./constants";
import { DEFAULT_GLOBAL, clampNum, defaultBlock, genId, newColumn, newRow, newSubColumn } from "./defaults";
import { sanitizeRichHtml } from "./sanitizeHtml";
import {
  DESIGN_GENERATOR,
  DESIGN_VERSION,
  type Align,
  type BgRepeat,
  type Block,
  type BlockType,
  type Border,
  type BorderStyle,
  type Column,
  type ColumnsBlock,
  type ContentPanel,
  type Corners,
  type DeviceOverride,
  type EmailDesign,
  type FillType,
  type Gradient,
  type GlobalSettings,
  type ImageOverlay,
  type Offset,
  type OverrideKey,
  type Responsive,
  type Row,
  type Sides,
  type SubColumn,
  type TextAlign,
  type VAlign,
} from "./types";

/* ── primitive coercers ── */
const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const str = (v: unknown, def = ""): string => (typeof v === "string" ? v : def);
const num = (v: unknown, def = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : def);
const numOpt = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
/** letter-spacing en px: clamp razonable; 0/ausente → undefined (= normal). */
const letterSpacing = (v: unknown): number | undefined => {
  const n = numOpt(v);
  if (n === undefined || n === 0) return undefined;
  return Math.max(-10, Math.min(40, n));
};
const bool = (v: unknown, def = false): boolean => (typeof v === "boolean" ? v : def);
function oneOf<T extends string>(v: unknown, opts: readonly T[], def: T): T {
  return typeof v === "string" && (opts as readonly string[]).includes(v) ? (v as T) : def;
}

/* ── color + url safety ──
   Hardens the RAW render sinks (the VML comment strings in render/vml.ts and the
   <head><style> block in EmailDocument) against HTML/CSS breakout (stored XSS).
   A color is accepted only if it matches a known-safe syntax (hex / rgb()/rgba()
   / hsl()/hsla() / a bare CSS name) — none of which can contain <, >, " or ' —
   otherwise it falls back to `def`. Background-image URLs are restricted to
   http(s) so they are safe to inline even into the unescaped VML string. This is
   the single gate: every color/bg-image the renderer reads passes through here. */
const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;
const FN_COLOR = /^(?:rgb|rgba|hsl|hsla)\([a-z0-9.,%/\s]+\)$/i;
const NAME_COLOR = /^[a-zA-Z]{1,30}$/;
export const safeCssColor = (v: unknown, def = "transparent"): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s && (HEX_COLOR.test(s) || FN_COLOR.test(s) || NAME_COLOR.test(s))) return s;
  return def;
};
/** Block-level color: a safe CSS color OR a bare merge tag ({{brandColor}}),
 *  which the send pipeline resolves before the HTML ever ships. Anything else is
 *  rejected: block colors are interpolated into `style` attributes, so a stray
 *  ";" would let arbitrary declarations (background-image: url(tracker)) ride
 *  along. The AI HTML import can legitimately carry merge tags here. */
const MERGE_TAG = /^\{\{\s*[\w.]+\s*\}\}$/;
const blockColor = (v: unknown, def: string): string => {
  const s = typeof v === "string" ? v.trim() : "";
  return MERGE_TAG.test(s) ? s : safeCssColor(s, def);
};

/** Font id restricted to the editor's catalog: the id is interpolated into the
 *  email's <style> via fontStack(), so a free-form string is a CSS sink. */
const safeFontId = (v: unknown, def = ""): string =>
  typeof v === "string" && /^[A-Za-z0-9 -]{1,40}$/.test(v) ? v : def;

/** http(s)-only URL (drops javascript:, data:, relative, …); empty → "". Also
 *  rejects URLs carrying HTML-breakout chars — a scheme-prefix check alone would
 *  pass `https://x"><script>…`, which then reaches the raw VML string. */
export const safeHttpUrl = (v: unknown): string => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!/^https?:\/\//i.test(s)) return "";
  if (/[<>"'`\s]/.test(s)) return "";
  return s;
};

/** Sanity bounds for the document width. Deliberately WIDER than the editor's
 *  500-800 slider: stored v2 designs carry narrower widths (480) and silently
 *  resizing someone's saved template would be worse than honoring it. This only
 *  rejects the impossible (0, negative, absurd) — which the AI HTML import can
 *  now produce, since it infers the width from the source email. */
const MIN_DOC_WIDTH = 200;
const MAX_DOC_WIDTH = 1200;

const ALIGN = ["left", "center", "right"] as const;
const TEXT_ALIGN = ["left", "center", "right", "justify"] as const;
const VALIGN = ["top", "middle", "bottom"] as const;
const FILL = ["solid", "gradient"] as const;
const BG_REPEAT = ["cover", "repeat", "center"] as const;
const BORDER_STYLE = ["none", "solid", "dashed", "dotted"] as const;

const sides = (v: unknown, def: Sides = { t: 0, b: 0, l: 0, r: 0 }): Sides => {
  const o = rec(v);
  return { t: num(o.t, def.t), b: num(o.b, def.b), l: num(o.l, def.l), r: num(o.r, def.r) };
};
const sidesOpt = (v: unknown): Sides | undefined => (v == null ? undefined : sides(v));
const corners = (v: unknown): Corners | undefined => {
  if (v == null) return undefined;
  const o = rec(v);
  return { tl: num(o.tl), tr: num(o.tr), br: num(o.br), bl: num(o.bl) };
};
const offset = (v: unknown): Offset | undefined => {
  if (v == null) return undefined;
  const o = rec(v);
  return { x: num(o.x), y: num(o.y) };
};
const border = (v: unknown, def: Border = { style: "none", width: 1, color: "#E5E5E5" }): Border => {
  const o = rec(v);
  return {
    style: oneOf<BorderStyle>(o.style, BORDER_STYLE, def.style),
    width: num(o.width, def.width),
    color: safeCssColor(o.color, def.color),
  };
};
const borderOpt = (v: unknown): Border | undefined => (v == null ? undefined : border(v));
const gradient = (v: unknown): Gradient | undefined => {
  if (v == null) return undefined;
  const o = rec(v);
  return { from: safeCssColor(o.from, "#1E4876"), to: safeCssColor(o.to, "#0F2542"), angle: num(o.angle, 135) };
};
/** v2 overlays carried directional gradient flags; v3 is a solid scrim only. */
const overlay = (v: unknown): ImageOverlay | undefined => {
  if (v == null) return undefined;
  const o = rec(v);
  if (o.color == null && o.opacity == null) return undefined;
  return { color: safeCssColor(o.color, "#000000"), opacity: num(o.opacity, 30) };
};
const panel = (v: unknown): ContentPanel | undefined => {
  if (v == null) return undefined;
  const o = rec(v);
  return {
    enabled: bool(o.enabled, true),
    color: blockColor(o.color, "#0F2542"),
    opacity: num(o.opacity, 42),
    radius: num(o.radius, 18),
    padding: sides(o.padding, { t: 20, b: 20, l: 22, r: 22 }),
  };
};

/** Per-key coercers for the device layers. Without them the override values are
 *  the ONE part of the model that reaches the renderer untyped, and several of
 *  them (fontSize, padding, …) are interpolated into the media-query CSS inside
 *  the email's <style>, where a crafted string could close the tag. */
const OVERRIDE_COERCE: Record<OverrideKey, (v: unknown) => unknown> = {
  fontSize: (v) => num(v),
  lineHeight: (v) => num(v),
  letterSpacing: (v) => num(v),
  align: (v) => oneOf<TextAlign>(v, TEXT_ALIGN, "left"),
  padding: (v) => sides(v),
  margin: (v) => sides(v),
  weight: (v) => num(v),
  height: (v) => num(v),
  width: (v) => num(v),
  widthPct: (v) => num(v),
  sizeUnit: (v) => oneOf(v, ["pct", "px"] as const, "px"),
  fullWidth: (v) => bool(v),
  padV: (v) => num(v),
  padH: (v) => num(v),
  radius: (v) => num(v),
  valign: (v) => oneOf<VAlign>(v, VALIGN, "top"),
  minHeight: (v) => num(v),
  hidden: (v) => bool(v),
};

/** Keep only whitelisted style keys per device layer (protects hand-edited data),
 *  coerced to their declared type. */
const responsive = (v: unknown): Responsive | undefined => {
  if (v == null) return undefined;
  const o = rec(v);
  const out: Responsive = {};
  for (const dev of ["tablet", "mobile"] as const) {
    const layer = rec(o[dev]);
    const clean: DeviceOverride = {};
    let any = false;
    for (const k of OVERRIDE_KEYS) {
      if (layer[k] !== undefined) {
        clean[k] = OVERRIDE_COERCE[k](layer[k]);
        any = true;
      }
    }
    if (any) out[dev] = clean;
  }
  return out.tablet || out.mobile ? out : undefined;
};

/* ── block normalizer ── */
const BLOCK_TYPES: readonly BlockType[] = [
  "heading", "text", "image", "button", "divider", "spacer",
  "social", "video", "html", "menu", "timer", "titleImage", "columns",
];

export function normalizeBlock(input: unknown): Block {
  const o = rec(input);
  const type = oneOf<BlockType>(o.type, BLOCK_TYPES, "text");
  const id = str(o.id) || genId();
  const base = {
    id,
    margin: sidesOpt(o.margin) ?? { t: 0, b: 0, l: 0, r: 0 },
    radius: numOpt(o.radius),
    rsp: responsive(o.rsp),
  };
  const d = defaultBlock(type) as Record<string, unknown>;

  switch (type) {
    case "heading":
      return {
        ...base, type,
        html: sanitizeRichHtml(str(o.html, d.html as string)),
        level: oneOf(o.level, ["h1", "h2", "h3"] as const, "h2"),
        fontSize: num(o.fontSize, d.fontSize as number),
        lineHeight: num(o.lineHeight, d.lineHeight as number),
        letterSpacing: letterSpacing(o.letterSpacing),
        weight: num(o.weight, d.weight as number),
        align: oneOf<TextAlign>(o.align, TEXT_ALIGN, "left"),
        color: blockColor(o.color, d.color as string),
        font: safeFontId(o.font) || undefined,
        padding: sides(o.padding, d.padding as Sides),
      };
    case "text":
      return {
        ...base, type,
        html: sanitizeRichHtml(str(o.html, d.html as string)),
        fontSize: num(o.fontSize, d.fontSize as number),
        lineHeight: num(o.lineHeight, d.lineHeight as number),
        align: oneOf<TextAlign>(o.align, TEXT_ALIGN, "left"),
        color: blockColor(o.color, d.color as string),
        font: safeFontId(o.font) || undefined,
        padding: sides(o.padding, d.padding as Sides),
      };
    case "image":
      return {
        ...base, type,
        src: str(o.src),
        alt: str(o.alt),
        href: str(o.href),
        newTab: bool(o.newTab, true),
        fullWidth: bool(o.fullWidth, true),
        width: num(o.width, 600),
        sizeUnit: oneOf(o.sizeUnit, ["pct", "px"] as const, "pct"),
        widthPct: num(o.widthPct, 100),
        offset: offset(o.offset),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        radius: num(o.radius, 0),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "button":
      return {
        ...base, type,
        text: str(o.text, d.text as string),
        href: str(o.href, "#"),
        bg: blockColor(o.bg, d.bg as string),
        color: blockColor(o.color, d.color as string),
        fontSize: num(o.fontSize, d.fontSize as number),
        weight: num(o.weight, d.weight as number),
        radius: num(o.radius, d.radius as number),
        padV: num(o.padV, d.padV as number),
        padH: num(o.padH, d.padH as number),
        fullWidth: bool(o.fullWidth, false),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        border: borderOpt(o.border),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "divider":
      return {
        ...base, type,
        thickness: num(o.thickness, 1),
        style: oneOf(o.style, ["solid", "dashed", "dotted"] as const, "solid"),
        color: blockColor(o.color, "#E5E5E5"),
        width: num(o.width, 100),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "spacer":
      return { ...base, type, height: num(o.height, 32) };
    case "social":
      return {
        ...base, type,
        networks: Array.isArray(o.networks)
          ? o.networks.map((n) => {
              const r = rec(n);
              return { id: str(r.id) || genId(), net: str(r.net, "facebook"), url: str(r.url, "#") };
            })
          : (d.networks as { id: string; net: string; url: string }[]),
        style: oneOf(o.style, ["rounded-color", "square-color", "rounded-mono", "square-mono"] as const, "rounded-color"),
        size: num(o.size, 34),
        gap: num(o.gap, 10),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "video":
      return {
        ...base, type,
        thumb: str(o.thumb),
        href: str(o.href),
        fullWidth: bool(o.fullWidth, true),
        width: num(o.width, 600),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        radius: num(o.radius, 8),
        showPlay: bool(o.showPlay, true),
        playColor: blockColor(o.playColor, "#FFFFFF"),
        playAccent: blockColor(o.playAccent, "#0F2542"),
        playOpacity: num(o.playOpacity, 95),
        playSize: num(o.playSize, 64),
        overlayText: str(o.overlayText),
        overlaySubtext: str(o.overlaySubtext),
        overlayColor: blockColor(o.overlayColor, "#FFFFFF"),
        overlayBg: blockColor(o.overlayBg, "#0F2542"),
        overlayOpacity: num(o.overlayOpacity, 35),
        overlayPosition: oneOf(o.overlayPosition, ["top", "center", "bottom"] as const, "top"),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "html":
      return { ...base, type, code: sanitizeRichHtml(str(o.code, d.code as string)) };
    case "menu":
      return {
        ...base, type,
        items: Array.isArray(o.items)
          ? o.items.map((it) => {
              const r = rec(it);
              return { id: str(r.id) || genId(), label: str(r.label, "Enlace"), href: str(r.href, "#") };
            })
          : (d.items as { id: string; label: string; href: string }[]),
        color: blockColor(o.color, d.color as string),
        fontSize: num(o.fontSize, d.fontSize as number),
        gap: num(o.gap, d.gap as number),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "timer":
      return {
        ...base, type,
        target: str(o.target, d.target as string),
        color: blockColor(o.color, "#0F2542"),
        boxBg: blockColor(o.boxBg, "#F4F6FA"),
        labelColor: blockColor(o.labelColor, "#737373"),
        showLabels: bool(o.showLabels, true),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "titleImage":
      return {
        ...base, type,
        text: str(o.text, d.text as string),
        font: str(o.font, "BebasNeue"),
        fontSize: num(o.fontSize, 48),
        color: blockColor(o.color, "#0F2542"),
        align: oneOf<Align>(o.align, ALIGN, "center"),
        imgW: numOpt(o.imgW),
        padding: sides(o.padding, d.padding as Sides),
      };
    case "columns": {
      const cols = Array.isArray(o.cols) && o.cols.length ? o.cols.map(normalizeSubColumn) : [newSubColumn(50), newSubColumn(50)];
      const block: ColumnsBlock = {
        ...base, type,
        cols,
        gap: num(o.gap, 16),
        stackMobile: bool(o.stackMobile, true),
        hideDesktop: bool(o.hideDesktop, false),
        hideMobile: bool(o.hideMobile, false),
        bg: safeCssColor(o.bg, "transparent"),
        bgType: oneOf<FillType>(o.bgType, FILL, "solid"),
        bgGradient: gradient(o.bgGradient),
        bgImage: safeHttpUrl(o.bgImage),
        bgRepeat: oneOf<BgRepeat>(o.bgRepeat, BG_REPEAT, "cover"),
        bgImageWidth: numOpt(o.bgImageWidth),
        bgOverlay: overlay(o.bgOverlay),
      };
      return block;
    }
    default: {
      const _never: never = type;
      throw new Error(`Bloque desconocido: ${_never}`);
    }
  }
}

export function normalizeSubColumn(input: unknown): SubColumn {
  const o = rec(input);
  return {
    id: str(o.id) || genId(),
    width: num(o.width, 50),
    blocks: Array.isArray(o.blocks) ? o.blocks.map(normalizeBlock) : [],
    padding: sides(o.padding, { t: 8, b: 8, l: 8, r: 8 }),
    margin: sidesOpt(o.margin),
    valign: oneOf<VAlign>(o.valign, VALIGN, "top"),
    bg: safeCssColor(o.bg, "transparent"),
    bgType: oneOf<FillType>(o.bgType, FILL, "solid"),
    bgGradient: gradient(o.bgGradient),
    bgImage: safeHttpUrl(o.bgImage) || undefined,
    bgRepeat: oneOf<BgRepeat>(o.bgRepeat, BG_REPEAT, "cover"),
    bgImageWidth: numOpt(o.bgImageWidth),
    bgOpacity: numOpt(o.bgOpacity),
    bgOverlay: overlay(o.bgOverlay),
    panel: panel(o.panel),
    rsp: responsive(o.rsp),
    border: borderOpt(o.border),
  };
}

export function normalizeColumn(input: unknown): Column {
  const o = rec(input);
  const base = newColumn(num(o.width, 100));
  return {
    id: str(o.id) || base.id,
    width: num(o.width, 100),
    blocks: Array.isArray(o.blocks) ? o.blocks.map(normalizeBlock) : [],
    padding: sides(o.padding),
    margin: sides(o.margin),
    bg: safeCssColor(o.bg, "transparent"),
    bgType: oneOf<FillType>(o.bgType, FILL, "solid"),
    bgGradient: gradient(o.bgGradient),
    bgImage: safeHttpUrl(o.bgImage),
    bgRepeat: oneOf<BgRepeat>(o.bgRepeat, BG_REPEAT, "cover"),
    bgImageWidth: numOpt(o.bgImageWidth),
    bgOpacity: o.bgOpacity != null ? num(o.bgOpacity, 100) : 100,
    bgOverlay: overlay(o.bgOverlay),
    panel: panel(o.panel),
    rsp: responsive(o.rsp),
    offset: offset(o.offset),
    valign: oneOf<VAlign>(o.valign, VALIGN, "top"),
    border: border(o.border),
  };
}

export function normalizeRow(input: unknown): Row {
  const o = rec(input);
  const base = newRow(str(o.layout, "100"));
  return {
    id: str(o.id) || base.id,
    layout: str(o.layout, "100"),
    cols: Array.isArray(o.cols) && o.cols.length ? o.cols.map(normalizeColumn) : base.cols,
    bgRow: safeCssColor(o.bgRow, "transparent"),
    bgContent: safeCssColor(o.bgContent, "transparent"),
    bgRowType: oneOf<FillType>(o.bgRowType, FILL, "solid"),
    bgRowGradient: gradient(o.bgRowGradient),
    bgContentType: oneOf<FillType>(o.bgContentType, FILL, "solid"),
    bgContentGradient: gradient(o.bgContentGradient),
    padding: sides(o.padding, { t: 16, b: 16, l: 0, r: 0 }),
    margin: sidesOpt(o.margin),
    border: border(o.border),
    radius: corners(o.radius),
    minHeight: numOpt(o.minHeight),
    offset: offset(o.offset),
    bgImage: safeHttpUrl(o.bgImage) || undefined,
    bgRepeat: oneOf<BgRepeat>(o.bgRepeat, BG_REPEAT, "cover"),
    bgImageWidth: numOpt(o.bgImageWidth),
    bgOverlay: overlay(o.bgOverlay),
    hideDesktop: bool(o.hideDesktop, false),
    hideMobile: bool(o.hideMobile, false),
    rsp: responsive(o.rsp),
  };
}

export function normalizeGlobal(input: unknown): GlobalSettings {
  const o = rec(input);
  return {
    // Clamped to the editor's own slider range: the AI HTML import infers this
    // from the source email, and a width outside it renders an email the editor
    // can no longer represent (or, at 0/negative, no email at all).
    width: clampNum(num(o.width, DEFAULT_GLOBAL.width), MIN_DOC_WIDTH, MAX_DOC_WIDTH),
    align: oneOf(o.align, ["left", "center"] as const, "center"),
    preheader: str(o.preheader),
    darkMode: bool(o.darkMode, false),
    lang: str(o.lang, "es"),
    dir: oneOf(o.dir, ["ltr", "rtl"] as const, "ltr"),
    canvasBg: safeCssColor(o.canvasBg, DEFAULT_GLOBAL.canvasBg),
    canvasBgImage: safeHttpUrl(o.canvasBgImage),
    contentBg: safeCssColor(o.contentBg, DEFAULT_GLOBAL.contentBg),
    contentRadius: num(o.contentRadius, 0),
    contentBgType: oneOf<FillType>(o.contentBgType, FILL, "solid"),
    contentGradient: gradient(o.contentGradient),
    contentBgImage: safeHttpUrl(o.contentBgImage) || undefined,
    contentBgOverlay: numOpt(o.contentBgOverlay),
    contentBorder: borderOpt(o.contentBorder),
    contentVAlign: oneOf<VAlign>(o.contentVAlign, VALIGN, "top"),
    minHeight: numOpt(o.minHeight),
    textColor: safeCssColor(o.textColor, DEFAULT_GLOBAL.textColor),
    linkColor: safeCssColor(o.linkColor, DEFAULT_GLOBAL.linkColor),
    font: safeFontId(o.font, DEFAULT_GLOBAL.font),
    padding: sides(o.padding),
  };
}

/* ── (de)serialization ── */

/** Serialize live editor state into the persisted v3 design schema. */
export function serializeDesign(g: GlobalSettings, rows: Row[]): EmailDesign {
  return {
    version: DESIGN_VERSION,
    generator: DESIGN_GENERATOR,
    body: { global: g, rows },
  };
}

/** Has our generator marker + a structurally-plausible body (any version). */
export function isBeCrmDesign(design: unknown): boolean {
  const d = rec(design);
  if (d.generator !== DESIGN_GENERATOR) return false;
  const body = rec(d.body);
  return Array.isArray(body.rows);
}

/** Lenient guard: anything with a body whose rows are an array can be read. */
export function hasReadableBody(design: unknown): boolean {
  const body = rec(rec(design).body);
  return Array.isArray(body.rows);
}

/**
 * Deserialize + normalize a persisted design into live editor state.
 *
 * Recognition is by our `generator` marker (v2 AND v3 carry it) — NOT just the
 * presence of `body.rows`. This is deliberate: designs from the PREVIOUS editor
 * (a different format that also happens to expose `body.rows`) must be treated
 * as foreign so we never reinterpret them into a near-empty document. Foreign /
 * unrecognizable input → blank document with recognized:false, and callers
 * (editTemplate guard, backfill) keep the previously-rendered html intact.
 */
export function deserializeDesign(design: unknown): { g: GlobalSettings; rows: Row[]; recognized: boolean } {
  if (isBeCrmDesign(design)) {
    const body = rec(rec(design).body);
    return {
      g: normalizeGlobal(body.global),
      rows: (body.rows as unknown[]).map(normalizeRow),
      recognized: true,
    };
  }
  return { g: normalizeGlobal(undefined), rows: [], recognized: false };
}
