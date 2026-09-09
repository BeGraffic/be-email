import { describe, it, expect } from "vitest";
import { colorWithOpacity, hexToRgba, gradientCss } from "./colors";
import { surfaceBackground } from "./background";
import { fontStack, webFontHref, collectFontIds } from "./fonts";
import { videoThumbUrl } from "./video";
import { imageWidthCss, padCss, cornersCss, borderCss, offsetStyle } from "./engine";
import {
  resolveForDevice,
  resolvedHidden,
  routePatch,
  collectResponsiveCss,
  responsiveClassForBlock,
} from "./responsive";
import { normalizeBlock, newRow } from "../model";
import type { TextBlock } from "../model/types";

describe("colors", () => {
  it("hexToRgba handles #RGB and #RRGGBB", () => {
    expect(hexToRgba("#000", 50)).toBe("rgba(0,0,0,0.5)");
    expect(hexToRgba("#ffffff", 100)).toBe("rgba(255,255,255,1)");
  });
  it("colorWithOpacity passes through at 100 and converts hex below", () => {
    expect(colorWithOpacity("#123456", 100)).toBe("#123456");
    expect(colorWithOpacity("#000000", 0)).toBe("rgba(0,0,0,0)");
    expect(colorWithOpacity("transparent", 50)).toBe("transparent");
  });
  it("gradientCss builds a linear-gradient", () => {
    expect(gradientCss({ from: "#fff", to: "#000", angle: 90 })).toBe("linear-gradient(90deg, #fff, #000)");
  });
});

describe("surfaceBackground", () => {
  it("emits gradient with a solid Outlook fallback color", () => {
    const s = surfaceBackground({ type: "gradient", gradient: { from: "#AAA", to: "#BBB", angle: 45 } });
    expect(s.backgroundColor).toBe("#AAA");
    expect(String(s.backgroundImage)).toContain("linear-gradient(45deg, #AAA, #BBB)");
  });
  it("stacks a scrim over an image", () => {
    const s = surfaceBackground({ image: "https://x/i.jpg", overlay: { color: "#000000", opacity: 40 } });
    expect(String(s.backgroundImage)).toContain('url("https://x/i.jpg")');
    expect(String(s.backgroundImage)).toContain("rgba(0,0,0,0.4)");
  });
  it("skips transparent color", () => {
    const s = surfaceBackground({ color: "transparent" });
    expect(s.backgroundColor).toBeUndefined();
  });
});

describe("fonts", () => {
  it("resolves a known font and falls back for unknown", () => {
    expect(fontStack("Montserrat")).toContain("Montserrat");
    expect(fontStack("Arial")).toContain("Arial");
    expect(fontStack("WeirdFont")).toContain("WeirdFont");
    expect(fontStack(undefined)).toContain("Arial");
  });
  it("returns a google href only for web fonts", () => {
    expect(webFontHref("Montserrat")).toContain("fonts.googleapis.com");
    expect(webFontHref("Arial")).toBeNull();
  });
  it("collects font ids from the doc tree", () => {
    const row = newRow("100");
    (row.cols[0].blocks as TextBlock[]).push(normalizeBlock({ type: "text", html: "x", font: "Lato" }) as TextBlock);
    const ids = collectFontIds("Arial", [row]);
    expect(ids).toContain("Arial");
    expect(ids).toContain("Lato");
  });
});

