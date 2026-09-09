/* ============================================================
   @begraffic/email/editor · responsive.ts (compat shim → shared style)
   Per-device resolve/route helpers (the editor read/write seams) now live in
   the unified ../render/style/responsive (shared with the renderer).
   ============================================================ */
export {
  resolveForDevice,
  resolvedHidden,
  routePatch,
  hasDeviceOverride,
  clearDeviceOverridePatch,
} from "../render/style/responsive";
export { OVERRIDE_KEYS } from "../render/model/constants";
