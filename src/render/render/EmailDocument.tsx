/* ============================================================
   BeCRM — Email Builder · render/EmailDocument.tsx
   The single source of truth for SEND + PREVIEW HTML. Maps the v3 design to
   @react-email/components (table-based, inline-styled, MSO-safe). Merge tags
   ({{lead.name}}, {{unsubscribeUrl}}, …) pass through as LITERAL text — never
   escaped or interpolated here. Outlook hardening (VML bg, ghost table, DPI,
   attribute casing) is applied as a post-render pass in render/vml.ts.
   ============================================================ */
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
} from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";
import { C, SOCIAL_META } from "../model/constants";
import { sanitizeHtmlBlock } from "../model/sanitizeHtml";
import { safeCssColor } from "../model/schema";
import type {
  Block,
  Column as Col,
  GlobalSettings,
  ImageBlock,
  Row as RowType,
} from "../model/types";
import {
  borderCss,
  COLUMN_GUTTER,
  darkModeMediaCss,
  DARK_SURFACE_CLASS,
  collectFontIds,
  collectResponsiveCss,
  columnSurface,
  columnsBlockBackground,
  contentPanelStyle,
  contentSurface,
  cornersCss,
  cx,
  docNeedsVisible,
  fontStack,
  offsetStyle,
  padCss,
  responsiveClassForBlock,
  responsiveClassForColumn,
  responsiveClassForRow,
  responsiveClassForSubColumn,
  responsiveWrapperClassForBlock,
  countdownKey,
  countdownUrl,
  socialIconKey,
  titleImageKey,
  videoPosterKey,
  rowContentBackground,
  rowContentNeedsVisible,
  rowOuterBackground,
  subColumnSurface,
  textImageUrl,
  videoDisplayWidth,
  videoPosterUrl,
  webFontHrefs,
} from "../style";
import { ghostOpenPayload, vmlOpenPayload, VML_MARKER_ATTRS, type VmlBgSpec } from "./vml";

/** Normaliza la baseUrl que da el host. El paquete no conoce ninguna URL de
 *  Be Graffic: quien renderiza dice desde dónde se sirven las imágenes. */
export const normalizeBaseUrl = (baseUrl: string): string => baseUrl.replace(/\/$/, "");
const socialIconUrl = (net: string, base: string) => `${base}/email/social/${net}.png`;

const BASE_CSS = `
body{margin:0;padding:0;width:100%!important;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;}
td,p,h1,h2,h3{mso-line-height-rule:exactly;}
img{border:0;line-height:100%;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;display:block;}
a{text-decoration:none;}
.ee-mobile-only{display:none;max-height:0;overflow:hidden;mso-hide:all;}
@media only screen and (max-width:600px){
  .ee-desktop-only{display:none!important;max-height:0!important;overflow:hidden!important;}
  .ee-mobile-only{display:block!important;max-height:none!important;overflow:visible!important;}
  .ee-stack-col{display:block!important;width:100%!important;box-sizing:border-box!important;}
  .ee-surface{width:100%!important;}
}
`;

/** Pre-baked Storage URLs for generated images (assetKey → publicUrl). */
type AssetMap = ReadonlyMap<string, string> | undefined;

const valignCss = (v: "top" | "middle" | "bottom"): CSSProperties["verticalAlign"] =>
  v === "middle" ? "middle" : v === "bottom" ? "bottom" : "top";

/** Available inner px width after subtracting padding (and optional margin).
 *  Exported so the asset baker (bakeDesignAssets) can mirror the exact same
 *  column-width math when computing baked-asset keys. */
export function innerWidth(avail: number, pct: number, pad: { l: number; r: number }, margin?: { l: number; r: number }): number {
  const w = (avail * pct) / 100 - (pad.l + pad.r) - (margin ? margin.l + margin.r : 0);
  return Math.max(1, Math.round(w));
}

