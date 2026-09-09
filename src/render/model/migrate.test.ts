import { describe, it, expect } from "vitest";
import { migrateDesign, migrateDesignOrNull } from "./migrate";
import { DESIGN_GENERATOR } from "./types";

/** A representative v2 design that exercises the dropped/transformed fields. */
function v2Design() {
  return {
    version: 2,
    generator: DESIGN_GENERATOR,
    body: {
      global: {
        width: 600,
        align: "center",
        canvasBg: "#F4F6FA",
        canvasBgImage: "https://x/img.jpg",
        canvasBgFit: "mosaic", // dropped in v3
        canvasBgOpacity: 50, // dropped
        canvasBgBlur: 8, // dropped
        textColor: "#222222",
        linkColor: "#0000EE",
        font: "Montserrat",
        padding: { t: 0, b: 0, l: 0, r: 0 },
      },
      rows: [
        {
          id: "r1",
          layout: "50-50",
          bgRow: "#ffffff",
          bgContent: "#fafafa",
          padding: { t: 16, b: 16, l: 0, r: 0 },
          border: { style: "none", width: 1, color: "#E5E5E5" },
          hideDesktop: false,
          hideMobile: false,
          bgImage: "https://x/bg.jpg",
          bgImageMode: "foreground", // dropped
          bgImageFx: "grayscale", // dropped
          bgImageOpacity: 40, // dropped
          bgOverlay: { color: "#000000", opacity: 35, vertical: true, horizontal: false }, // → {color,opacity}
          cols: [
            {
              id: "c1",
              width: 50,
              padding: { t: 0, b: 0, l: 0, r: 0 },
              margin: { t: 0, b: 0, l: 0, r: 0 },
              bg: "transparent",
              bgImage: "",
              bgRepeat: "cover",
              bgBlur: 6, // dropped
              valign: "top",
              border: { style: "none", width: 1, color: "#E5E5E5" },
              blocks: [
                { id: "b1", type: "heading", html: "Hola", level: "h1", fontSize: 30, lineHeight: 1.2, weight: 800, align: "justify", color: "#111" },
                { id: "b2", type: "text", html: "Mundo", fontSize: 15, lineHeight: 1.6, align: "left", color: "#333" },
              ],
            },
            {
              id: "c2",
              width: 50,
              padding: { t: 0, b: 0, l: 0, r: 0 },
              margin: { t: 0, b: 0, l: 0, r: 0 },
              bg: "transparent",
              bgImage: "",
              bgRepeat: "cover",
              valign: "top",
              border: { style: "none", width: 1, color: "#E5E5E5" },
              blocks: [
                { id: "b3", type: "button", text: "Ir", href: "https://x", bg: "#F59E0B", color: "#78350F", fontSize: 15, weight: 600, radius: 8, padV: 13, padH: 28, fullWidth: false, align: "center", padding: { t: 16, b: 16, l: 20, r: 20 } },
              ],
            },
          ],
        },
      ],
    },
  };
}

describe("migrateDesign v2 → v3", () => {
  it("bumps version to 3 and keeps the generator", () => {
    const { design, recognized, ours } = migrateDesign(v2Design());
    expect(recognized).toBe(true);
    expect(ours).toBe(true);
    expect(design.version).toBe(3);
    expect(design.generator).toBe(DESIGN_GENERATOR);
  });

  it("preserves structure and content", () => {
    const { design } = migrateDesign(v2Design());
    expect(design.body.rows).toHaveLength(1);
    const row = design.body.rows[0];
    expect(row.cols).toHaveLength(2);
    expect(row.cols[0].blocks[0]).toMatchObject({ type: "heading", html: "Hola", level: "h1" });
    expect(row.cols[1].blocks[0]).toMatchObject({ type: "button", text: "Ir", href: "https://x" });
  });

  it("preserves justify alignment", () => {
    const { design } = migrateDesign(v2Design());
    const heading = design.body.rows[0].cols[0].blocks[0];
    expect(heading.type === "heading" && heading.align).toBe("justify");
  });

  it("maps a directional overlay to a solid scrim {color,opacity}", () => {
    const { design } = migrateDesign(v2Design());
    const ov = design.body.rows[0].bgOverlay;
    expect(ov).toEqual({ color: "#000000", opacity: 35 });
    expect((ov as Record<string, unknown>).vertical).toBeUndefined();
  });

  it("drops email-unsafe effect fields", () => {
    const { design } = migrateDesign(v2Design());
    const g = design.body.global as Record<string, unknown>;
    expect(g.canvasBgFit).toBeUndefined();
    expect(g.canvasBgBlur).toBeUndefined();
    const row = design.body.rows[0] as Record<string, unknown>;
    expect(row.bgImageMode).toBeUndefined();
    expect(row.bgImageFx).toBeUndefined();
    const col = design.body.rows[0].cols[0] as Record<string, unknown>;
    expect(col.bgBlur).toBeUndefined();
  });

  it("keeps the content background image (plain)", () => {
    const { design } = migrateDesign(v2Design());
    expect(design.body.rows[0].bgImage).toBe("https://x/bg.jpg");
  });
});

describe("migrate unknown / legacy", () => {
  it("returns recognized:false and a blank design for foreign payloads", () => {
    const { recognized, ours, design } = migrateDesign({ schemaVersion: 1, counters: {}, body: { rows: "nope" } });
    expect(recognized).toBe(false);
    expect(ours).toBe(false);
    expect(design.body.rows).toEqual([]);
  });

  it("migrateDesignOrNull returns null for unrecognizable input", () => {
    expect(migrateDesignOrNull(null)).toBeNull();
    expect(migrateDesignOrNull({ foo: 1 })).toBeNull();
  });
});
