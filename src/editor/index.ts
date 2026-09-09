/* ============================================================
   @begraffic/email/editor — API pública
   ============================================================ */
"use client";

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
