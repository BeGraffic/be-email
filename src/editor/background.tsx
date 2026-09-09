/* ============================================================
   @begraffic/email/editor · background.tsx (compat shim → shared style)
   Surface backgrounds now live in ../render/style. Re-exported here, plus a
   small editor-only <CanvasBgLayers> for the live canvas preview of the outer
   canvas background image (plain cover — effects were dropped in v3).
   ============================================================ */
import type { GlobalSettings } from "./types";

export {
  surfaceBackground,
  rowOuterBackground,
  rowContentBackground,
  columnSurface,
  subColumnSurface,
  columnsBlockBackground,
  contentSurface,
  contentPanelStyle,
  contentPanelActive,
} from "../render/style/background";
export { colorWithOpacity, gradientCss, hexToRgba, isTransparent, DEFAULT_GRADIENT, DEFAULT_OVERLAY } from "../render/style/colors";

export function hasCanvasBgImage(g: GlobalSettings): boolean {
  return !!(g.canvasBgImage && g.canvasBgImage.trim());
}

/** Editor-only: the outer canvas background image layer (plain cover). */
export function CanvasBgLayers({ g }: { g: GlobalSettings }) {
  if (!hasCanvasBgImage(g)) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "inherit",
        zIndex: 0,
        pointerEvents: "none",
        backgroundImage: `url("${g.canvasBgImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}
