import { describe, it, expect } from "vitest";
import { PRESET_DEFS, buildPreset } from "./presets";
import { DEFAULT_GLOBAL, serializeDesign } from "../model";
import { renderEmailDesign } from "./render";

describe("preset compositions", () => {
  it("every preset builds a row and renders without throwing", async () => {
    for (const def of PRESET_DEFS) {
      const row = buildPreset(def.id);
      expect(row, `buildPreset(${def.id})`).not.toBeNull();
      const { html } = await renderEmailDesign(serializeDesign({ ...DEFAULT_GLOBAL }, [row!]), { baseUrl: "https://ejemplo.test" });
      expect(html.length, `render ${def.id}`).toBeGreaterThan(800);
      expect(html).toContain("<table");
    }
  });

  it("each preset gets fresh ids on every build (no shared references)", () => {
    const a = buildPreset("hero")!;
    const b = buildPreset("hero")!;
    expect(a.id).not.toBe(b.id);
    expect(a.cols[0].blocks[0].id).not.toBe(b.cols[0].blocks[0].id);
  });

  it("multi-column presets carry the right number of columns", () => {
    expect(buildPreset("feature")!.cols).toHaveLength(2);
    expect(buildPreset("gallery")!.cols).toHaveLength(3);
  });
});
