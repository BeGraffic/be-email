/* ============================================================
   BeCRM — Email Builder · model/types.ts  (v3)
   ------------------------------------------------------------
   Single source of truth for the editor document model AND the JSON we
   persist in Firestore `design`. Designed to be 1:1 renderable by the
   React Email renderer (src/lib/email/render): every field here maps to
   something an email client can actually show. Unreliable/email-unsafe
   effects from the v2 model (image blur, color filters, foreground
   overlay images, mosaic canvas fit) were intentionally dropped — see
   migrate.ts for how v2 designs fold into this shape.
   ============================================================ */

/* ── Primitives ── */
export type Sides = { t: number; b: number; l: number; r: number };
/** Per-corner radius (top-left, top-right, bottom-right, bottom-left). */
export type Corners = { tl: number; tr: number; br: number; bl: number };
/** px offset; negatives allowed (lets an element overhang via position:relative). */
export type Offset = { x: number; y: number };

export type BorderStyle = "none" | "solid" | "dashed" | "dotted";
export type Border = { style: BorderStyle; width: number; color: string };

/** Background fill: flat color or a linear gradient. */
export type FillType = "solid" | "gradient";
/** Linear gradient. `angle` in CSS degrees (0 = up, 90 = right, 180 = down).
 *  Outlook desktop ignores gradients → falls back to `from`. */
export type Gradient = { from: string; to: string; angle: number };

/** Solid translucent scrim laid over a background image (for text legibility).
 *  `opacity` 0-100 → rgba alpha. Email-safe (just a colored layer). */
export type ImageOverlay = { color: string; opacity: number };

/** Translucent "glass card" placed over a column/subcolumn background image,
 *  behind the content, to keep text legible. `color` hex scrim, `opacity`
 *  0-100 → rgba alpha. Degrades to no-card in desktop Outlook (rgba/radius). */
export type ContentPanel = {
  enabled: boolean;
  color: string;
  opacity: number;
  radius: number;
  padding: Sides;
};

export type Align = "left" | "center" | "right";
export type TextAlign = Align | "justify";
export type VAlign = "top" | "middle" | "bottom";
export type BgRepeat = "cover" | "repeat" | "center";

/* ── Per-device responsive overrides ──
   Desktop is the canonical base; `tablet`/`mobile` are SPARSE override layers
   stored on the entity (`rsp`). Only style/visibility keys may vary per device
   (OVERRIDE_KEYS in style/responsive.ts); colors, text, links and fonts are
   shared across views. Cascade: mobile inherits tablet inherits base. */
export type OverrideDevice = "tablet" | "mobile";
export type OverrideKey =
  | "fontSize"
  | "lineHeight"
  | "letterSpacing"
  | "align"
  | "padding"
  | "margin"
  | "weight"
  | "height"
  | "width"
  | "widthPct"
  | "sizeUnit"
  | "fullWidth"
  | "padV"
  | "padH"
  | "radius"
  | "valign"
  | "minHeight"
  | "hidden";
export type DeviceOverride = Partial<Record<OverrideKey, unknown>>;
export type Responsive = Partial<Record<OverrideDevice, DeviceOverride>>;

/* ── Backgrounds ──
   A reusable surface background descriptor shared by columns, sub-columns and
   the columns block. Color (optionally translucent), gradient, plain image
   (cover/repeat/center) with a solid scrim overlay. No blur/filters/opacity
   baking — those are not reliably renderable in email. */
export type SurfaceBg = {
  color?: string;
  type?: FillType; // "solid" (uses color) | "gradient" (uses gradient)
  gradient?: Gradient;
  colorOpacity?: number; // 0-100 alpha of the solid color (rgba; works everywhere)
  image?: string; // "" / undefined = none
  repeat?: BgRepeat;
  imageWidth?: number; // px for repeat tiling; 0/undefined = auto
  overlay?: ImageOverlay; // solid scrim over the image
};

/* ── Blocks ── */
export type BlockType =
  | "heading"
  | "text"
  | "image"
  | "button"
  | "divider"
  | "spacer"
  | "social"
  | "video"
  | "html"
  | "menu"
  | "timer"
  | "titleImage"
  | "columns";

type BlockBase = {
  id: string;
  margin?: Sides;
  /** Generic block corner radius (px). image/button/video use their own `radius`. */
  radius?: number;
  rsp?: Responsive;
};

export type HeadingBlock = BlockBase & {
  type: "heading";
  html: string;
  level: "h1" | "h2" | "h3";
  fontSize: number;
  lineHeight: number;
  /** Espaciado de letras en px (negativo permitido). 0/undefined = normal. */
  letterSpacing?: number;
  weight: number;
  align: TextAlign;
  color: string;
  font?: string; // empty/undefined = inherit global font
  padding: Sides;
};

