/* ============================================================
   BeCRM — Email Builder · style/video.ts
   Derive a video block's poster thumbnail + self-contained placeholders.
   Pure helper (no React/DOM) used by both the server render and the canvas.
   ============================================================ */
const svgDataUri = (svg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(svg);

/** Extract a YouTube video id from the common URL shapes. */
export function youtubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}

/** Extract a Vimeo video id. */
export function vimeoId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  return m ? m[1] : null;
}

/**
 * Video thumbnail URL, in order of preference:
 * 1) the manual thumb if set,
 * 2) the YouTube thumbnail derived from the URL,
 * 3) the Vimeo thumbnail via vumbnail.com (Vimeo's own API needs auth),
 * 4) null (caller decides the fallback poster).
 */
export function videoThumbUrl(href: string, thumb: string): string | null {
  const manual = thumb?.trim();
  if (manual) return manual;
  const yt = youtubeId(href || "");
  if (yt) return `https://img.youtube.com/vi/${yt}/hqdefault.jpg`;
  const vm = vimeoId(href || "");
  if (vm) return `https://vumbnail.com/${vm}.jpg`;
  return null;
}

/** Effective displayed width (px) of a video block inside a column of `availW`
 *  px: fullWidth videos shrink to the column's usable width (capped at 600,
 *  floored at the generator's 80px minimum); fixed-width ones keep b.width.
 *  Shared so the renderer, the poster URL/key and the asset baker always agree
 *  on the width the poster is composited at. */
export function videoDisplayWidth(b: { fullWidth?: boolean; width?: number }, availW: number, padL = 0, padR = 0): number {
  return b.fullWidth !== false ? Math.max(80, Math.min(600, availW - padL - padR)) : b.width ?? 600;
}

/** URL of the endpoint that composites the poster (thumbnail + play button +
 *  overlay text) into ONE image — email-safe centering (position:absolute is
 *  stripped by Gmail/Outlook, so we bake the overlay server-side). `base` empty
 *  = relative (editor); absolute = send HTML. `effW` = effective display width
 *  (videoDisplayWidth) so posters in narrow columns aren't baked at 600px. */
export function videoPosterUrl(
  b: {
    href?: string;
    thumb?: string;
    fullWidth?: boolean;
    width?: number;
    showPlay?: boolean;
    playColor?: string;
    playAccent?: string;
    playOpacity?: number;
    playSize?: number;
    overlayText?: string;
    overlaySubtext?: string;
    overlayColor?: string;
    overlayBg?: string;
    overlayOpacity?: number;
    overlayPosition?: string;
  },
  base = "",
  effW?: number,
): string {
  const thumb = videoThumbUrl(b.href ?? "", b.thumb ?? "");
  const p = new URLSearchParams();
  if (thumb) p.set("thumb", thumb);
  p.set("w", String(effW ?? (b.fullWidth !== false ? 600 : b.width ?? 600)));
  if (b.showPlay !== false) {
    p.set("play", "1");
    p.set("pc", b.playColor ?? "#FFFFFF");
    p.set("pa", b.playAccent ?? "#0F2542");
    p.set("po", String(b.playOpacity ?? 95));
    p.set("ps", String(b.playSize ?? 64));
  }
  if (b.overlayText) p.set("t", b.overlayText);
  if (b.overlaySubtext) p.set("st", b.overlaySubtext);
  if (b.overlayText || b.overlaySubtext) {
    p.set("tc", b.overlayColor ?? "#FFFFFF");
    p.set("ob", b.overlayBg ?? "#0F2542");
    p.set("oo", String(b.overlayOpacity ?? 35));
    p.set("opos", b.overlayPosition ?? "top");
  }
  return `${base}/api/email/video-poster?${p.toString()}`;
}

/** Fallback poster (inline SVG: dark bg + play button) when no thumb is derivable. */
export const VIDEO_POSTER_FALLBACK = svgDataUri(
  "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='320'>" +
    "<rect width='600' height='320' fill='#0F2542'/>" +
    "<circle cx='300' cy='160' r='44' fill='rgba(255,255,255,0.92)'/>" +
    "<path d='M289 137 L289 183 L323 160 Z' fill='#0F2542'/>" +
    "</svg>",
);

/** Neutral placeholder for image blocks without a `src`. */
export const IMAGE_PLACEHOLDER = svgDataUri(
  "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='240'>" +
    "<rect width='600' height='240' fill='#E8EDF3'/>" +
    "<text x='300' y='128' font-family='sans-serif' font-size='18' font-weight='600' fill='#7B8794' text-anchor='middle'>Imagen</text>" +
    "</svg>",
);
