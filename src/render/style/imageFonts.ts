/* ============================================================
   BeCRM — Email Builder · style/imageFonts.ts
   Creative fonts RENDERED AS AN IMAGE (the "Título imagen" block). The text is
   rasterized server-side (sharp + bundled TTF in public/email/fonts) so it looks
   identical in every client (Gmail, Outlook). Pure data module: used by the
   server endpoint and the editor panel.
   ============================================================ */
export type ImageFontDef = {
  id: string; // stored in the block
  label: string;
  family: string; // exact TTF family name (Pango/sharp)
  file: string; // file under public/email/fonts/
  category: string;
};

export const IMAGE_FONTS: ImageFontDef[] = [
  { id: "BebasNeue", label: "Bebas Neue", family: "Bebas Neue", file: "BebasNeue.ttf", category: "Display impactante" },
  { id: "Anton", label: "Anton", family: "Anton", file: "Anton.ttf", category: "Display impactante" },
  { id: "Pacifico", label: "Pacifico", family: "Pacifico", file: "Pacifico.ttf", category: "Script / manuscrita" },
  { id: "Lobster", label: "Lobster", family: "Lobster", file: "Lobster.ttf", category: "Script / manuscrita" },
  { id: "Baloo2", label: "Baloo 2", family: "Baloo 2", file: "Baloo2.ttf", category: "Redondeada" },
  { id: "AbrilFatface", label: "Abril Fatface", family: "Abril Fatface", file: "AbrilFatface.ttf", category: "Serif elegante" },
  { id: "PlayfairDisplay", label: "Playfair Display", family: "Playfair Display", file: "PlayfairDisplay.ttf", category: "Serif elegante" },
];

export const DEFAULT_IMAGE_FONT = "BebasNeue";

const BY_ID: Record<string, ImageFontDef> = Object.fromEntries(IMAGE_FONTS.map((f) => [f.id, f]));

export function imageFontDef(id: string | undefined): ImageFontDef {
  return (id && BY_ID[id]) || BY_ID[DEFAULT_IMAGE_FONT];
}

const IMAGE_FONT_ORDER = ["Display impactante", "Script / manuscrita", "Redondeada", "Serif elegante"];

export const IMAGE_FONT_GROUPS: Array<{ label: string; options: Array<{ value: string; label: string }> }> =
  IMAGE_FONT_ORDER.map((cat) => ({
    label: cat,
    options: IMAGE_FONTS.filter((f) => f.category === cat).map((f) => ({ value: f.id, label: f.label })),
  })).filter((g) => g.options.length > 0);

export const IMAGE_FONT_PREVIEW_GROUPS: Array<{ label: string; options: Array<{ value: string; label: string; css: string }> }> =
  IMAGE_FONT_ORDER.map((cat) => ({
    label: cat,
    options: IMAGE_FONTS.filter((f) => f.category === cat).map((f) => ({ value: f.id, label: f.label, css: `'${f.family}', sans-serif` })),
  })).filter((g) => g.options.length > 0);

/** @font-face rules to preview the creative TTFs in the editor. */
export function imageFontFaceCss(): string {
  return IMAGE_FONTS.map(
    (f) => `@font-face{font-family:'${f.family}';src:url('/email/fonts/${f.file}') format('truetype');font-display:swap;}`,
  ).join("\n");
}

/** URL of the endpoint that renders the title text as an image. `base` empty =
 *  relative (editor); absolute = for send HTML. */
export function textImageUrl(
  b: { text?: string; font?: string; fontSize?: number; color?: string; align?: string },
  base = "",
): string {
  const p = new URLSearchParams({
    text: b.text ?? "",
    font: b.font ?? DEFAULT_IMAGE_FONT,
    size: String(b.fontSize ?? 48),
    color: b.color ?? "#0F2542",
    align: b.align ?? "center",
  });
  return `${base}/api/email/text-image?${p.toString()}`;
}
