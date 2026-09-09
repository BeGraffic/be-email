/* ============================================================
   BeCRM — Editor de Email · presets.ts
   Composiciones de fila pre-armadas (email-safe). Cada preset arma una sección
   lista (fondo + esquinas + overlay + contenido) usando filas/columnas/bloques
   normales, así que se ven en TODOS los clientes de correo y quedan 100%
   editables con los paneles existentes. Se insertan como una fila al hacer clic.
   ============================================================ */
import { defaultBlock, newRow } from "../model/defaults";
import type {
  ButtonBlock,
  DividerBlock,
  HeadingBlock,
  ImageBlock,
  MenuBlock,
  Row,
  Sides,
  SocialBlock,
  TextBlock,
} from "../model/types";

const P = (t: number, b: number, l: number, r: number): Sides => ({ t, b, l, r });

/* Builders tipados: parten del bloque por defecto (con su id fresco) y aplican
   overrides del tipo correcto. */
const mkHeading = (o: Partial<HeadingBlock>): HeadingBlock => ({ ...(defaultBlock("heading") as HeadingBlock), ...o });
const mkText = (o: Partial<TextBlock>): TextBlock => ({ ...(defaultBlock("text") as TextBlock), ...o });
const mkButton = (o: Partial<ButtonBlock>): ButtonBlock => ({ ...(defaultBlock("button") as ButtonBlock), ...o });
const mkImage = (o: Partial<ImageBlock>): ImageBlock => ({ ...(defaultBlock("image") as ImageBlock), ...o });
const mkDivider = (o: Partial<DividerBlock>): DividerBlock => ({ ...(defaultBlock("divider") as DividerBlock), ...o });
const mkSocial = (o: Partial<SocialBlock>): SocialBlock => ({ ...(defaultBlock("social") as SocialBlock), ...o });
const mkMenu = (o: Partial<MenuBlock>): MenuBlock => ({ ...(defaultBlock("menu") as MenuBlock), ...o });

/** Hero: tarjeta con gradiente, esquinas redondeadas y título + botón centrados
 *  verticalmente. Pon tu imagen como fondo de la fila y el texto queda encima. */
