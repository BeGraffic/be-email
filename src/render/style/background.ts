/* ============================================================
   BeCRM — Email Builder · style/background.ts
   Surface backgrounds (color / gradient / plain image + solid scrim overlay).
   Shared by the renderer and the editor canvas. No server-side pixel baking,
   no blur/filters/foreground images — only what email clients render reliably.
   Outlook desktop ignores gradients/CSS bg images: callers add a VML fallback
   (render/vml.ts) + a solid color fallback (emitted here as backgroundColor).
   ============================================================ */
import type { CSSProperties } from "react";
import { colorWithOpacity, gradientCss, hexToRgba, isTransparent } from "./colors";
import type {
  Column,
  ColumnsBlock,
  ContentPanel,
  FillType,
  GlobalSettings,
  Gradient,
  ImageOverlay,
  Row,
  SubColumn,
} from "../model/types";

export type SurfaceOpts = {
  color?: string;
  type?: FillType;
  gradient?: Gradient;
  image?: string;
  repeat?: "cover" | "repeat" | "center";
  imageWidth?: number;
  overlay?: ImageOverlay;
  colorOpacity?: number; // 0-100 alpha of the solid color
};

function overlayCss(ov?: ImageOverlay): string | null {
  const op = ov ? Math.max(0, Math.min(100, ov.opacity ?? 0)) : 0;
  if (!ov || !op) return null;
  const c = hexToRgba(ov.color || "#000000", op);
  return `linear-gradient(${c}, ${c})`; // uniform solid scrim
}

/**
 * Surface background CSS combining a solid color, a gradient, and a plain image
 * with an optional solid scrim. Returns longhand props so it can be spread.
 * Layer order (top→bottom): overlay scrim → image → gradient (as fill).
 */
export function surfaceBackground(opts: SurfaceOpts): CSSProperties {
  const useGradient = opts.type === "gradient" && !!opts.gradient?.from && !!opts.gradient?.to;

  const images: string[] = [];
  const sizes: string[] = [];
  const repeats: string[] = [];
  const add = (img: string, size: string, repeat: string) => {
    images.push(img);
    sizes.push(size);
    repeats.push(repeat);
  };

  if (opts.image) {
    const scrim = overlayCss(opts.overlay);
    if (scrim) add(scrim, "100% 100%", "no-repeat");
    const tiled = opts.repeat === "repeat";
    const size = opts.imageWidth ? `${opts.imageWidth}px auto` : tiled ? "auto" : "cover";
    add(`url("${opts.image}")`, size, tiled ? "repeat" : "no-repeat");
  }
  if (useGradient) add(gradientCss(opts.gradient!), "100% 100%", "no-repeat");

  const style: CSSProperties = {};
  if (useGradient) style.backgroundColor = opts.gradient!.from; // Outlook fallback
  else if (!isTransparent(opts.color)) {
    style.backgroundColor = colorWithOpacity(opts.color!, opts.colorOpacity ?? 100);
  }

  if (images.length) {
    style.backgroundImage = images.join(", ");
    style.backgroundSize = sizes.join(", ");
    style.backgroundRepeat = repeats.join(", ");
    style.backgroundPosition = "center";
  }
  return style;
}

/** Full-width (100%) row background — color or gradient only. */
export function rowOuterBackground(row: Row): CSSProperties {
  return surfaceBackground({
    color: row.bgRow,
    type: row.bgRowType,
    gradient: row.bgRowGradient,
  });
}

/** Content-width row background — color/gradient + plain image + scrim. */
export function rowContentBackground(row: Row): CSSProperties {
  return surfaceBackground({
    color: row.bgContent,
    type: row.bgContentType,
    gradient: row.bgContentGradient,
    image: row.bgImage || undefined,
    repeat: row.bgRepeat,
    imageWidth: row.bgImageWidth,
    overlay: row.bgOverlay,
  });
}

export function columnSurface(col: Column): CSSProperties {
  return surfaceBackground({
    color: col.bg,
    type: col.bgType,
    gradient: col.bgGradient,
    colorOpacity: col.bgOpacity,
    image: col.bgImage || undefined,
    repeat: col.bgRepeat,
    imageWidth: col.bgImageWidth,
    overlay: col.bgOverlay,
  });
}

export function subColumnSurface(sc: SubColumn): CSSProperties {
  return surfaceBackground({
    color: sc.bg,
    type: sc.bgType,
    gradient: sc.bgGradient,
    colorOpacity: sc.bgOpacity,
    image: sc.bgImage || undefined,
    repeat: sc.bgRepeat,
    imageWidth: sc.bgImageWidth,
    overlay: sc.bgOverlay,
  });
}

export function columnsBlockBackground(b: ColumnsBlock): CSSProperties {
  return surfaceBackground({
    color: b.bg,
    type: b.bgType,
    gradient: b.bgGradient,
    image: b.bgImage || undefined,
    repeat: b.bgRepeat,
    imageWidth: b.bgImageWidth,
    overlay: b.bgOverlay,
  });
}

/** Content container (the ≤600px body box) background. */
export function contentSurface(g: GlobalSettings): CSSProperties {
  const overlay: ImageOverlay | undefined =
    g.contentBgImage && g.contentBgOverlay ? { color: "#000000", opacity: g.contentBgOverlay } : undefined;
  return surfaceBackground({
    color: g.contentBg,
    type: g.contentBgType,
    gradient: g.contentGradient,
    image: g.contentBgImage || undefined,
    repeat: "cover",
    overlay,
  });
}

export function contentPanelActive(panel?: ContentPanel): boolean {
  return !!(panel && panel.enabled);
}

/** Glass card: translucent scrim (rgba) + radius + padding. undefined if off. */
export function contentPanelStyle(panel?: ContentPanel): CSSProperties | undefined {
  if (!contentPanelActive(panel)) return undefined;
  const p = panel!.padding ?? { t: 18, b: 18, l: 18, r: 18 };
  return {
    backgroundColor: colorWithOpacity(panel!.color || "#000000", panel!.opacity ?? 40),
    borderRadius: panel!.radius || undefined,
    padding: `${p.t}px ${p.r}px ${p.b}px ${p.l}px`,
  };
}