/** Wrap children with VML background markers (swapped to MSO comments post-render). */
function VmlBg({ spec, children }: { spec: VmlBgSpec; children: ReactNode }) {
  const openProps = { [VML_MARKER_ATTRS.OPEN_ATTR]: vmlOpenPayload(spec) } as Record<string, string>;
  const closeProps = { [VML_MARKER_ATTRS.CLOSE_ATTR]: "1" } as Record<string, string>;
  return (
    <>
      <i {...openProps} />
      {children}
      <i {...closeProps} />
    </>
  );
}

/** Outlook ghost-table wrapper (forces a fixed px width Outlook honors). */
function GhostWrap({ width, children }: { width: number; children: ReactNode }) {
  const openProps = { [VML_MARKER_ATTRS.GHOST_OPEN_ATTR]: ghostOpenPayload(width) } as Record<string, string>;
  const closeProps = { [VML_MARKER_ATTRS.GHOST_CLOSE_ATTR]: "1" } as Record<string, string>;
  return (
    <>
      <i {...openProps} />
      {children}
      <i {...closeProps} />
    </>
  );
}

/* ============================================================ Blocks */

function imageWidthAttr(b: Pick<ImageBlock, "fullWidth" | "width" | "sizeUnit" | "widthPct">, availW: number): number {
  const unit = b.sizeUnit ?? (b.fullWidth ? "pct" : "px");
  if (unit === "pct") return Math.max(1, Math.round((availW * Math.max(1, Math.min(100, b.widthPct ?? 100))) / 100));
  return Math.max(1, Math.min(b.width, availW));
}
function imageWidthStyle(b: Pick<ImageBlock, "fullWidth" | "width" | "sizeUnit" | "widthPct">): string | number {
  const unit = b.sizeUnit ?? (b.fullWidth ? "pct" : "px");
  if (unit === "pct") return `${Math.max(1, Math.min(100, b.widthPct ?? 100))}%`;
  return b.width;
}

