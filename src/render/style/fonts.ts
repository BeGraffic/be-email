/* ============================================================
   BeCRM — Email Builder · style/fonts.ts
   Email text-font catalog. Two tiers:
   - System-safe fonts: work in ALL clients (Gmail/Outlook), defined as CSS
     stacks with fallbacks.
   - Web fonts (Google Fonts): show in modern clients (Apple Mail, iOS, some
     Android), fall back to a safe stack in Gmail/Outlook. Loaded via a <link>
     the server render + editor inject.
   `g.font` stores the font `id`; fontStack(id) resolves it to the CSS stack.
   ============================================================ */
import type { Row } from "../model/types";

export type FontCategory = "sans" | "serif" | "mono" | "display" | "web";

export type FontDef = {
  id: string;
  label: string;
  stack: string;
  category: FontCategory;
  /** Google Fonts spec (url-encoded) for web fonts, e.g. "Montserrat:wght@400;600;700". */
  google?: string;
};

export const FONTS: FontDef[] = [
  /* ── Sans serif (safe) ── */
  { id: "Arial", label: "Arial", stack: "Arial, Helvetica, sans-serif", category: "sans" },
  { id: "Helvetica", label: "Helvetica", stack: "'Helvetica Neue', Helvetica, Arial, sans-serif", category: "sans" },
  { id: "Verdana", label: "Verdana", stack: "Verdana, Geneva, sans-serif", category: "sans" },
  { id: "Tahoma", label: "Tahoma", stack: "Tahoma, Verdana, Segoe, sans-serif", category: "sans" },
  { id: "Trebuchet MS", label: "Trebuchet MS", stack: "'Trebuchet MS', 'Lucida Grande', Tahoma, sans-serif", category: "sans" },
  { id: "Lucida Sans", label: "Lucida Sans", stack: "'Lucida Sans Unicode', 'Lucida Grande', Geneva, Verdana, sans-serif", category: "sans" },
  { id: "Segoe UI", label: "Segoe UI", stack: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", category: "sans" },
  { id: "Calibri", label: "Calibri", stack: "Calibri, Candara, Segoe, 'Segoe UI', Optima, Arial, sans-serif", category: "sans" },
  { id: "Century Gothic", label: "Century Gothic", stack: "'Century Gothic', 'Apple Gothic', 'URW Gothic', sans-serif", category: "sans" },

  /* ── Serif (safe) ── */
  { id: "Georgia", label: "Georgia", stack: "Georgia, Times, 'Times New Roman', serif", category: "serif" },
  { id: "Times New Roman", label: "Times New Roman", stack: "'Times New Roman', Times, serif", category: "serif" },
  { id: "Garamond", label: "Garamond", stack: "Garamond, Baskerville, 'Baskerville Old Face', 'Hoefler Text', 'Times New Roman', serif", category: "serif" },
  { id: "Palatino", label: "Palatino", stack: "'Palatino Linotype', Palatino, 'Book Antiqua', Georgia, serif", category: "serif" },
  { id: "Cambria", label: "Cambria", stack: "Cambria, Georgia, 'Times New Roman', serif", category: "serif" },

  /* ── Monospace (safe) ── */
  { id: "Courier New", label: "Courier New", stack: "'Courier New', Courier, monospace", category: "mono" },
  { id: "Consolas", label: "Consolas", stack: "Consolas, 'Lucida Console', Monaco, monospace", category: "mono" },

  /* ── Decorative (safe) ── */
  { id: "Impact", label: "Impact", stack: "Impact, Haettenschweiler, 'Franklin Gothic Bold', Charcoal, sans-serif", category: "display" },
  { id: "Brush Script MT", label: "Brush Script MT", stack: "'Brush Script MT', 'Brush Script Std', 'Segoe Script', cursive", category: "display" },
  { id: "Copperplate", label: "Copperplate", stack: "Copperplate, 'Copperplate Gothic Light', 'Times New Roman', serif", category: "display" },

  /* ── Web fonts (Google Fonts, with safe fallback) ── */
  { id: "Roboto", label: "Roboto", stack: "Roboto, Arial, sans-serif", category: "web", google: "Roboto:wght@400;500;700" },
  { id: "Open Sans", label: "Open Sans", stack: "'Open Sans', 'Segoe UI', Arial, sans-serif", category: "web", google: "Open+Sans:wght@400;600;700" },
  { id: "Lato", label: "Lato", stack: "Lato, 'Helvetica Neue', Arial, sans-serif", category: "web", google: "Lato:wght@400;700" },
  { id: "Montserrat", label: "Montserrat", stack: "Montserrat, 'Helvetica Neue', Arial, sans-serif", category: "web", google: "Montserrat:wght@400;600;700" },
  { id: "Poppins", label: "Poppins", stack: "Poppins, 'Segoe UI', Arial, sans-serif", category: "web", google: "Poppins:wght@400;500;600;700" },
  { id: "Raleway", label: "Raleway", stack: "Raleway, 'Helvetica Neue', Arial, sans-serif", category: "web", google: "Raleway:wght@400;600;700" },
  { id: "Nunito", label: "Nunito", stack: "Nunito, 'Segoe UI', Arial, sans-serif", category: "web", google: "Nunito:wght@400;600;700" },
  { id: "Merriweather", label: "Merriweather", stack: "Merriweather, Georgia, 'Times New Roman', serif", category: "web", google: "Merriweather:wght@400;700" },
  { id: "Playfair Display", label: "Playfair Display", stack: "'Playfair Display', Georgia, serif", category: "web", google: "Playfair+Display:wght@400;600;700" },
  { id: "Oswald", label: "Oswald", stack: "Oswald, 'Arial Narrow', Arial, sans-serif", category: "web", google: "Oswald:wght@400;500;700" },

  /* ── Rounded display web fonts ── */
  { id: "Fredoka", label: "Fredoka (display redondeada)", stack: "Fredoka, 'Trebuchet MS', 'Segoe UI', sans-serif", category: "web", google: "Fredoka:wght@400;500;600;700" },
  { id: "Quicksand", label: "Quicksand (display redondeada)", stack: "Quicksand, 'Century Gothic', 'Segoe UI', sans-serif", category: "web", google: "Quicksand:wght@400;500;600;700" },
  { id: "Comfortaa", label: "Comfortaa (display redondeada)", stack: "Comfortaa, 'Century Gothic', 'Segoe UI', sans-serif", category: "web", google: "Comfortaa:wght@400;500;700" },
  { id: "Baloo 2", label: "Baloo 2 (display redondeada)", stack: "'Baloo 2', 'Trebuchet MS', 'Segoe UI', sans-serif", category: "web", google: "Baloo+2:wght@400;500;600;700" },
];

const FONT_BY_ID: Record<string, FontDef> = Object.fromEntries(FONTS.map((f) => [f.id, f]));

const CATEGORY_ORDER: Array<{ category: FontCategory; label: string }> = [
  { category: "sans", label: "Sans serif" },
  { category: "serif", label: "Serif" },
  { category: "mono", label: "Monoespaciadas" },
  { category: "display", label: "Decorativas" },
  { category: "web", label: "Fuentes web (look moderno)" },
];

export const FONT_GROUPS: Array<{ label: string; options: Array<{ value: string; label: string }> }> =
  CATEGORY_ORDER.map(({ category, label }) => ({
    label,
    options: FONTS.filter((f) => f.category === category).map((f) => ({ value: f.id, label: f.label })),
  })).filter((g) => g.options.length > 0);

export const FONT_PREVIEW_GROUPS: Array<{ label: string; options: Array<{ value: string; label: string; css: string }> }> =
  CATEGORY_ORDER.map(({ category, label }) => ({
    label,
    options: FONTS.filter((f) => f.category === category).map((f) => ({ value: f.id, label: f.label, css: f.stack })),
  })).filter((g) => g.options.length > 0);

/** One Google Fonts URL loading every web font in the catalog (editor preview). */
export function allWebFontsHref(): string {
  const families = FONTS.filter((f) => f.category === "web" && f.google).map((f) => `family=${f.google}`);
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

const needsQuotes = (name: string) => /\s/.test(name) && !/^['"]/.test(name);

/** Resolve the stored `g.font` id to the full CSS stack (tolerates legacy ids). */
export function fontStack(id: string | undefined): string {
  if (id && FONT_BY_ID[id]) return FONT_BY_ID[id].stack;
  if (id && id.trim()) {
    const name = needsQuotes(id) ? `'${id}'` : id;
    return `${name}, Arial, Helvetica, sans-serif`;
  }
  return "Arial, Helvetica, sans-serif";
}

/** The web-font def for a selected font, or null if it's a system font. */
export function usedWebFontDef(font: string | undefined): FontDef | null {
  const def = font ? FONT_BY_ID[font] : undefined;
  return def && def.category === "web" && def.google ? def : null;
}

/** Google Fonts CSS2 URL for the selected web font, or null. */
export function webFontHref(font: string | undefined): string | null {
  const def = usedWebFontDef(font);
  return def?.google ? `https://fonts.googleapis.com/css2?family=${def.google}&display=swap` : null;
}

/** All font ids used in the document: global + any per-heading/text block font. */
export function collectFontIds(globalFont: string | undefined, rows: Row[]): string[] {
  const ids = new Set<string>();
  if (globalFont) ids.add(globalFont);
  const walk = (blocks: Row["cols"][number]["blocks"]) => {
    for (const b of blocks) {
      if ((b.type === "heading" || b.type === "text") && b.font) ids.add(b.font);
      if (b.type === "columns") for (const sc of b.cols) walk(sc.blocks);
    }
  };
  for (const r of rows) for (const c of r.cols) walk(c.blocks);
  return [...ids];
}

/** Distinct Google Fonts URLs for a list of font ids. */
export function webFontHrefs(fontIds: string[]): string[] {
  const hrefs = new Set<string>();
  for (const id of fontIds) {
    const h = webFontHref(id);
    if (h) hrefs.add(h);
  }
  return [...hrefs];
}
