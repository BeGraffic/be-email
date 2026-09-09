import { describe, it, expect } from "vitest";
import {
  DESIGN_GENERATOR,
  DESIGN_VERSION,
  deserializeDesign,
  isBeCrmDesign,
  normalizeBlock,
  normalizeRow,
  serializeDesign,
} from "./index";
import { DEFAULT_GLOBAL, newRow } from "./defaults";

describe("serialize/deserialize round-trip (v3)", () => {
  it("round-trips a v3 design without losing content", () => {
    const rows = [newRow("50-50")];
    const design = serializeDesign({ ...DEFAULT_GLOBAL, preheader: "Hola" }, rows);
    expect(design.version).toBe(DESIGN_VERSION);
    expect(design.generator).toBe(DESIGN_GENERATOR);
    const back = deserializeDesign(design);
    expect(back.recognized).toBe(true);
    expect(back.rows).toHaveLength(1);
    expect(back.rows[0].cols).toHaveLength(2);
    expect(back.g.preheader).toBe("Hola");
  });
});

describe("isBeCrmDesign", () => {
  it("accepts v2 and v3 designs (same generator marker)", () => {
    const v3 = serializeDesign(DEFAULT_GLOBAL, []);
    expect(isBeCrmDesign(v3)).toBe(true);
    const v2 = { version: 2, generator: DESIGN_GENERATOR, body: { global: {}, rows: [] } };
    expect(isBeCrmDesign(v2)).toBe(true);
  });
  it("rejects foreign / malformed designs", () => {
    expect(isBeCrmDesign(null)).toBe(false);
    expect(isBeCrmDesign({ generator: "other", body: { rows: [] } })).toBe(false);
    expect(isBeCrmDesign({ generator: DESIGN_GENERATOR, body: {} })).toBe(false);
  });
});

describe("deserializeDesign normalization", () => {
  it("returns a blank, unrecognized doc for junk", () => {
    const r = deserializeDesign({ foo: "bar" });
    expect(r.recognized).toBe(false);
    expect(r.rows).toEqual([]);
    expect(r.g.width).toBe(DEFAULT_GLOBAL.width);
  });

  it("treats a markerless body.rows design as FOREIGN (not recognized → blank)", () => {
    // Designs from the previous editor can also expose body.rows; without our
    // generator marker they must NOT be reinterpreted (would lose content).
    const r = deserializeDesign({ body: { global: { width: 480 }, rows: [{ layout: "100", cols: [{ width: 100, blocks: [] }] }] } });
    expect(r.recognized).toBe(false);
    expect(r.rows).toEqual([]);
  });

  it("reads a marked v2 design (recognized → normalized)", () => {
    const r = deserializeDesign({
      generator: DESIGN_GENERATOR,
      version: 2,
      body: { global: { width: 480 }, rows: [{ layout: "100", cols: [{ width: 100, blocks: [] }] }] },
    });
    expect(r.recognized).toBe(true);
    expect(r.g.width).toBe(480);
    expect(r.rows).toHaveLength(1);
  });
});

describe("normalizeBlock", () => {
  it("falls back to a text block for an unknown type", () => {
    const b = normalizeBlock({ type: "wormhole", html: "x" });
    expect(b.type).toBe("text");
  });

  it("backfills missing fields from defaults and preserves id", () => {
    const b = normalizeBlock({ id: "keep_me", type: "button", text: "Click" });
    expect(b.id).toBe("keep_me");
    if (b.type === "button") {
      expect(b.text).toBe("Click");
      expect(typeof b.padV).toBe("number");
      expect(typeof b.padH).toBe("number");
    }
  });

  it("sanitizes responsive layers to the whitelist", () => {
    const b = normalizeBlock({
      type: "text",
      html: "hi",
      rsp: { mobile: { fontSize: 12, color: "#fff" /* not allowed */ } },
    });
    expect(b.rsp?.mobile).toBeDefined();
    expect((b.rsp?.mobile as Record<string, unknown>).fontSize).toBe(12);
    expect((b.rsp?.mobile as Record<string, unknown>).color).toBeUndefined();
  });

  it("recurses into columns sub-columns", () => {
    const b = normalizeBlock({
      type: "columns",
      cols: [
        { width: 50, blocks: [{ type: "heading", html: "A" }] },
        { width: 50, blocks: [{ type: "text", html: "B" }] },
      ],
    });
    expect(b.type).toBe("columns");
    if (b.type === "columns") {
      expect(b.cols).toHaveLength(2);
      expect(b.cols[0].blocks[0].type).toBe("heading");
    }
  });
});

describe("normalizeRow", () => {
  it("rebuilds default cols when none provided", () => {
    const r = normalizeRow({ layout: "33" });
    expect(r.cols).toHaveLength(3);
  });
});

describe("normalize gates (CSS/HTML sinks)", () => {
  it("coerces responsive override values to their declared type", () => {
    // The device layers are the only model values the renderer interpolates into
    // the email's <style>; a string there could close the tag.
    const b = normalizeBlock({
      type: "text",
      html: "hi",
      rsp: { mobile: { fontSize: "18px}</style><script>alert(1)</script><style>{", hidden: "yes" } },
    });
    const mobile = b.rsp?.mobile as Record<string, unknown>;
    expect(mobile.fontSize).toBe(0);
    expect(mobile.hidden).toBe(false);
  });

  it("rejects block colors that could open new CSS declarations", () => {
    const d = normalizeBlock({ type: "divider", color: "red;background-image:url(https://evil.tld/p.png)" });
    expect(d.type).toBe("divider");
    if (d.type === "divider") expect(d.color).toBe("#E5E5E5");
  });

  it("keeps merge tags in block colors (resolved at send time)", () => {
    const d = normalizeBlock({ type: "divider", color: "{{accentColor}}" });
    if (d.type === "divider") expect(d.color).toBe("{{accentColor}}");
  });

  it("clamps impossible document widths but honors legacy narrow ones", () => {
    const widthOf = (width: unknown) =>
      deserializeDesign({
        generator: DESIGN_GENERATOR,
        version: DESIGN_VERSION,
        body: { global: { width }, rows: [] },
      }).g.width;
    expect(widthOf(4000)).toBe(1200);
    expect(widthOf(0)).toBe(200);
    expect(widthOf(-600)).toBe(200);
    expect(widthOf(480)).toBe(480); // stored v2 designs keep their width
  });

  it("rejects font ids carrying CSS punctuation", () => {
    const g = deserializeDesign({
      generator: DESIGN_GENERATOR,
      version: DESIGN_VERSION,
      body: { global: { font: "Arial;} body{display:none" }, rows: [] },
    });
    expect(g.g.font).toBe(DEFAULT_GLOBAL.font);
  });
});
