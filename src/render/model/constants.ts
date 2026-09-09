/* ============================================================
   BeCRM — Email Builder · model/constants.ts
   Brand palette · block & structure defs · merge tags · social meta
   ============================================================ */
import type { BlockType, OverrideKey } from "./types";

/* ── Responsive override whitelist ──
   The ONLY style/visibility keys that may vary per device (tablet/mobile).
   Colors, text, links and fonts are always shared across views. Shared by the
   model normalizer (schema.ts) and the style resolver (style/responsive.ts). */
export const OVERRIDE_KEYS: readonly OverrideKey[] = [
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "align",
  "padding",
  "margin",
  "weight",
  "height",
  "width",
  "widthPct",
  "sizeUnit",
  "fullWidth",
  "padV",
  "padH",
  "radius",
  "valign",
  "minHeight",
  "hidden",
] as const;

/* ── Brand palette (Be Finance / BeCRM design tokens) ── */
export const C = {
  navy900: "#0F2542",
  navy800: "#163559",
  navy700: "#1E4876",
  navy600: "#265D96",
  navy500: "#3074B8",
  navy400: "#5A96CC",
  navy300: "#8FBDE0",
  navy200: "#C2DBEF",
  navy100: "#E5F0F9",
  navy50: "#F2F7FC",
  amber700: "#B45309",
  amber600: "#D97706",
  amber500: "#F59E0B",
  amber400: "#FBBF24",
  amber100: "#FEF3C7",
  amberDark: "#78350F",
  green700: "#047857",
  green500: "#10B981",
  green100: "#D1FAE5",
  green50: "#ECFDF5",
  red700: "#B91C1C",
  red500: "#EF4444",
  red100: "#FEE2E2",
  n900: "#171717",
  n800: "#262626",
  n700: "#404040",
  n600: "#525252",
  n500: "#737373",
  n400: "#A3A3A3",
  n300: "#D4D4D4",
  n200: "#E5E5E5",
  n100: "#F5F5F5",
  n50: "#FAFAFA",
  bg: "#F4F6FA",
  surface: "#FFFFFF",
} as const;

/* selection accent — brand navy, drop hint — amber */
export const SEL = C.navy500;
export const DROP = C.amber500;

/* ============================================================
   MERGE TAGS — aligned with the real BeCRM send pipeline.
   The campaign sender (functions/shared/campaignSender.js) resolves
   dot-notation paths; the email footer injects the system tags. The
   renderer emits these LITERALLY as {{tag}} (no substitution here).
   ============================================================ */
export type MergeTag = { tag: string; label: string };
export type MergeTagGroup = { group: string; tags: MergeTag[] };

export const MERGE_TAGS: MergeTagGroup[] = [
  {
    group: "Contacto",
    tags: [
      { tag: "{{lead.name}}", label: "Nombre" },
      { tag: "{{lead.secondName}}", label: "Segundo nombre" },
      { tag: "{{lead.lastname}}", label: "Apellido" },
      { tag: "{{lead.secondLastname}}", label: "Segundo apellido" },
      { tag: "{{leadName}}", label: "Nombre completo" },
      { tag: "{{lead.email}}", label: "Correo" },
      { tag: "{{lead.organizationName}}", label: "Organización" },
    ],
  },
  {
    group: "Campaña",
    tags: [
      { tag: "{{campaignName}}", label: "Nombre de la campaña" },
      { tag: "{{campaignSubject}}", label: "Asunto de la campaña" },
      { tag: "{{campaignPreviewText}}", label: "Texto de previsualización" },
    ],
  },
  {
    group: "Sistema",
    tags: [
      { tag: "{{unsubscribeUrl}}", label: "Link para darse de baja" },
      { tag: "{{companyName}}", label: "Nombre de la empresa" },
      { tag: "{{platformName}}", label: "Nombre de la plataforma" },
      { tag: "{{platformUrl}}", label: "URL de la plataforma" },
    ],
  },
];

/* ============================================================
   BLOCK & STRUCTURE DEFINITIONS
   ============================================================ */
export type BlockDef = {
  type: BlockType;
  icon: string;
  label: string;
  desc: string;
};

export const BLOCK_DEFS: BlockDef[] = [
  { type: "heading", icon: "heading", label: "Encabezado", desc: "Título o subtítulo (H1–H3)" },
  { type: "text", icon: "type", label: "Texto", desc: "Párrafo con editor enriquecido" },
  { type: "image", icon: "image", label: "Imagen", desc: "Banner, logo o fotografía" },
  { type: "button", icon: "mouse-pointer-click", label: "Botón", desc: "Llamada a la acción (CTA)" },
  { type: "divider", icon: "minus", label: "Divisor", desc: "Línea separadora" },
  { type: "spacer", icon: "move-vertical", label: "Espaciador", desc: "Aire entre bloques" },
  { type: "social", icon: "share-2", label: "Redes", desc: "Iconos sociales en fila" },
  { type: "video", icon: "play-circle", label: "Video", desc: "Miniatura con play (YouTube/Vimeo)" },
  { type: "html", icon: "code-2", label: "HTML", desc: "Código personalizado" },
  { type: "menu", icon: "menu", label: "Menú", desc: "Navegación de enlaces" },
  { type: "timer", icon: "timer", label: "Temporizador", desc: "Cuenta regresiva a una fecha" },
  { type: "titleImage", icon: "sparkles", label: "Título imagen", desc: "Fuente creativa como imagen (todo cliente)" },
  { type: "columns", icon: "columns-2", label: "Columnas", desc: "Divide una columna en sub-columnas" },
];

export type StructureDef = { id: string; cols: number[]; label: string };

export const STRUCTURE_DEFS: StructureDef[] = [
  { id: "100", cols: [100], label: "1 columna" },
  { id: "50-50", cols: [50, 50], label: "2 columnas" },
  { id: "30-70", cols: [30, 70], label: "Izq. estrecha" },
  { id: "70-30", cols: [70, 30], label: "Der. estrecha" },
  { id: "33", cols: [33.33, 33.33, 33.33], label: "3 columnas" },
  { id: "25", cols: [25, 25, 25, 25], label: "4 columnas" },
];

/* ── Social network metadata + brand glyph paths (24×24) ── */
export const SOCIAL_META: Record<string, { label: string; color: string }> = {
  facebook: { label: "Facebook", color: "#1877F2" },
  instagram: { label: "Instagram", color: "#E4405F" },
  youtube: { label: "YouTube", color: "#FF0000" },
  twitter: { label: "X / Twitter", color: "#000000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
  tiktok: { label: "TikTok", color: "#010101" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  pinterest: { label: "Pinterest", color: "#BD081C" },
};

export const SOCIAL_SVG: Record<string, string> = {
  facebook:
    "M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z",
  instagram:
    "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  twitter:
    "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  linkedin:
    "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  whatsapp:
    "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413",
  pinterest:
    "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.756-1.378l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 12.017.026z",
};
