/* ============================================================
   BeCRM — Email Builder · style/colors.ts
   Pure color helpers shared by the renderer and the editor canvas.
   ============================================================ */
import type { Gradient, ImageOverlay } from "../model/types";

/** Default gradient applied when the gradient fill mode is turned on. */
export const DEFAULT_GRADIENT: Gradient = { from: "#1E4876", to: "#0F2542", angle: 135 };
/** Default overlay (invisible until opacity is raised). */
export const DEFAULT_OVERLAY: ImageOverlay = { color: "#000000", opacity: 0 };

/** Convert a hex color (#RGB or #RRGGBB) + opacity (0-100) into rgba().
 *  Falls back to dark navy if the hex is invalid. */
export function hexToRgba(hex: string, opacityPercent: number): string {
  const a = Math.max(0, Math.min(100, opacityPercent)) / 100;
  let h = (hex || "").trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return `rgba(15,37,66,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/** Apply opacity (0-100) to a solid color → rgba. Supports hex and rgb()/rgba();
 *  other formats (CSS names, hsl) or opacity 100 are returned unchanged. */
export function colorWithOpacity(color: string, opacity: number): string {
  if (opacity >= 100) return color;
  const c = (color || "").trim();
  if (/^#/.test(c)) return hexToRgba(c, opacity);
  const m = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${opacity / 100})`;
  return color;
}

/** CSS for a linear gradient. */
export function gradientCss(grad: Gradient): string {
  return `linear-gradient(${grad.angle}deg, ${grad.from}, ${grad.to})`;
}

/** Is this color effectively "no fill"? */
export function isTransparent(color?: string): boolean {
  return !color || color === "transparent" || color === "none";
}
