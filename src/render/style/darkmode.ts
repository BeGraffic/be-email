/* ============================================================
   BeCRM — Email Builder · style/darkmode.ts
   Best-effort email dark mode. Overrides only the GLOBAL DEFAULTS — page
   background, the content surface (.ee-surface), and the default text/link
   color — so elements with their OWN explicit colors keep them. Backgrounds use
   !important (to beat the inline body/surface bg); text/link use normal
   specificity so inline-colored text is preserved.

   The renderer wraps these rules in `@media (prefers-color-scheme: dark)` when a
   design has darkMode enabled (so color-scheme-aware clients adapt the email).
   The editor's live preview injects them UNCONDITIONALLY to force the dark look
   regardless of the viewer's OS. Shared so both stay identical.
   ============================================================ */
export const DARK_PAGE = "#0b0f14";
export const DARK_SURFACE = "#15181d";
export const DARK_TEXT = "#e6e9ef";
export const DARK_LINK = "#7fb3e0";

/** Marker class the renderer puts on the content container so dark mode can
 *  darken that surface specifically. */
export const DARK_SURFACE_CLASS = "ee-surface";

/** The raw dark-mode override rules (no media wrapper). */
export function darkModeRules(): string {
  return (
    `body{background:${DARK_PAGE}!important;}` +
    `body,td{color:${DARK_TEXT};}` +
    `a{color:${DARK_LINK};}` +
    `.${DARK_SURFACE_CLASS}{background:${DARK_SURFACE}!important;}`
  );
}

/** Dark rules gated behind prefers-color-scheme — for the SENT email. */
export function darkModeMediaCss(): string {
  return `@media (prefers-color-scheme: dark){${darkModeRules()}}`;
}
