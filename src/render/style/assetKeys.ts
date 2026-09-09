/* ============================================================
   BeCRM — Email Builder · style/assetKeys.ts
   Deterministic, filesystem-safe keys for generated images that get baked to
   Firebase Storage (title-image, video poster, social icon). The key is derived
   from the SAME params the endpoint URL uses, so the baker and the renderer
   always agree on the key. Pure (client + server safe).
   ============================================================ */
import { textImageUrl, type ImageFontDef } from "./imageFonts";
import { videoPosterUrl } from "./video";
import { countdownUrl, type CountdownParams } from "./countdown";

/** Small FNV-1a hash → base36 (short, stable, no deps). */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export type TitleImageParams = Parameters<typeof textImageUrl>[0];
export type VideoPosterParams = Parameters<typeof videoPosterUrl>[0];

/** Key for a title (creative-font) image, derived from its render params. */
export function titleImageKey(b: TitleImageParams): string {
  return "ti-" + hash(textImageUrl(b, ""));
}

/** Key for a video poster image, derived from its render params. `effW` is the
 *  effective display width (videoDisplayWidth) — it's part of the URL, so it
 *  must be part of the key for the baker and the renderer to agree. */
export function videoPosterKey(b: VideoPosterParams, effW?: number): string {
  return "vp-" + hash(videoPosterUrl(b, "", effW));
}

/** Key for a social network glyph (one white icon per network). */
export function socialIconKey(net: string): string {
  return "si-" + net.replace(/[^a-z0-9]/gi, "");
}

/** Key for a countdown image, derived from its params (NOT including the time;
 *  the baker refreshes the content over time but the lookup key stays stable). */
export function countdownKey(b: CountdownParams): string {
  return "cd-" + hash(countdownUrl(b, ""));
}

// Re-export so the baker can reference the font catalog type if needed.
export type { ImageFontDef };
