import { describe, it, expect } from "vitest";
import { renderEmailDesign, renderEmailHtmlFromDesign } from "./render";
import {
  DEFAULT_GLOBAL,
  defaultBlock,
  isBeCrmDesign,
  legacyHtmlToDesign,
  newRow,
  normalizeBlock,
  serializeDesign,
  type Block,
  type GlobalSettings,
  type Row,
} from "../model";
import { socialIconKey, titleImageKey, videoDisplayWidth, videoPosterKey, type TitleImageParams, type VideoPosterParams } from "../style";
import { innerWidth } from "./EmailDocument";

function design(rows: Row[], g: Partial<GlobalSettings> = {}) {
  return serializeDesign({ ...DEFAULT_GLOBAL, ...g }, rows);
}
function rowWith(blocks: Block[], structure = "100"): Row {
  const r = newRow(structure);
  r.cols[0].blocks = blocks;
  return r;
}

describe("document shell", () => {
  it("emits an html document with table-based markup", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    expect(html.toLowerCase()).toContain("<!doctype html");
    expect(html).toContain("<table");
    expect(html).toContain("</html>");
  });

  it("renders every block type without throwing and emits substantial HTML", async () => {
    const all: Block[] = [
      "heading", "text", "image", "button", "divider", "spacer",
      "social", "video", "html", "menu", "timer", "titleImage", "columns",
    ].map((t) => defaultBlock(t as Block["type"]));
    const html = await renderEmailHtmlFromDesign(design([rowWith(all)]), { baseUrl: "https://ejemplo.test" });
    expect(html.length).toBeGreaterThan(1500);
  });
});