function BlockNode({ b, availW, baseUrl, assets }: { b: Block; availW: number; baseUrl: string; assets: AssetMap }): ReactNode {
  const cls = responsiveClassForBlock(b);
  switch (b.type) {
    case "heading": {
      const style: CSSProperties = {
        padding: padCss(b.padding),
        margin: 0,
        fontSize: b.fontSize,
        lineHeight: b.lineHeight,
        // Solo si ≠0: 0/undefined = normal (paridad con el lienzo del editor).
        letterSpacing: b.letterSpacing ? `${b.letterSpacing}px` : undefined,
        fontFamily: b.font ? fontStack(b.font) : undefined,
        fontWeight: b.weight,
        textAlign: b.align,
        color: b.color,
      };
      return <Heading as={b.level} className={cls || undefined} style={style} dangerouslySetInnerHTML={{ __html: b.html }} />;
    }
    case "text": {
      // Se renderiza en un <div> (no en <Text>=<p>): el html del bloque puede traer
      // elementos de bloque (p.ej. una <table>), y una <table> dentro de un <p> es
      // inválida — el navegador/cliente cierra el <p> y el contenido se escapa
      // perdiendo el padding. En un <div> el padding y los estilos se conservan, y
      // coincide con el canvas del editor (que también usa un <div>).
      const style: CSSProperties = {
        padding: padCss(b.padding),
        margin: 0,
        fontSize: b.fontSize,
        lineHeight: b.lineHeight,
        fontFamily: b.font ? fontStack(b.font) : undefined,
        textAlign: b.align,
        color: b.color,
      };
      return <div className={cls || undefined} style={style} dangerouslySetInnerHTML={{ __html: b.html }} />;
    }
    case "image": {
      const margin = b.align === "center" ? "0 auto" : b.align === "right" ? "0 0 0 auto" : "0";
      const padInner = availW - b.padding.l - b.padding.r;
      const widthAttr = imageWidthAttr(b, Math.max(1, padInner));
      const widthStyle = imageWidthStyle(b);
      const img = (
        <Img
          src={b.src || `${baseUrl}/email/placeholder.png`}
          alt={b.alt || ""}
          width={widthAttr}
          style={{ display: "block", width: widthStyle, maxWidth: "100%", borderRadius: b.radius, margin }}
        />
      );
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align, ...offsetStyle(b.offset) }}>
          {b.href ? (
            <Link href={b.href} target={b.newTab ? "_blank" : "_self"}>
              {img}
            </Link>
          ) : (
            img
          )}
        </div>
      );
    }
    case "button":
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align }}>
          <Button
            href={b.href}
            style={{
              display: b.fullWidth ? "block" : "inline-block",
              boxSizing: "border-box",
              background: b.bg,
              color: b.color,
              fontSize: b.fontSize,
              fontWeight: b.weight,
              textDecoration: "none",
              borderRadius: b.radius,
              border: borderCss(b.border),
              padding: `${b.padV}px ${b.padH}px`,
              textAlign: "center",
            }}
          >
            {b.text}
          </Button>
        </div>
      );
    case "divider":
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align }}>
          <div style={{ display: "inline-block", width: `${b.width}%`, borderTop: `${b.thickness}px ${b.style} ${b.color}`, fontSize: 1, lineHeight: "1px" }} />
        </div>
      );
    case "spacer":
      return <div className={cls || undefined} style={{ height: b.height, lineHeight: `${b.height}px`, fontSize: 1 }}>{" "}</div>;
    case "social": {
      const mono = b.style.includes("mono");
      const rounded = b.style.includes("rounded");
      const glyph = Math.round(b.size * 0.56);
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align }}>
          {b.networks.map((n) => {
            const meta = SOCIAL_META[n.net];
            const bg = mono ? "#0F2542" : meta?.color || "#0F2542";
            return (
              <Link
                key={n.id}
                href={n.url}
                style={{
                  display: "inline-block",
                  margin: `0 ${b.gap / 2}px`,
                  width: b.size,
                  height: b.size,
                  lineHeight: `${b.size}px`,
                  background: bg,
                  borderRadius: rounded ? "50%" : 6,
                  textDecoration: "none",
                  textAlign: "center",
                  verticalAlign: "middle",
                }}
              >
                <Img
                  src={assets?.get(socialIconKey(n.net)) ?? socialIconUrl(n.net, baseUrl)}
                  width={glyph}
                  height={glyph}
                  alt={meta?.label || n.net}
                  style={{ display: "inline-block", verticalAlign: "middle", border: 0 }}
                />
              </Link>
            );
          })}
        </div>
      );
    }
    case "video": {
      // The poster (thumbnail + play button + overlay text) is composited into
      // ONE image server-side. Email clients strip position:absolute, so a CSS
      // overlay can't center the play button — baking it makes it identical
      // everywhere. The block is just a linked <img>.
      const radius = b.radius ?? 8;
      // Effective display width: the poster (play button + overlay) is baked at
      // this width so it isn't composited at 600px and then shown shrunk inside
      // a narrow column. The same width feeds the asset key and the live URL.
      const maxW = videoDisplayWidth(b, availW, b.padding.l, b.padding.r);
      const poster = assets?.get(videoPosterKey(b, maxW)) ?? videoPosterUrl(b, baseUrl, maxW);
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align || "center" }}>
          <Link href={b.href} style={{ display: "inline-block", lineHeight: 0, maxWidth: maxW }}>
            <Img src={poster} width={maxW} alt={b.overlayText || "Video"} style={{ display: "block", width: "100%", maxWidth: maxW, borderRadius: radius }} />
          </Link>
        </div>
      );
    }
    case "menu":
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align }}>
          {b.items.map((it, ix) => (
            <span key={it.id}>
              {ix > 0 ? <span style={{ color: C.n300, fontSize: b.fontSize, margin: `0 ${b.gap / 2}px` }}>|</span> : null}
              <Link href={it.href} style={{ color: b.color, fontSize: b.fontSize, textDecoration: "none" }}>
                {it.label}
              </Link>
            </span>
          ))}
        </div>
      );
    case "timer": {
      // Prefer the baked Storage snapshot (works without the app deployed);
      // fall back to the live endpoint (true open-time countdown) otherwise.
      const src = assets?.get(countdownKey(b)) ?? countdownUrl(b, baseUrl);
      const imgWidth = 292;
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align }}>
          <Img src={src} width={imgWidth} alt="Cuenta regresiva" style={{ display: "inline-block", width: imgWidth, maxWidth: "100%", border: 0 }} />
        </div>
      );
    }
    case "html":
      return <div className={cls || undefined} dangerouslySetInnerHTML={{ __html: sanitizeHtmlBlock(b.code) }} />;
    case "titleImage": {
      const src = assets?.get(titleImageKey(b)) ?? textImageUrl(b, baseUrl);
      return (
        <div className={cls || undefined} style={{ padding: padCss(b.padding), textAlign: b.align }}>
          <Img src={src} width={b.imgW} alt={b.text} style={{ display: "inline-block", maxWidth: "100%", height: "auto", border: 0 }} />
        </div>
      );
    }
    case "columns": {
      const colsVisClass = b.hideMobile ? "ee-desktop-only" : b.hideDesktop ? "ee-mobile-only" : undefined;
      const radius = b.radius;
      return (
        <Section className={colsVisClass}>
          <Section style={{ ...columnsBlockBackground(b), ...(radius ? { borderRadius: radius } : {}) }}>
            <Row>
              {b.cols.map((sc) => {
                const panel = contentPanelStyle(sc.panel);
                const scAvail = innerWidth(availW, sc.width, { l: sc.padding.l + b.gap / 2, r: sc.padding.r + b.gap / 2 }, sc.margin);
                const body = sc.blocks.length ? sc.blocks.map((cb) => <BlockWrapper key={cb.id} b={cb} availW={scAvail} baseUrl={baseUrl} assets={assets} />) : " ";
                const surface = subColumnSurface(sc);
                const border = borderCss(sc.border);
                // Same pattern as ColumnNode: the inner div fills the cell ONLY
                // when it paints something (background/border), so a transparent
                // sub-column can be vertically aligned by the <td>'s valign.
                const fills = !!(surface.backgroundColor || surface.backgroundImage || border);
                return (
                  <Column
                    key={sc.id}
                    className={cx(b.stackMobile ? "ee-stack-col" : undefined, responsiveClassForSubColumn(sc, b.stackMobile))}
                    style={{ width: `${sc.width.toFixed(2)}%`, verticalAlign: valignCss(sc.valign), padding: `0 ${b.gap / 2}px`, boxSizing: "border-box" }}
                  >
                    <div style={{ padding: padCss(sc.padding), margin: sc.margin ? padCss(sc.margin) : undefined, ...surface, border, height: fills ? "100%" : undefined, boxSizing: "border-box" }}>
                      {panel ? <div style={panel}>{body}</div> : body}
                    </div>
                  </Column>
                );
              })}
            </Row>
          </Section>
        </Section>
      );
    }
    default: {
      const _never: never = b;
      return _never;
    }
  }
}