function heroPreset(): Row {
  const row = newRow("100");
  row.bgContentType = "gradient";
  row.bgContentGradient = { from: "#AFCC8E", to: "#6F9351", angle: 160 };
  row.radius = { tl: 24, tr: 24, br: 24, bl: 24 };
  row.padding = P(44, 40, 24, 24);
  row.minHeight = 440;
  const col = row.cols[0];
  col.valign = "middle";
  col.blocks = [
    mkText({ html: "EARLY EARLS · TEA SHOP", align: "center", color: "#FFFFFF", fontSize: 13, lineHeight: 1.4, padding: P(0, 4, 20, 20) }),
    mkHeading({ html: "MONDAYS<br>AMIRIGHT?", level: "h1", fontSize: 44, weight: 800, lineHeight: 1.05, align: "center", color: "#FFFFFF", padding: P(6, 16, 20, 20) }),
    mkButton({ text: "SKIP THE LINE", align: "center", bg: "#A7C285", color: "#2C3F1B", radius: 24, weight: 700, fontSize: 13, padV: 11, padH: 28, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Bienvenida: encabezado centrado con eyebrow + título grande + subtítulo + CTA. */
function welcomePreset(): Row {
  const row = newRow("100");
  row.bgContent = "#FFFFFF";
  row.padding = P(44, 36, 24, 24);
  const col = row.cols[0];
  col.blocks = [
    mkText({ html: "TE DAMOS LA BIENVENIDA", align: "center", color: "#1E4876", fontSize: 13, lineHeight: 1.4, padding: P(0, 6, 20, 20) }),
    mkHeading({ html: "Gracias por unirte", level: "h1", fontSize: 36, weight: 800, lineHeight: 1.15, align: "center", color: "#0F2542", padding: P(0, 10, 20, 20) }),
    mkText({ html: "Estamos felices de tenerte. Empecemos a crear algo increíble juntos.", align: "center", color: "#525252", fontSize: 16, lineHeight: 1.6, padding: P(0, 18, 24, 24) }),
    mkButton({ text: "Comenzar ahora", align: "center", bg: "#1E4876", color: "#FFFFFF", radius: 8, weight: 700, fontSize: 15, padV: 13, padH: 30, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Llamada a la acción: banda de color con título + texto + botón centrados. */
function ctaPreset(): Row {
  const row = newRow("100");
  row.bgContent = "#0F2542";
  row.radius = { tl: 16, tr: 16, br: 16, bl: 16 };
  row.padding = P(40, 40, 28, 28);
  const col = row.cols[0];
  col.valign = "middle";
  col.blocks = [
    mkHeading({ html: "¿Listo para empezar?", level: "h2", fontSize: 28, weight: 800, lineHeight: 1.2, align: "center", color: "#FFFFFF", padding: P(0, 8, 20, 20) }),
    mkText({ html: "Únete a miles de equipos que ya cierran más rápido con Be CRM.", align: "center", color: "#C2DBEF", fontSize: 15, lineHeight: 1.6, padding: P(0, 18, 20, 20) }),
    mkButton({ text: "Crear cuenta gratis", align: "center", bg: "#F59E0B", color: "#78350F", radius: 8, weight: 700, fontSize: 15, padV: 13, padH: 30, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Imagen + texto (fondo): fila con imagen de fondo, overlay legible y texto +
 *  botón encima. El usuario añade la foto como imagen de fondo de la fila. */
function storyCardPreset(): Row {
  const row = newRow("100");
  row.bgContent = "#3E5A2E";
  row.bgOverlay = { color: "#1F3314", opacity: 45 };
  row.radius = { tl: 16, tr: 16, br: 16, bl: 16 };
  row.padding = P(28, 28, 28, 28);
  row.minHeight = 220;
  const col = row.cols[0];
  col.valign = "middle";
  col.blocks = [
    mkText({ html: "Nuestro matcha se elabora con hojas de té verde finamente molidas para preservar sus antioxidantes y su sabor suave.", align: "right", color: "#FFFFFF", fontSize: 15, lineHeight: 1.5, padding: P(0, 14, 20, 20) }),
    mkButton({ text: "ORDER NOW", align: "right", bg: "#A7C285", color: "#1F3314", radius: 22, weight: 700, fontSize: 13, padV: 10, padH: 24, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Característica: 2 columnas (imagen + texto) con el texto centrado vertical. */
function featurePreset(): Row {
  const row = newRow("50-50");
  row.padding = P(16, 16, 0, 0);
  const [left, right] = row.cols;
  left.valign = "middle";
  left.blocks = [mkImage({ src: "", fullWidth: true, sizeUnit: "pct", widthPct: 100, align: "center", radius: 12, padding: P(0, 0, 0, 0) })];
  right.valign = "middle";
  right.padding = P(0, 0, 8, 0);
  right.blocks = [
    mkHeading({ html: "Una característica clave", level: "h3", fontSize: 22, weight: 700, lineHeight: 1.25, align: "left", color: "#0F2542", padding: P(0, 8, 20, 20) }),
    mkText({ html: "Explica aquí el beneficio principal para tu cliente en una o dos frases claras.", align: "left", color: "#525252", fontSize: 15, lineHeight: 1.6, padding: P(0, 14, 20, 20) }),
    mkButton({ text: "Saber más", align: "left", bg: "#1E4876", color: "#FFFFFF", radius: 8, weight: 600, fontSize: 14, padV: 11, padH: 24, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Galería: 3 productos en fila (imagen + nombre + precio). */
function galleryPreset(): Row {
  const row = newRow("33");
  row.padding = P(16, 16, 0, 0);
  const make = (name: string, price: string) => [
    mkImage({ src: "", fullWidth: true, sizeUnit: "pct", widthPct: 100, align: "center", radius: 10, padding: P(0, 10, 0, 0) }),
    mkHeading({ html: name, level: "h3", fontSize: 16, weight: 700, align: "center", color: "#0F2542", padding: P(0, 2, 8, 8) }),
    mkText({ html: price, align: "center", color: "#6E8B57", fontSize: 15, lineHeight: 1.4, padding: P(0, 8, 8, 8) }),
  ];
  row.cols[0].blocks = make("Producto 1", "$6.95");
  row.cols[1].blocks = make("Producto 2", "$7.50");
  row.cols[2].blocks = make("Producto 3", "$5.25");
  return row;
}

/** Producto: imagen del producto con nombre y precio centrados. */
function productPreset(): Row {
  const row = newRow("100");
  row.padding = P(12, 16, 0, 0);
  const col = row.cols[0];
  col.blocks = [
    mkImage({ src: "", fullWidth: true, sizeUnit: "pct", widthPct: 100, align: "center", radius: 14, padding: P(0, 14, 0, 0) }),
    mkHeading({ html: "Matcha Latte", level: "h3", fontSize: 22, weight: 700, align: "center", color: "#3E5A2E", padding: P(2, 2, 20, 20) }),
    mkText({ html: "$6.95", align: "center", color: "#6E8B57", fontSize: 16, lineHeight: 1.4, padding: P(0, 10, 20, 20) }),
  ];
  return row;
}

/** Precios: tarjeta con plan, precio grande, lista de beneficios y botón. */
function pricingPreset(): Row {
  const row = newRow("100");
  row.bgContent = "#FFFFFF";
  row.border = { style: "solid", width: 1, color: "#E5E5E5" };
  row.radius = { tl: 16, tr: 16, br: 16, bl: 16 };
  row.padding = P(32, 32, 28, 28);
  const col = row.cols[0];
  col.blocks = [
    mkText({ html: "PLAN PRO", align: "center", color: "#1E4876", fontSize: 13, lineHeight: 1.4, padding: P(0, 4, 20, 20) }),
    mkHeading({ html: "$29<span style=\"font-size:16px;color:#737373\">/mes</span>", level: "h1", fontSize: 42, weight: 800, align: "center", color: "#0F2542", padding: P(0, 6, 20, 20) }),
    mkText({ html: "Todo lo que necesitas para crecer", align: "center", color: "#737373", fontSize: 14, lineHeight: 1.5, padding: P(0, 14, 20, 20) }),
    mkDivider({ color: "#E5E5E5", thickness: 1, width: 100, align: "center", padding: P(4, 16, 20, 20) }),
    mkText({ html: "✓ Usuarios ilimitados<br>✓ Soporte prioritario<br>✓ Reportes avanzados", align: "center", color: "#404040", fontSize: 15, lineHeight: 1.9, padding: P(0, 20, 20, 20) }),
    mkButton({ text: "Elegir plan", align: "center", fullWidth: true, bg: "#1E4876", color: "#FFFFFF", radius: 8, weight: 700, fontSize: 15, padV: 13, padH: 28, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Testimonio: cita destacada + autor sobre fondo suave. */
function quotePreset(): Row {
  const row = newRow("100");
  row.bgContent = "#F2F7FC";
  row.radius = { tl: 16, tr: 16, br: 16, bl: 16 };
  row.padding = P(36, 32, 32, 32);
  const col = row.cols[0];
  col.valign = "middle";
  col.blocks = [
    mkHeading({ html: "“Be CRM cambió por completo cómo gestionamos a nuestros clientes.”", level: "h3", fontSize: 22, weight: 600, lineHeight: 1.4, align: "center", color: "#0F2542", padding: P(0, 12, 20, 20) }),
    mkText({ html: "— María González, Directora Comercial", align: "center", color: "#5A96CC", fontSize: 14, lineHeight: 1.4, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Oferta: banner de descuento con código y botón. */
function salePreset(): Row {
  const row = newRow("100");
  row.bgContent = "#F59E0B";
  row.radius = { tl: 16, tr: 16, br: 16, bl: 16 };
  row.padding = P(36, 32, 24, 24);
  const col = row.cols[0];
  col.valign = "middle";
  col.blocks = [
    mkText({ html: "OFERTA POR TIEMPO LIMITADO", align: "center", color: "#78350F", fontSize: 13, lineHeight: 1.4, padding: P(0, 6, 20, 20) }),
    mkHeading({ html: "30% DE DESCUENTO", level: "h1", fontSize: 40, weight: 800, lineHeight: 1.1, align: "center", color: "#78350F", padding: P(0, 8, 20, 20) }),
    mkText({ html: "Usa el código <b>BECRM30</b> al finalizar tu compra", align: "center", color: "#78350F", fontSize: 16, lineHeight: 1.5, padding: P(0, 18, 20, 20) }),
    mkButton({ text: "Comprar ahora", align: "center", bg: "#0F2542", color: "#FFFFFF", radius: 8, weight: 700, fontSize: 15, padV: 13, padH: 30, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

/** Pie de correo: redes + menú + aviso legal + baja. */
function footerPreset(): Row {
  const row = newRow("100");
  row.bgContent = "#F4F6FA";
  row.padding = P(28, 28, 20, 20);
  const col = row.cols[0];
  col.blocks = [
    mkSocial({ style: "rounded-color", size: 32, gap: 10, align: "center", padding: P(0, 12, 20, 20) }),
    mkMenu({ align: "center", color: "#1E4876", fontSize: 13, gap: 16, padding: P(0, 12, 20, 20) }),
    mkText({ html: "{{companyName}} · Todos los derechos reservados", align: "center", color: "#737373", fontSize: 12, lineHeight: 1.5, padding: P(0, 4, 20, 20) }),
    mkText({ html: '¿No quieres recibir más correos? <a href="{{unsubscribeUrl}}">Darse de baja</a>', align: "center", color: "#A3A3A3", fontSize: 12, lineHeight: 1.5, padding: P(0, 0, 20, 20) }),
  ];
  return row;
}

export type PresetDef = { id: string; label: string; icon: string; description: string };

export const PRESET_DEFS: PresetDef[] = [
  { id: "hero", label: "Hero / Tarjeta", icon: "layout-template", description: "Gradiente, esquinas redondeadas y título + botón centrados. Pon tu imagen como fondo." },
  { id: "welcome", label: "Bienvenida", icon: "heading", description: "Encabezado centrado: eyebrow + título grande + subtítulo + botón." },
  { id: "cta", label: "Llamada a la acción", icon: "mouse-pointer-click", description: "Banda de color con título, texto y botón centrados." },
  { id: "story", label: "Imagen + texto", icon: "image", description: "Fondo de imagen con overlay legible y texto + botón encima." },
  { id: "feature", label: "Característica (2 col)", icon: "columns-2", description: "Imagen a un lado y texto + botón al otro, centrados verticalmente." },
  { id: "gallery", label: "Galería (3 productos)", icon: "columns-3", description: "Tres productos en fila con imagen, nombre y precio." },
  { id: "product", label: "Producto", icon: "shapes", description: "Imagen del producto con nombre y precio centrados." },
  { id: "pricing", label: "Precios", icon: "check-circle", description: "Tarjeta con plan, precio grande, beneficios y botón." },
  { id: "quote", label: "Testimonio", icon: "type", description: "Cita destacada con autor sobre un fondo suave." },
  { id: "sale", label: "Oferta / Descuento", icon: "send", description: "Banner de descuento con código y botón." },
  { id: "footer", label: "Pie de correo", icon: "share-2", description: "Redes, menú, aviso legal y enlace para darse de baja." },
];

const BUILDERS: Record<string, () => Row> = {
  hero: heroPreset,
  welcome: welcomePreset,
  cta: ctaPreset,
  story: storyCardPreset,
  feature: featurePreset,
  gallery: galleryPreset,
  product: productPreset,
  pricing: pricingPreset,
  quote: quotePreset,
  sale: salePreset,
  footer: footerPreset,
};

/** Construye la fila de un preset por id (ids/objetos frescos en cada llamada). */
export function buildPreset(id: string): Row | null {
  const build = BUILDERS[id];
  return build ? build() : null;
}
