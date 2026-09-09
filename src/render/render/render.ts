/* ============================================================
   BeCRM — Email Builder · render/render.ts
   Public render entry: persisted design JSON → send-safe email HTML (+ plain
   text). Accepts any stored design (v3, v2, legacy) via the model's
   deserialize/normalize gate. Merge tags pass through literally.
   ============================================================ */
import { render, toPlainText } from "@react-email/render";
import { createElement } from "react";
import { deserializeDesign } from "../model";
import { EmailDocument } from "./EmailDocument";
import { finalizeEmailHtml } from "./vml";

export type RenderedEmail = { html: string; text: string };
export type RenderOptions = {
  /** Origen desde el que se sirven las imágenes alojadas (cuenta atrás y
   *  cualquier fallback sin hornear). Obligatorio: el paquete no asume ninguna. */
  baseUrl: string;
  /** URLs de Storage pre-horneadas (assetKey → publicUrl) para imagen de título,
   *  póster de vídeo e iconos sociales. */
  assets?: ReadonlyMap<string, string>;
};

/* Don't uppercase headings in the plain-text part: it would also uppercase
   merge tags ({{lead.name}} → {{LEAD.NAME}}) and break case-sensitive merge. */
const PLAIN_TEXT_OPTIONS = {
  selectors: [
    { selector: "h1", options: { uppercase: false } },
    { selector: "h2", options: { uppercase: false } },
    { selector: "h3", options: { uppercase: false } },
    { selector: "img", format: "skip" },
  ],
} as const;

/** Render persisted design JSON to HTML + plain text. */
export async function renderEmailDesign(design: unknown, opts: RenderOptions): Promise<RenderedEmail> {
  const { g, rows } = deserializeDesign(design);
  const raw = await render(createElement(EmailDocument, { g, rows, baseUrl: opts.baseUrl, assets: opts.assets }), { pretty: false });
  const text = toPlainText(raw, PLAIN_TEXT_OPTIONS);
  const html = finalizeEmailHtml(raw);
  return { html, text };
}

/** Render persisted design JSON to send-safe email HTML (the canonical entry
 *  used by /api/templates/render and the editor preview). */
export async function renderEmailHtmlFromDesign(design: unknown, opts: RenderOptions): Promise<string> {
  const { html } = await renderEmailDesign(design, opts);
  return html;
}

/** Pretty-printed HTML for the "Ver código" tab. */
export async function renderEmailHtmlPretty(design: unknown, opts: RenderOptions): Promise<string> {
  const { g, rows } = deserializeDesign(design);
  const raw = await render(createElement(EmailDocument, { g, rows, baseUrl: opts.baseUrl, assets: opts.assets }), { pretty: true });
  return finalizeEmailHtml(raw);
}