/** Generic per-block wrapper for margin + generic corner radius. Carries the
 *  ee-{id}-w class so per-device margin overrides REPLACE the base margin here
 *  (instead of stacking a second margin on the inner element).
 *
 *  El margen del bloque se emite como PADDING de este wrapper, no como margin.
 *  Un margen vertical COLAPSA a través de un contenedor sin padding ni borde, y
 *  el aire acababa fuera del elemento que pinta el fondo: una imagen con 50px
 *  de margen dentro de una subcolumna de color salía pegada a los bordes del
 *  color. En el canvas no pasaba porque ahí los bloques se apilan con flex, que
 *  no colapsa márgenes — de ahí que editor y correo se vieran distintos. El
 *  wrapper no pinta fondo ni borde, así que el padding es visualmente idéntico
 *  y además se comporta igual entre bloques hermanos (se suma, como en flex).
 *  El control de margen del panel está acotado a valores >= 0 (el overhang usa
 *  `offset`), así que no hay margen negativo que traducir. */
function BlockWrapper({ b, availW, baseUrl, assets }: { b: Block; availW: number; baseUrl: string; assets: AssetMap }) {
  const m = b.margin;
  const hasMargin = !!(m && (m.t || m.b || m.l || m.r));
  const radius = !["image", "button", "video", "columns"].includes(b.type) ? b.radius ?? 0 : 0;
  const wCls = responsiveWrapperClassForBlock(b);
  // El margen lateral consume ancho: sin descontarlo, el atributo width de una
  // imagen se calcula sobre un espacio que no existe.
  const inner = Math.max(1, availW - (hasMargin ? m!.l + m!.r : 0));
  let node: ReactNode = <BlockNode b={b} availW={inner} baseUrl={baseUrl} assets={assets} />;

  // El radio va en un div propio: si compartiera el del padding, el recorte se
  // aplicaría al borde exterior y dejaría de seguir las esquinas del contenido.
  if (radius > 0) {
    node = <div style={{ borderRadius: radius, overflow: "hidden" }}>{node}</div>;
  }

  if (hasMargin || wCls) {
    const style: CSSProperties = {};
    if (hasMargin) style.padding = padCss(m!);
    return <div className={wCls || undefined} style={style}>{node}</div>;
  }
  return <>{node}</>;
}