export type TextBlock = BlockBase & {
  type: "text";
  html: string;
  fontSize: number;
  lineHeight: number;
  align: TextAlign;
  color: string;
  font?: string;
  padding: Sides;
};

export type ImageSizeUnit = "pct" | "px";
export type ImageBlock = BlockBase & {
  type: "image";
  src: string;
  alt: string;
  href: string;
  newTab: boolean;
  fullWidth: boolean; // legacy compat (mirrors sizeUnit "pct" + widthPct 100)
  width: number; // px when sizeUnit === "px"
  sizeUnit?: ImageSizeUnit;
  widthPct?: number; // 1-100, % of container when sizeUnit === "pct"
  offset?: Offset; // overhang the row (best-effort; degrades in Outlook)
  align: Align;
  radius: number;
  padding: Sides;
};

export type ButtonBlock = BlockBase & {
  type: "button";
  text: string;
  href: string;
  bg: string;
  color: string;
  fontSize: number;
  weight: number;
  radius: number;
  padV: number; // inner vertical padding
  padH: number; // inner horizontal padding
  fullWidth: boolean;
  align: Align;
  border?: Border; // optional outline (e.g. ghost buttons)
  padding: Sides; // outer wrapper padding
};

export type DividerBlock = BlockBase & {
  type: "divider";
  thickness: number;
  style: "solid" | "dashed" | "dotted";
  color: string;
  width: number; // percent
  align: Align;
  padding: Sides;
};

export type SpacerBlock = BlockBase & {
  type: "spacer";
  height: number;
};

export type SocialNetwork = { id: string; net: string; url: string };
export type SocialStyle =
  | "rounded-color"
  | "square-color"
  | "rounded-mono"
  | "square-mono";
export type SocialBlock = BlockBase & {
  type: "social";
  networks: SocialNetwork[];
  style: SocialStyle;
  size: number;
  gap: number;
  align: Align;
  padding: Sides;
};

export type VideoBlock = BlockBase & {
  type: "video";
  thumb: string;
  href: string;
  fullWidth: boolean;
  width: number; // max px when not fullWidth
  align: Align;
  radius: number;
  // play button
  showPlay: boolean;
  playColor: string;
  playAccent: string;
  playOpacity: number; // 0-100
  playSize: number; // px
  // overlay text
  overlayText: string;
  overlaySubtext: string;
  overlayColor: string;
  overlayBg: string;
  overlayOpacity: number; // 0-90
  overlayPosition: "top" | "center" | "bottom";
  padding: Sides;
};

export type HtmlBlock = BlockBase & {
  type: "html";
  code: string;
};

export type MenuItem = { id: string; label: string; href: string };
export type MenuBlock = BlockBase & {
  type: "menu";
  items: MenuItem[];
  color: string;
  fontSize: number;
  gap: number;
  align: Align;
  padding: Sides;
};

export type TimerBlock = BlockBase & {
  type: "timer";
  target: string; // ISO datetime-local
  color: string;
  boxBg: string;
  labelColor: string;
  showLabels: boolean;
  align: Align;
  padding: Sides;
};

/** Creative font rendered AS an image (server raster → identical in every
 *  client). `font` = IMAGE_FONTS id. `imgW` = cached display width for 2× retina. */
export type TitleImageBlock = BlockBase & {
  type: "titleImage";
  text: string;
  font: string;
  fontSize: number;
  color: string;
  align: Align;
  imgW?: number;
  padding: Sides;
};

/** A sub-column of a `columns` block. Mirrors a Column's surface so a row can be
 *  losslessly converted into a columns block. Recursive: its blocks may include
 *  further `columns` blocks. */
export type SubColumn = {
  id: string;
  width: number; // percent
  blocks: Block[];
  padding: Sides;
  margin?: Sides;
  valign: VAlign;
  bg: string;
  bgType?: FillType;
  bgGradient?: Gradient;
  bgImage?: string;
  bgRepeat?: BgRepeat;
  bgImageWidth?: number;
  bgOpacity?: number; // color alpha 0-100
  bgOverlay?: ImageOverlay;
  panel?: ContentPanel;
  rsp?: Responsive;
  border?: Border;
};

/** Nested columns inside a single column — rendered email-safe as a nested
 *  table, with media-query stacking + Outlook ghost tables. */
