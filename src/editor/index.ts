/* ============================================================
   @begraffic/email/editor — API pública

   Sin directiva `"use client"` aquí a propósito: la pone el banner de tsup
   (`tsup.config.ts`) sobre el bundle final de CADA entrada de cliente, así
   que cubre esta y `/composer` sin depender de que el barrel se acuerde.
   Ponerla también aquí la duplicaba al principio de `dist/editor/index.js`.
   ============================================================ */

export { EmailEditor } from "./EmailEditor";
export type {
  EmailEditorHandle,
  EmailEditorProps,
  EditorMediaItem,
  StockPhoto,
} from "./EmailEditor";
export { EmailPreviewFrame } from "./EmailPreviewFrame";
export { UI, EditorThemeToggle } from "./theme";
export type { ThemeController, ThemePreference } from "./theme";
export { legacyHtmlToDesign } from "./defaults";