function ColumnNode({ col, availW, stack, baseUrl, assets, cellHeight, gutter }: { col: Col; availW: number; stack: boolean; baseUrl: string; assets: AssetMap; cellHeight: number; gutter: number }) {
  const panel = contentPanelStyle(col.panel);
  const m = col.margin;
  const hasMargin = !!(m && (m.t || m.b || m.l || m.r));
  // The column margin REPLACES the gutter (same as the editor canvas), so the
  // gutter is only subtracted from the usable width when there is no margin.
  const colAvail = Math.max(1, innerWidth(availW, col.width, col.padding, col.margin) - (hasMargin ? 0 : gutter * 2));
  const body = col.blocks.length ? col.blocks.map((b) => <BlockWrapper key={b.id} b={b} availW={colAvail} baseUrl={baseUrl} assets={assets} />) : " ";
  // Two layers, the email-safe way to combine all three needs:
  //  - the <td> carries the column margin (as td padding — the email-safe
  //    equivalent) or the gutter (space BETWEEN columns), the cell height and
  //    vertical-align (so it can vertically center its child);
  //  - the column's own background/border/padding go on an inner layer. A
  //    transparent column stays a plain <div> (no height) so the cell's
  //    vertical-align can center it; a column WITH a surface uses a one-cell
  //    nested table whose <td> carries surface+valign, so the fill stretches
  //    to the cell height AND the content still honors col.valign (a div with
  //    height:100% would pin content to the top).
  const surface = columnSurface(col);
  const border = borderCss(col.border);
  const fills = !!(surface.backgroundColor || surface.backgroundImage || border);
  return (
    <Column
      className={cx(stack ? "ee-stack-col" : undefined, responsiveClassForColumn(col)) || undefined}
      height={cellHeight || undefined}
      style={{
        width: `${col.width.toFixed(2)}%`,
        verticalAlign: valignCss(col.valign),
        height: cellHeight || undefined,
        padding: hasMargin ? padCss(m!) : gutter ? `0px ${gutter}px` : undefined,
        boxSizing: "border-box",
      }}
    >
      {fills ? (
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          // height attribute = Outlook fallback (treats it as a minimum); not in
          // React's table typings, so it goes through a typed spread.
          {...(cellHeight ? ({ height: cellHeight } as unknown as Record<string, string>) : null)}
          style={{ width: "100%", height: "100%", borderCollapse: "separate" }}
        >
          <tbody>
            <tr>
              <td style={{ padding: padCss(col.padding), ...surface, ...offsetStyle(col.offset), border, verticalAlign: valignCss(col.valign), boxSizing: "border-box" }}>
                {panel ? <div style={panel}>{body}</div> : body}
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div style={{ padding: padCss(col.padding), ...offsetStyle(col.offset), boxSizing: "border-box" }}>
          {panel ? <div style={panel}>{body}</div> : body}
        </div>
      )}
    </Column>
  );
}

