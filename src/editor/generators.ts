/* ============================================================
   @begraffic/email/editor · generators.ts (compat shim → shared style)
   Presentational helpers now live in ../render/style/engine (shared with the
   renderer, so the canvas can't drift from the send HTML). The old foreground
   image + React-Email-JSX generators were dropped in v3.
   ============================================================ */
import { serializeDesign } from "../render/model";
import type { GlobalSettings, Row } from "./types";

export {
  COLUMN_GUTTER,
  padCss,
  offsetStyle,
  offsetActive,
  cornersCss,
  borderCss,
  imageWidthCss,
  stripHtml,
  vAlignToJustify,
  rowContentNeedsVisible,
  docNeedsVisible,
} from "../render/style/engine";

/** JSON schema export (also what we persist) — for the "Ver código" JSON tab. */
export function buildJSON(rows: Row[], g: GlobalSettings): string {
  return JSON.stringify(serializeDesign(g, rows), null, 2);
}
