/* ============================================================
   BeCRM — Email Builder · style/engine.ts
   The shared "node → CSSProperties + layout decisions" core. Imported by BOTH
   the React Email renderer (send/preview) and the editor canvas, so the live
   preview can never diverge from what ships. Pure functions only.
   ============================================================ */
import type { CSSProperties } from "react";
import type { Block, Border, Column, Corners, ImageBlock, Offset, Row, Sides, VAlign } from "../model/types";

/** Inter-column gutter (px) between the columns of a multi-column row. The SAME
 *  value must inset each column on the editor canvas (Canvas.tsx) and on the
 *  send HTML (EmailDocument ColumnNode) so both surfaces stay WYSIWYG. */
export const COLUMN_GUTTER = 4;

/** Padding shorthand "t r b l". */
export const padCss = (p?: Sides): string => {
  const s = p ?? { t: 0, r: 0, b: 0, l: 0 };
  return `${s.t}px ${s.r}px ${s.b}px ${s.l}px`;
};

export const offsetActive = (o?: Offset): boolean => !!(o && (o.x || o.y));

/** Offset via position:relative so an element can overhang without reflowing the
 *  rest. Negatives allowed. Degrades gracefully in Outlook (ignored). */
export const offsetStyle = (o?: Offset): CSSProperties =>
  offsetActive(o) ? { position: "relative", left: o!.x, top: o!.y } : {};

/** Per-corner border-radius shorthand; undefined if all corners are 0. */
export const cornersCss = (c?: Corners): string | undefined =>
  c && (c.tl || c.tr || c.br || c.bl) ? `${c.tl}px ${c.tr}px ${c.br}px ${c.bl}px` : undefined;

/** Border shorthand "Wpx style color"; undefined if style is none/width 0. */
export const borderCss = (b?: Border): string | undefined =>
  b && b.style !== "none" && b.width > 0 ? `${b.width}px ${b.style} ${b.color}` : undefined;

/** Effective image width per its unit (% of container or px). */
export function imageWidthCss(b: Pick<ImageBlock, "fullWidth" | "width" | "sizeUnit" | "widthPct">): string | number {
  const unit = b.sizeUnit ?? (b.fullWidth ? "pct" : "px");
  if (unit === "pct") return `${Math.max(1, Math.min(100, b.widthPct ?? 100))}%`;
  return b.width;
}

/** Strip tags → plain text (for previews / titles). */
export const stripHtml = (h?: string): string => (h || "").replace(/<[^>]+>/g, "").trim();

/** flex justify-content equivalent for a vertical alignment. */
export const vAlignToJustify = (v?: VAlign): CSSProperties["justifyContent"] =>
  v === "middle" ? "center" : v === "bottom" ? "flex-end" : "flex-start";

/* ── Overflow / protrusion: keep overflow visible only where something overhangs.
   In v3 only image blocks (and rows/columns) carry an offset. ── */
const blockProtrudes = (b: Block): boolean => b.type === "image" && offsetActive(b.offset);
const colProtrudes = (c: Column): boolean => offsetActive(c.offset) || c.blocks.some(blockProtrudes);
export const rowContentNeedsVisible = (row: Row): boolean => row.cols.some(colProtrudes);
export const docNeedsVisible = (rows: Row[]): boolean =>
  rows.some((r) => offsetActive(r.offset) || rowContentNeedsVisible(r));