function RowNode({ row, contentWidth, baseUrl, assets }: { row: RowType; contentWidth: number; baseUrl: string; assets: AssetMap }) {
  const visClass = row.hideMobile ? "ee-desktop-only" : row.hideDesktop ? "ee-mobile-only" : undefined;
  const radius = cornersCss(row.radius);
  const rowBg = rowOuterBackground(row);
  const rowBgVisible = !!(rowBg.backgroundColor || rowBg.backgroundImage);
  const contentBg = rowContentBackground(row);
  // El margen de la fila se saca a un envoltorio con padding. `Section` es una
  // <table width="100%">, y un margen lateral sobre ella se SUMA al 100%: la
  // fila se salía del correo tantos píxeles como margen tuviera. En un
  // envoltorio el espacio se descuenta por dentro, queda igualmente fuera del
  // fondo de la fila y deja de colapsar en vertical.
  const rowMargin =
    row.margin && (row.margin.t || row.margin.b || row.margin.l || row.margin.r)
      ? row.margin
      : null;
  const marginX = rowMargin ? rowMargin.l + rowMargin.r : 0;
  const rowWidth = Math.max(1, contentWidth - marginX);
  const innerW = Math.max(1, rowWidth - row.padding.l - row.padding.r);
  const stack = row.cols.length > 1; // multi-column rows stack on mobile
  // Vertical alignment is done on the column <td> via height + vertical-align
  // (the email-safe way). The cell height is the row min height minus the row
  // padding (the padding lives on the wrapping div). 0 = auto (no centering).
  const cellHeight = row.minHeight ? Math.max(0, row.minHeight - row.padding.t - row.padding.b) : 0;
  // Inter-column gutter (matches the editor canvas, which insets each column by
  // COLUMN_GUTTER px when there's more than one) so columns aren't flush.
  const gutter = row.cols.length > 1 ? COLUMN_GUTTER : 0;
  const heroVml: VmlBgSpec | null =
    row.bgImage && row.minHeight
      ? { src: row.bgImage, color: safeCssColor(row.bgContent, "#FFFFFF"), width: rowWidth, height: row.minHeight, overlay: row.bgOverlay ?? null }
      : null;
  const inner = (
    <div className={responsiveClassForRow(row) || undefined} style={{ padding: padCss(row.padding), minHeight: row.minHeight || undefined, boxSizing: "border-box" }}>
      <Row>
        {row.cols.map((col) => (
          <ColumnNode key={col.id} col={col} availW={innerW} stack={stack} baseUrl={baseUrl} assets={assets} cellHeight={cellHeight} gutter={gutter} />
        ))}
      </Row>
    </div>
  );
  const section = (
    <Section
      className={rowMargin ? undefined : visClass}
      style={{ ...rowBg, ...(radius && rowBgVisible ? { borderRadius: radius } : {}), ...offsetStyle(row.offset) }}
    >
      <Section
        bgcolor={contentBg.backgroundColor as string | undefined}
        style={{ ...contentBg, border: borderCss(row.border), borderRadius: radius, overflow: radius && !rowContentNeedsVisible(row) ? "hidden" : undefined }}
      >
        {heroVml ? <VmlBg spec={heroVml}>{inner}</VmlBg> : inner}
      </Section>
    </Section>
  );

  // Con envoltorio, la clase de visibilidad va FUERA: si se quedara en la
  // Section, ocultar la fila en un dispositivo seguiría dejando su margen.
  return rowMargin ? (
    <div className={visClass} style={{ padding: padCss(rowMargin) }}>
      {section}
    </div>
  ) : (
    section
  );
}