describe("nested columns (the MJML flatten bug)", () => {
  it("renders sub-columns as a real nested table, side by side, keeping each surface", async () => {
    const cols = normalizeBlock({
      type: "columns",
      gap: 16,
      stackMobile: true,
      cols: [
        { width: 50, bg: "#ff0000", blocks: [{ type: "text", html: "IZQUIERDA" }] },
        { width: 50, bg: "#00ff00", blocks: [{ type: "text", html: "DERECHA" }] },
      ],
    });
    const html = await renderEmailHtmlFromDesign(design([rowWith([cols])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("IZQUIERDA");
    expect(html).toContain("DERECHA");
    // both sub-column background colors survive (MJML dropped these)
    expect(html.toLowerCase()).toContain("#ff0000");
    expect(html.toLowerCase()).toContain("#00ff00");
    // two real table cells with widths
    expect(html).toContain("50.00%");
    expect(html).toContain("ee-stack-col");
  });
});

describe("social styling (the MJML bug)", () => {
  it("honors rounded + color style", async () => {
    const social = normalizeBlock({ type: "social", style: "rounded-color", size: 40, gap: 20, networks: [{ net: "facebook", url: "https://fb" }] });
    const html = await renderEmailHtmlFromDesign(design([rowWith([social])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("50%"); // rounded
    expect(html.toLowerCase()).toContain("#1877f2"); // facebook brand color
    expect(html).toContain("/email/social/facebook.png");
  });
  it("honors mono style (navy chips, not brand color)", async () => {
    const social = normalizeBlock({ type: "social", style: "square-mono", networks: [{ net: "facebook", url: "https://fb" }] });
    const html = await renderEmailHtmlFromDesign(design([rowWith([social])]), { baseUrl: "https://ejemplo.test" });
    expect(html.toLowerCase()).toContain("#0f2542"); // mono navy
  });
});

describe("text fidelity", () => {
  it("honors justify alignment (MJML downgraded it to left)", async () => {
    const h = normalizeBlock({ type: "heading", html: "Hi", align: "justify" });
    const html = await renderEmailHtmlFromDesign(design([rowWith([h])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("text-align:justify");
  });
  it("honors heading weight", async () => {
    const h = normalizeBlock({ type: "heading", html: "Bold", weight: 800 });
    const html = await renderEmailHtmlFromDesign(design([rowWith([h])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("font-weight:800");
  });
  it("emits merge tags literally (no interpolation/escaping)", async () => {
    const t = normalizeBlock({ type: "text", html: "Hola {{lead.name}}, baja: {{unsubscribeUrl}}" });
    const { html, text } = await renderEmailDesign(design([rowWith([t])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("{{lead.name}}");
    expect(html).toContain("{{unsubscribeUrl}}");
    expect(text).toContain("{{lead.name}}");
  });
});

describe("divider / html land inside the table (the MJML out-of-cell bug)", () => {
  it("divider renders its rule and html block renders its code, no stray content", async () => {
    const divider = normalizeBlock({ type: "divider", thickness: 3, color: "#123456", width: 80 });
    const htmlBlock = normalizeBlock({ type: "html", code: "<p id='custom'>CUSTOM_HTML</p>" });
    const html = await renderEmailHtmlFromDesign(design([rowWith([divider, htmlBlock])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("border-top:3px solid #123456");
    expect(html).toContain("CUSTOM_HTML");
    // nothing rendered directly between a tbody and a tr (the classic MJML defect)
    expect(html).not.toMatch(/<tbody>\s*<div/);
  });
});

describe("backgrounds + Outlook VML", () => {
  it("gradient row emits linear-gradient + a solid Outlook fallback color", async () => {
    const r = rowWith([defaultBlock("text")]);
    r.bgContentType = "gradient";
    r.bgContentGradient = { from: "#AABBCC", to: "#112233", angle: 90 };
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("linear-gradient(90deg, #AABBCC, #112233)");
    expect(html).toContain("#AABBCC"); // fallback bgcolor
  });

  it("a hero row (bg image + minHeight) emits VML for Outlook", async () => {
    const r = rowWith([defaultBlock("heading")]);
    r.bgImage = "https://cdn/x/hero.jpg";
    r.bgContent = "#222222";
    r.minHeight = 400;
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("v:rect");
    expect(html).toContain("v:fill");
    expect(html).toContain("https://cdn/x/hero.jpg");
    expect(html).toContain("[if mso]");
    // markers must be fully swapped (no leftover <i data-eevml…>)
    expect(html).not.toContain("data-eevml-open");
    expect(html).not.toContain("data-eevml-close");
  });

  it("a content bg image without minHeight uses CSS + solid fallback, no VML", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])], { contentBgImage: "https://cdn/bg.png", contentBg: "#FAFAFA" }), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("background-image");
    expect(html).toContain("https://cdn/bg.png");
    expect(html.toLowerCase()).toContain("#fafafa"); // solid fallback
    expect(html).not.toContain("v:rect");
  });
});

describe("dark mode (best-effort prefers-color-scheme)", () => {
  it("emits a prefers-color-scheme:dark override block + the surface marker when darkMode is on", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])], { darkMode: true }), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain("#15181d"); // dark content surface
    expect(html).toContain("ee-surface"); // marker class the dark rule targets
  });

  it("emits no dark overrides when darkMode is off", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])], { darkMode: false }), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toContain("prefers-color-scheme: dark");
    expect(html).not.toContain("#15181d");
  });
});

describe("legacy HTML import (open old templates in the new editor)", () => {
  it("wraps the legacy body into a recognized v3 design with an html block", () => {
    const d = legacyHtmlToDesign("<html><head><style>.x{color:red}</style></head><body><h1>Hola</h1><p>Contenido</p></body></html>");
    expect(isBeCrmDesign(d)).toBe(true);
    expect(d.body.rows).toHaveLength(1);
    expect(d.body.rows[0].cols[0].blocks[0].type).toBe("html");
  });

  it("renders the imported content and drops script/style/head noise", async () => {
    const html = await renderEmailHtmlFromDesign(
      legacyHtmlToDesign("<html><head><style>.x{color:red}</style></head><body><h1>Hola</h1><p>Contenido</p><script>alert(1)</script></body></html>"), { baseUrl: "https://ejemplo.test" },
    );
    expect(html).toContain("Hola");
    expect(html).toContain("Contenido");
    expect(html).not.toContain("alert(1)");
    expect(html).not.toContain(".x{color:red}");
  });
});

describe("XSS hardening (stored design must not inject script into the render)", () => {
  it("neutralizes a textColor/linkColor breakout out of the <head><style> block", async () => {
    const html = await renderEmailHtmlFromDesign(
      design([rowWith([defaultBlock("text")])], {
        textColor: "red}</style><script>alert(1)</script><style>{a:",
        linkColor: "blue}</style><script>BREAKLINK</script><style>{a:",
      }), { baseUrl: "https://ejemplo.test" },
    );
    expect(html).not.toContain("<script>alert(1)");
    expect(html).not.toContain("BREAKLINK");
    expect(html).not.toContain("</style><script");
  });

  it("neutralizes a bgImage VML breakout on a hero row", async () => {
    const r = rowWith([defaultBlock("heading")]);
    r.bgImage = 'https://e/x.png"></v:rect><![endif]--><script>BREAKOUT</script><!--[if mso]><v:rect><v:fill src="';
    r.bgContent = '#000"/></v:fill><script>COLORX</script>';
    r.minHeight = 400;
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toContain("BREAKOUT");
    expect(html).not.toContain("COLORX");
    expect(html).not.toContain("<script>");
  });

  it("neutralizes an overlay color breakout", async () => {
    const r = rowWith([defaultBlock("heading")]);
    r.bgImage = "https://cdn/x/hero.jpg";
    r.minHeight = 400;
    r.bgOverlay = { color: '#000"/></v:fill><script>OVL</script>', opacity: 40 };
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toContain("OVL</script>");
    expect(html).not.toContain("<script>");
  });

  it("preserves legitimate rgb()/named colors (no false-positive stripping)", async () => {
    const html = await renderEmailHtmlFromDesign(
      design([rowWith([defaultBlock("text")])], { textColor: "rgb(10, 20, 30)", linkColor: "rebeccapurple" }), { baseUrl: "https://ejemplo.test" },
    );
    expect(html).toContain("rgb(10, 20, 30)");
    expect(html).toContain("rebeccapurple");
  });
});

describe("responsive + preheader + image width", () => {
  it("emits @media rules and the per-element class for device overrides", async () => {
    const t = normalizeBlock({ id: "t1", type: "text", html: "x", fontSize: 16, rsp: { mobile: { fontSize: 12 } } });
    const html = await renderEmailHtmlFromDesign(design([rowWith([t])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("@media only screen and (max-width:600px)");
    expect(html).toContain("ee-t1");
    expect(html).toContain("font-size:12px!important");
  });

  it("includes preheader text", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])], { preheader: "Vista previa secreta" }), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("Vista previa secreta");
  });

  it("image pct width renders as a percentage", async () => {
    const img = normalizeBlock({ type: "image", src: "https://x/i.jpg", sizeUnit: "pct", widthPct: 50 });
    const html = await renderEmailHtmlFromDesign(design([rowWith([img])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("50%");
  });

  it("button is an <a> with href and background", async () => {
    const btn = normalizeBlock({ type: "button", text: "Comprar", href: "https://shop", bg: "#FF8800" });
    const html = await renderEmailHtmlFromDesign(design([rowWith([btn])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("https://shop");
    expect(html.toLowerCase()).toContain("#ff8800");
    expect(html).toContain("Comprar");
  });
});

describe("margen de bloque (no debe colapsar fuera del fondo)", () => {
  // Con `margin`, el espaciado vertical de un bloque colapsaba a través del
  // contenedor y salía FUERA del elemento que pinta el fondo: un logo con 50px
  // de margen dentro de una subcolumna de color aparecía pegado a los bordes
  // del color, aunque el canvas —que apila con flex, sin colapso— lo mostraba
  // separado. Se emite como padding del wrapper, que no colapsa.
  it("emite el margen del bloque como padding del wrapper", async () => {
    const img = normalizeBlock({
      id: "im1",
      type: "image",
      src: "https://x/logo.png",
      margin: { t: 50, r: 0, b: 50, l: 0 },
    });
    const html = await renderEmailHtmlFromDesign(design([rowWith([img])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("padding:50px 0px 50px 0px");
    expect(html).not.toContain("margin:50px 0px 50px 0px");
  });

  it("saca el margen de la fila a un envoltorio en vez de ponerlo en la tabla", async () => {
    // `Section` es una <table width="100%">: un margen lateral sobre ella se
    // suma al 100% y la fila se sale del correo.
    const row = rowWith([defaultBlock("text")]);
    row.margin = { t: 0, r: 32, b: 22, l: 32 };
    const html = await renderEmailHtmlFromDesign(design([row]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("padding:0px 32px 22px 32px");
    expect(html).not.toContain("margin:0px 32px 22px 32px");
  });

  it("descuenta el margen lateral del ancho de la imagen", async () => {
    // Sin descontarlo, el atributo width se calcula sobre un espacio que el
    // margen ya ocupó y la imagen se desborda en los clientes que lo respetan.
    const img = normalizeBlock({
      id: "im2",
      type: "image",
      src: "https://x/logo.png",
      sizeUnit: "pct",
      widthPct: 100,
      margin: { t: 0, r: 40, b: 0, l: 40 },
      padding: { t: 0, r: 0, b: 0, l: 0 },
    });
    const html = await renderEmailHtmlFromDesign(design([rowWith([img])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain('width="520"');
  });
});

describe("heading letter spacing", () => {
  it("emits letter-spacing in px when set (and clamps at deserialize)", async () => {
    const h = normalizeBlock({ type: "heading", html: "Spaced", letterSpacing: 2 });
    const html = await renderEmailHtmlFromDesign(design([rowWith([h])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("letter-spacing:2px");
    // normalization: clamp + 0/absent → undefined (no dead data)
    expect((normalizeBlock({ type: "heading", html: "x", letterSpacing: 999 }) as { letterSpacing?: number }).letterSpacing).toBe(40);
    expect((normalizeBlock({ type: "heading", html: "x", letterSpacing: -99 }) as { letterSpacing?: number }).letterSpacing).toBe(-10);
    expect((normalizeBlock({ type: "heading", html: "x", letterSpacing: 0 }) as { letterSpacing?: number }).letterSpacing).toBeUndefined();
  });

  it("omits letter-spacing entirely when unset (default heading)", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("heading")])]), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toContain("letter-spacing");
  });

  it("a tablet override emits the ≤768px @media block (editor tablet view parity)", async () => {
    const h = normalizeBlock({ id: "h768", type: "heading", html: "x", rsp: { tablet: { fontSize: 20, letterSpacing: 1 } } });
    const html = await renderEmailHtmlFromDesign(design([rowWith([h])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("@media only screen and (max-width:768px)");
    expect(html).toContain("ee-h768");
    expect(html).toContain("font-size:20px!important");
    expect(html).toContain("letter-spacing:1px!important");
  });
});

describe("plain text", () => {
  it("derives a non-empty plain text part with the visible copy", async () => {
    const t = normalizeBlock({ type: "text", html: "Bienvenido a BeCRM" });
    const { text } = await renderEmailDesign(design([rowWith([t])]), { baseUrl: "https://ejemplo.test" });
    expect(text).toContain("Bienvenido a BeCRM");
  });
});

describe("Outlook hardening (from the adversarial review)", () => {
  it("wraps the content container in an MSO ghost table at the body width", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])], { width: 600 }), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain('<!--[if mso]><table role="presentation" align="center"');
    expect(html).toContain('width="600"');
  });

  it("injects the MSO DPI / AllowPNG head block", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("OfficeDocumentSettings");
    expect(html).toContain("PixelsPerInch");
  });

  it("includes a viewport meta (so mobile media queries fire on Android/Gmail)", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain('name="viewport"');
    expect(html).toContain("width=device-width");
  });

  it("emits a VML image + scrim for a hero with an overlay", async () => {
    const r = rowWith([defaultBlock("heading")]);
    r.bgImage = "https://cdn/hero.jpg";
    r.minHeight = 420;
    r.bgOverlay = { color: "#000000", opacity: 40 };
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("v:image");
    expect(html).toContain('opacity="40%"');
  });

  it("never emits an img width attribute of 100% (invalid in Outlook)", async () => {
    const img = normalizeBlock({ type: "image", src: "https://x/i.jpg", sizeUnit: "pct", widthPct: 100 });
    const html = await renderEmailHtmlFromDesign(design([rowWith([img])]), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toMatch(/<img[^>]*width="100%"/);
    // the style still carries the percentage for fluid behaviour
    expect(html).toContain("width:100%");
  });

  it("stacks top-level multi-column rows on mobile (.ee-stack-col)", async () => {
    const r = newRow("50-50");
    r.cols[0].blocks = [defaultBlock("text")];
    r.cols[1].blocks = [defaultBlock("text")];
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    const stackCount = (html.match(/ee-stack-col/g) || []).length;
    expect(stackCount).toBeGreaterThanOrEqual(2);
  });

  it("does not add stack class to single-column rows", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    // the .ee-stack-col CSS rule is always present; assert no element uses the class
    expect(html).not.toMatch(/class="[^"]*ee-stack-col/);
  });

  it("preserves merge-tag casing in the plain-text part even inside headings", async () => {
    const h = normalizeBlock({ type: "heading", html: "Hola {{lead.name}}", level: "h1" });
    const { text } = await renderEmailDesign(design([rowWith([h])]), { baseUrl: "https://ejemplo.test" });
    expect(text).toContain("{{lead.name}}");
    expect(text).not.toContain("{{LEAD.NAME}}");
  });

  it("sanitizes structural tags out of a user html block", async () => {
    const htmlBlock = normalizeBlock({ type: "html", code: "<p>ok</p></td></tr></table><td>escape" });
    const out = await renderEmailHtmlFromDesign(design([rowWith([htmlBlock])]), { baseUrl: "https://ejemplo.test" });
    // the user's stray </td></tr></table><td> must be stripped from the injected fragment
    expect(out).toContain(">ok<");
    expect(out).toContain("escape");
    // and the marker comments must be fully resolved (no leftover <i data-ee…>)
    expect(out).not.toContain("data-eeghost-open");
    expect(out).not.toContain("data-eevml-open");
  });
});

describe("vertical alignment (hero / minHeight rows)", () => {
  it("centers column content via td height + vertical-align (not a height:100% wrapper)", async () => {
    const r = newRow("100");
    r.minHeight = 440; // hero height
    r.cols[0].valign = "middle";
    r.cols[0].blocks = [normalizeBlock({ type: "heading", html: "Centrado" })];
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    // the column <td> must carry vertical-align:middle AND a concrete height so
    // the cell can center its content (440 - default row padding 16+16 = 408)
    expect(html).toContain("vertical-align:middle");
    expect(html).toContain("height:408px");
    // and it must NOT fall back to a content-filling wrapper (;height:100% in an
    // inline style) that defeats vertical centering. (line-height:100% in the base
    // CSS reset is unrelated, so match the leading semicolon.)
    expect(html).not.toContain(";height:100%");
  });

  it("bottom valign is honored on the cell", async () => {
    const r = newRow("100");
    r.minHeight = 300;
    r.cols[0].valign = "bottom";
    r.cols[0].blocks = [normalizeBlock({ type: "text", html: "Abajo" })];
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("vertical-align:bottom");
  });

  it("no minHeight → no forced cell height (auto)", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toMatch(/vertical-align:top;height:\d/);
  });
});

describe("inter-column gutter (multi-column rows aren't flush)", () => {
  it("multi-column rows inset each cell with a gutter", async () => {
    const r = newRow("33");
    r.cols.forEach((c) => (c.blocks = [defaultBlock("text")]));
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("padding:0px 4px"); // gutter on each <td>
  });

  it("single-column rows have no gutter", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    expect(html).not.toContain("padding:0px 4px");
  });
});

describe("baseUrl for hosted images (preview vs send)", () => {
  it("uses the provided baseUrl for title-image, countdown and social icons", async () => {
    const rows = [
      rowWith([
        normalizeBlock({ type: "titleImage", text: "Hola", font: "BebasNeue" }),
        normalizeBlock({ type: "timer", target: "2030-01-01T00:00" }),
        normalizeBlock({ type: "social", networks: [{ net: "facebook", url: "#" }] }),
      ]),
    ];
    const html = await renderEmailHtmlFromDesign(design(rows), { baseUrl: "http://localhost:3000" });
    expect(html).toContain("http://localhost:3000/api/email/text-image");
    expect(html).toContain("http://localhost:3000/api/email/countdown");
    expect(html).toContain("http://localhost:3000/email/social/facebook.png");
    expect(html).not.toContain("crm.begraffic.com");
  });

  it("routes a titleImage block through the live text-image endpoint path", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([normalizeBlock({ type: "titleImage", text: "x" })])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("/api/email/text-image");
  });
});

describe("baked Storage assets", () => {
  it("uses pre-baked Storage URLs for title-image, video and social when provided", async () => {
    const title = normalizeBlock({ type: "titleImage", text: "Hola", font: "BebasNeue" }) as Block & TitleImageParams;
    const video = normalizeBlock({ type: "video", href: "https://youtu.be/dQw4w9WgXcQ", showPlay: true }) as Block & VideoPosterParams;
    const social = normalizeBlock({ type: "social", networks: [{ net: "facebook", url: "#" }] });
    const row = rowWith([title, video, social]);
    // The video poster key carries the EFFECTIVE display width; mirror the
    // render's layout math for this design (single column → no gutter/margin).
    const vb = video as Extract<Block, { type: "video" }>;
    const contentInner = Math.max(1, DEFAULT_GLOBAL.width - (DEFAULT_GLOBAL.padding ? DEFAULT_GLOBAL.padding.l + DEFAULT_GLOBAL.padding.r : 0));
    const rowInner = Math.max(1, contentInner - row.padding.l - row.padding.r);
    const colAvail = Math.max(1, innerWidth(rowInner, row.cols[0].width, row.cols[0].padding, row.cols[0].margin));
    const effW = videoDisplayWidth(vb, colAvail, vb.padding.l, vb.padding.r);
    const assets = new Map<string, string>([
      [titleImageKey(title), "https://storage.example/ti.png"],
      [videoPosterKey(video, effW), "https://storage.example/vp.jpg"],
      [socialIconKey("facebook"), "https://storage.example/fb.png"],
    ]);
    const { html } = await renderEmailDesign(design([row]), { baseUrl: "https://ejemplo.test", assets });
    expect(html).toContain("https://storage.example/ti.png");
    expect(html).toContain("https://storage.example/vp.jpg");
    expect(html).toContain("https://storage.example/fb.png");
    // and it must NOT fall back to the live endpoints for those
    expect(html).not.toContain("/api/email/text-image");
    expect(html).not.toContain("/api/email/video-poster");
    expect(html).not.toContain("/email/social/facebook.png");
  });

  it("falls back to live endpoints when no assets are provided", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([normalizeBlock({ type: "titleImage", text: "x" })])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("/api/email/text-image");
  });
});

describe("parity fixes (mobile reflow, hidden rows, column margin)", () => {
  it("frees the container width on mobile so the email truly reflows (.ee-surface)", async () => {
    const html = await renderEmailHtmlFromDesign(design([rowWith([defaultBlock("text")])]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain(".ee-surface{width:100%!important;}");
  });

  it("a row hidden per-device (rsp.hidden) emits display:none in the mobile @media", async () => {
    const r = rowWith([defaultBlock("text")]);
    r.id = "rhide";
    r.rsp = { mobile: { hidden: true } };
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain(".ee-rhide{display:none!important;}");
    expect(html).toContain("@media only screen and (max-width:600px)");
  });

  it("column base margin lands on the cell as td padding, replacing the gutter", async () => {
    const r = newRow("50-50");
    r.cols[0].blocks = [defaultBlock("text")];
    r.cols[1].blocks = [defaultBlock("text")];
    r.cols[0].margin = { t: 6, r: 10, b: 6, l: 10 };
    const html = await renderEmailHtmlFromDesign(design([r]), { baseUrl: "https://ejemplo.test" });
    expect(html).toContain("padding:6px 10px 6px 10px"); // the margin, as td padding
    expect(html).toContain("padding:0px 4px"); // the margin-less column keeps the gutter
  });
});

describe("empty / unknown designs", () => {
  it("renders an empty design without throwing", async () => {
    const html = await renderEmailHtmlFromDesign(design([]), { baseUrl: "https://ejemplo.test" });
    expect(html.toLowerCase()).toContain("<!doctype html");
  });
  it("renders an unrecognized design as a valid (blank) document", async () => {
    const html = await renderEmailHtmlFromDesign({ foo: "bar" }, { baseUrl: "https://ejemplo.test" });
    expect(html.toLowerCase()).toContain("<!doctype html");
  });
});
