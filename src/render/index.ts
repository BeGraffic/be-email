/* ============================================================
   @begraffic/email/render — API pública
   Modelo del documento, migraciones, sanitizado y render a HTML de envío.
   No depende del DOM: puede ejecutarse en servidor.
   ============================================================ */
export * from "./model";
export * from "./render/render";
export { buildPreset } from "./render/presets";
export { normalizeBaseUrl } from "./render/EmailDocument";
export * from "./style";