export function EmailDocument({ g, rows, baseUrl, assets }: { g: GlobalSettings; rows: RowType[]; baseUrl: string; assets?: AssetMap }) {
  const fontHrefs = webFontHrefs(collectFontIds(g.font, rows));
  const responsiveCss = collectResponsiveCss(rows);
  const lang = g.lang || "es";
  const dir = g.dir || "ltr";
  const containerBg = contentSurface(g);
  const contentInner = Math.max(1, g.width - (g.padding ? g.padding.l + g.padding.r : 0));
  const contentVml: VmlBgSpec | null =
    g.contentBgImage && g.minHeight
      ? {
          src: g.contentBgImage,
          color: safeCssColor(g.contentBg, "#FFFFFF"),
          width: g.width,
          height: g.minHeight,
          overlay: g.contentBgOverlay ? { color: "#000000", opacity: g.contentBgOverlay } : null,
        }
      : null;
  const containerChildren = rows.map((row) => <RowNode key={row.id} row={row} contentWidth={contentInner} baseUrl={normalizeBaseUrl(baseUrl)} assets={assets} />);

  return (
    <Html lang={lang} dir={dir}>
      <Head>
        <title>{g.preheader || "Correo"}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content={g.darkMode ? "light dark" : "light"} />
        <meta name="supported-color-schemes" content={g.darkMode ? "light dark" : "light"} />
        {fontHrefs.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS + `body,td{color:${safeCssColor(g.textColor, "#111111")};}a{color:${safeCssColor(g.linkColor, "#1E4876")};}` + responsiveCss + (g.darkMode ? darkModeMediaCss() : "") }} />
      </Head>
      {g.preheader ? <Preview>{g.preheader}</Preview> : null}
      <Body style={{ margin: 0, padding: 0, backgroundColor: g.canvasBg, ...(g.canvasBgImage ? { backgroundImage: `url("${g.canvasBgImage}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}), fontFamily: fontStack(g.font), color: g.textColor }}>
        <GhostWrap width={g.width}>
          <Container
            align={g.align}
            className={DARK_SURFACE_CLASS}
            bgcolor={containerBg.backgroundColor as string | undefined}
            style={{
              width: g.width,
              maxWidth: g.width,
              // border-box: el ancho total (g.width) incluye el padding, igual que
              // el canvas del editor (box-sizing:border-box). Sin esto la tabla es
              // content-box y el padding global se renderiza distinto al editor.
              boxSizing: "border-box",
              margin: g.align === "center" ? "0 auto" : "0",
              ...containerBg,
              border: borderCss(g.contentBorder),
              borderRadius: g.contentRadius || undefined,
              overflow: g.contentRadius && !docNeedsVisible(rows) ? "hidden" : undefined,
              minHeight: g.minHeight || undefined,
            }}
          >
            {/* El padding global del cuerpo va en una CELDA (td), no en la <table>
                del Container: el padding sobre un <table> lo ignoran muchos clientes
                de correo (y el vertical hasta algunos navegadores). En una <td> es
                fiable y coincide con el canvas del editor (que lo pone en un div). */}
            <table
              role="presentation"
              width="100%"
              border={0}
              cellPadding={0}
              cellSpacing={0}
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <tbody>
                <tr>
                  <td
                    style={
                      g.padding || g.minHeight
                        ? {
                            ...(g.padding ? { padding: padCss(g.padding) } : null),
                            // Con alto mínimo, esta celda toma el alto y fija el
                            // valign: sin esto, el td interno del <Container> de
                            // React Email se estira y centra el contenido (valign
                            // por defecto = middle), ignorando g.contentVAlign
                            // (el lienzo sí lo honra).
                            ...(g.minHeight ? { height: g.minHeight, verticalAlign: g.contentVAlign ?? "top" } : null),
                          }
                        : undefined
                    }
                  >
                    {contentVml ? <VmlBg spec={contentVml}>{containerChildren}</VmlBg> : containerChildren}
                  </td>
                </tr>
              </tbody>
            </table>
          </Container>
        </GhostWrap>
      </Body>
    </Html>
  );
}
