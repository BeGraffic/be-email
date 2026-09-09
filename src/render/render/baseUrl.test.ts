import { describe, expect, it } from "vitest";
import { renderEmailDesign } from "./render";
import { DEFAULT_GLOBAL, newRow, normalizeBlock, serializeDesign, type Block, type GlobalSettings, type Row } from "../model";

function design(rows: Row[], g: Partial<GlobalSettings> = {}) {
  return serializeDesign({ ...DEFAULT_GLOBAL, ...g }, rows);
}
function rowWith(blocks: Block[], structure = "100"): Row {
  const r = newRow(structure);
  r.cols[0].blocks = blocks;
  return r;
}

describe("baseUrl", () => {
  it("usa la baseUrl que recibe (no un default de Be Graffic) para los bloques que la consumen", async () => {
    // titleImage, timer y social son los bloques que de verdad leen `baseUrl`
    // en BlockNode (EmailDocument.tsx); con `rows: []` este test nunca los
    // ejercita y pasa aunque se reintroduzca un default.
    const baseUrl = "https://ejemplo.test";
    const rows = [
      rowWith([
        normalizeBlock({ type: "titleImage", text: "Hola", font: "BebasNeue" }),
        normalizeBlock({ type: "timer", target: "2030-01-01T00:00" }),
        normalizeBlock({ type: "social", networks: [{ net: "facebook", url: "#" }] }),
      ]),
    ];
    const { html } = await renderEmailDesign(design(rows), { baseUrl });
    // Positivo: la baseUrl recibida aparece de verdad en el HTML generado.
    expect(html).toContain(baseUrl);
    // Negativo: sigue sin caer en el antiguo default de Be Graffic.
    expect(html).not.toContain("crm.begraffic.com");
  });
});
