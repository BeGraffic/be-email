/* ============================================================
   @begraffic/email/composer — API pública

   Sin directiva `"use client"` aquí a propósito, igual que en
   `../editor/index.ts`: la pone el banner de tsup (`tsup.config.ts`) sobre el
   bundle final de cada entrada de cliente. Ponerla también aquí la duplicaría
   al principio de `dist/composer/index.js`.
   ============================================================ */

export { RichEmailEditor } from "./RichEmailEditor";
export type { RichEmailEditorHandle, RichEmailEditorProps } from "./RichEmailEditor";
export { RichTextEditor } from "./RichTextEditor";
export type { RichTextEditorHandle, RichTextEditorProps } from "./RichTextEditor";