describe("video thumbnails", () => {
  it("prefers the manual thumb, then YouTube, then Vimeo (vumbnail)", () => {
    expect(videoThumbUrl("https://vimeo.com/76979871", "https://x/t.jpg")).toBe("https://x/t.jpg");
    expect(videoThumbUrl("https://youtu.be/dQw4w9WgXcQ", "")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(videoThumbUrl("https://vimeo.com/76979871", "")).toBe("https://vumbnail.com/76979871.jpg");
    expect(videoThumbUrl("https://vimeo.com/video/76979871", "")).toBe("https://vumbnail.com/76979871.jpg");
    expect(videoThumbUrl("", "")).toBeNull();
  });
});

describe("engine helpers", () => {
  it("imageWidthCss honors unit", () => {
    expect(imageWidthCss({ fullWidth: true, width: 600, sizeUnit: "pct", widthPct: 50 })).toBe("50%");
    expect(imageWidthCss({ fullWidth: false, width: 240, sizeUnit: "px", widthPct: 100 })).toBe(240);
  });
  it("padCss / cornersCss / borderCss", () => {
    expect(padCss({ t: 1, r: 2, b: 3, l: 4 })).toBe("1px 2px 3px 4px");
    expect(cornersCss({ tl: 0, tr: 0, br: 0, bl: 0 })).toBeUndefined();
    expect(cornersCss({ tl: 8, tr: 8, br: 0, bl: 0 })).toBe("8px 8px 0px 0px");
    expect(borderCss({ style: "none", width: 2, color: "#000" })).toBeUndefined();
    expect(borderCss({ style: "solid", width: 2, color: "#000" })).toBe("2px solid #000");
  });
  it("offsetStyle only when non-zero", () => {
    expect(offsetStyle({ x: 0, y: 0 })).toEqual({});
    expect(offsetStyle({ x: -10, y: 4 })).toEqual({ position: "relative", left: -10, top: 4 });
  });
});

describe("responsive resolve/route", () => {
  it("resolveForDevice applies tablet then mobile cascade", () => {
    const block = normalizeBlock({
      type: "text",
      html: "x",
      fontSize: 16,
      rsp: { tablet: { fontSize: 14 }, mobile: { fontSize: 12 } },
    }) as TextBlock;
    expect((resolveForDevice(block, "desktop") as TextBlock).fontSize).toBe(16);
    expect((resolveForDevice(block, "tablet") as TextBlock).fontSize).toBe(14);
    expect((resolveForDevice(block, "mobile") as TextBlock).fontSize).toBe(12);
  });

  it("mobile inherits tablet when mobile layer is absent", () => {
    const block = normalizeBlock({ type: "text", html: "x", fontSize: 16, rsp: { tablet: { fontSize: 14 } } }) as TextBlock;
    expect((resolveForDevice(block, "mobile") as TextBlock).fontSize).toBe(14);
  });

  it("resolvedHidden reads the hidden override", () => {
    const block = normalizeBlock({ type: "text", html: "x", rsp: { mobile: { hidden: true } } });
    expect(resolvedHidden(block, "desktop")).toBe(false);
    expect(resolvedHidden(block, "mobile")).toBe(true);
  });

  it("routePatch sends style keys to the device layer and others to base", () => {
    const block = normalizeBlock({ type: "text", html: "x", fontSize: 16, color: "#111" }) as TextBlock;
    const patch = routePatch(block, "mobile", { fontSize: 12, color: "#222" } as Partial<TextBlock>) as Record<string, unknown>;
    expect(patch.color).toBe("#222"); // shared key stays on base
    expect((patch.rsp as { mobile: { fontSize: number } }).mobile.fontSize).toBe(12);
    expect(patch.fontSize).toBeUndefined();
  });
});

describe("responsive @media css", () => {
  it("emits @media rules + a class for a block with overrides", () => {
    const block = normalizeBlock({ id: "b1", type: "text", html: "x", fontSize: 16, rsp: { mobile: { fontSize: 12 } } });
    expect(responsiveClassForBlock(block)).toBe("ee-b1");
    const row = newRow("100");
    row.cols[0].blocks.push(block);
    const css = collectResponsiveCss([row]);
    expect(css).toContain("@media only screen and (max-width:600px)");
    expect(css).toContain(".ee-b1{font-size:12px!important;}");
  });

  it("returns empty string when there are no overrides", () => {
    expect(collectResponsiveCss([newRow("100")])).toBe("");
  });

  it("menu fontSize override reaches the <a> links; block margin override reaches the wrapper", () => {
    const menu = normalizeBlock({ id: "m1", type: "menu", rsp: { mobile: { fontSize: 18 } } });
    const btn = normalizeBlock({ id: "bt1", type: "button", rsp: { mobile: { margin: { t: 1, r: 2, b: 3, l: 4 } } } });
    const row = newRow("100");
    row.cols[0].blocks.push(menu, btn);
    const css = collectResponsiveCss([row]);
    expect(css).toContain(".ee-m1 a{font-size:18px!important;}");
    // El margen del bloque viaja como padding del wrapper (ver BlockWrapper):
    // debe REEMPLAZAR al base, y con `margin` se sumaría al padding inline.
    expect(css).toContain(".ee-bt1-w{padding:1px 2px 3px 4px!important;}");
  });

  it("image width override honors the effective sizeUnit and emits radius", () => {
    const img = normalizeBlock({
      id: "i1",
      type: "image",
      src: "https://x/i.jpg",
      sizeUnit: "pct",
      widthPct: 100,
      width: 600,
      rsp: { mobile: { sizeUnit: "px", width: 200, radius: 12 } },
    });
    const row = newRow("100");
    row.cols[0].blocks.push(img);
    const css = collectResponsiveCss([row]);
    expect(css).toContain(".ee-i1 img{width:200px!important;max-width:100%!important;border-radius:12px!important;}");
  });

  it("row rsp.hidden emits display:none", () => {
    const row = newRow("100");
    row.id = "r1";
    row.rsp = { mobile: { hidden: true } };
    const css = collectResponsiveCss([row]);
    expect(css).toContain(".ee-r1{display:none!important;}");
  });
});