export type ColumnsBlock = BlockBase & {
  type: "columns";
  cols: SubColumn[];
  gap: number; // px between sub-columns
  stackMobile: boolean;
  hideDesktop?: boolean;
  hideMobile?: boolean;
  // block-level background (same surface options as a row content area)
  bg?: string;
  bgType?: FillType;
  bgGradient?: Gradient;
  bgImage?: string;
  bgRepeat?: BgRepeat;
  bgImageWidth?: number;
  bgOverlay?: ImageOverlay;
};

export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | SocialBlock
  | VideoBlock
  | HtmlBlock
  | TitleImageBlock
  | MenuBlock
  | TimerBlock
  | ColumnsBlock;

/* ── Columns & rows ── */
export type Column = {
  id: string;
  width: number; // percent
  blocks: Block[];
  padding: Sides;
  margin: Sides;
  bg: string;
  bgType?: FillType;
  bgGradient?: Gradient;
  bgImage: string;
  bgRepeat: BgRepeat;
  bgImageWidth?: number;
  bgOpacity?: number; // color alpha 0-100
  bgOverlay?: ImageOverlay; // scrim over the column bg image
  panel?: ContentPanel;
  rsp?: Responsive;
  offset?: Offset;
  valign: VAlign;
  border: Border;
};

export type Row = {
  id: string;
  layout: string; // STRUCTURE_DEFS id
  cols: Column[];
  bgRow: string; // full-width (100%) background color
  bgContent: string; // content-width background color
  bgRowType?: FillType;
  bgRowGradient?: Gradient;
  bgContentType?: FillType;
  bgContentGradient?: Gradient;
  padding: Sides;
  margin?: Sides;
  border: Border;
  radius?: Corners;
  minHeight?: number; // px (0/undefined = auto) — drives the "hero" height
  offset?: Offset;
  bgImage?: string; // content-area background image (plain cover/repeat)
  bgRepeat?: BgRepeat;
  bgImageWidth?: number;
  bgOverlay?: ImageOverlay; // scrim over the content bg image
  hideDesktop: boolean;
  hideMobile: boolean;
  rsp?: Responsive;
};

/* ── Global body settings ── */
export type GlobalSettings = {
  width: number; // body/content width (≤600 recommended)
  align: "left" | "center";
  /** Inbox preview/snippet text (preheader). Improves deliverability + UX. */
  preheader?: string;
  /** Best-effort dark mode: emits color-scheme meta + prefers-color-scheme rules. */
  darkMode?: boolean;
  lang?: string; // default "es"
  dir?: "ltr" | "rtl";
  canvasBg: string; // outer canvas color
  canvasBgImage?: string; // plain cover image behind the content ("" = none)
  contentBg: string; // content container color
  contentRadius?: number;
  contentBgType?: FillType;
  contentGradient?: Gradient;
  contentBgImage?: string;
  contentBgOverlay?: number; // 0-100 solid dark scrim over the content image
  contentBorder?: Border;
  contentVAlign?: VAlign;
  minHeight?: number; // px min body height
  textColor: string;
  linkColor: string;
  font: string; // global font family id
  padding: Sides;
};

/* ── Live editor document (in-memory) ── */
export type EmailDoc = {
  name: string;
  g: GlobalSettings;
  rows: Row[];
};

/* ============================================================
   PERSISTED DESIGN SCHEMA
   ------------------------------------------------------------
   Stored verbatim in Firestore `design`. Must expose a truthy top-level
   `body` so the shared validator isValidTemplateDesign() accepts it.
   The `generator` marker is unchanged from v2 so existing tooling keeps
   recognising our designs; `version` bumps to 3.
   ============================================================ */
export const DESIGN_GENERATOR = "becrm-email-editor";
export const DESIGN_VERSION = 3 as const;

export type EmailDesign = {
  version: typeof DESIGN_VERSION;
  generator: typeof DESIGN_GENERATOR;
  body: {
    global: GlobalSettings;
    rows: Row[];
  };
};

/* ── Selection / drag state (editor-only, not persisted) ── */
export type Selection =
  | { kind: null }
  | { kind: "row"; rowId: string }
  | { kind: "column"; rowId: string; colIndex: number }
  | { kind: "block"; rowId: string; colIndex: number; blockId: string }
  | { kind: "subcolumn"; rowId: string; colIndex: number; parentId: string; subColId: string };

export type DragItem =
  | { kind: "block"; blockType: BlockType }
  | { kind: "structure"; structureId: string }
  | { kind: "row-move"; rowId: string }
  | { kind: "block-move"; rowId: string; colIndex: number; blockId: string }
  | null;

export type Device = "desktop" | "tablet" | "mobile";
