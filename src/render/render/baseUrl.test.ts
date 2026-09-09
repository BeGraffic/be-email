import { describe, expect, it } from "vitest";
import { renderEmailDesign } from "./render";

const DESIGN = {
  version: 3,
  g: { bg: "#ffffff", contentWidth: 600, linkColor: "#1E4876" },
  rows: [],
};

describe("baseUrl", () => {
  it("usa la baseUrl que recibe, sin caer en un default de Be Graffic", async () => {
    const { html } = await renderEmailDesign(DESIGN, { baseUrl: "https://ejemplo.test" });
    expect(html).not.toContain("crm.begraffic.com");
  });
});
