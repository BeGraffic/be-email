/* ============================================================
   @begraffic/email/editor · adapters.test.tsx
   Guardián de la frontera: el editor no puede saber nada de BeCRM. Falla si
   vuelve a aparecer un import por alias `@/`, un `fetch` a `/api`, un import
   de Firebase o una variable CSS sin fallback (fuera del CRM esos tokens no
   existen y el editor se vería sin colores).
   ============================================================ */
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { scanSources } from "../testUtils/scanSources";

const DIR = join(import.meta.dirname, ".");
const sources = scanSources(DIR);

describe("frontera del editor", () => {
  it("el escáner ve de verdad las fuentes del editor", () => {
    const files = sources.map((s) => s.file);
    for (const expected of ["EmailEditor.tsx", "modals.tsx", "theme.tsx", "Canvas.tsx", "Sidebar.tsx"]) {
      expect(files).toContain(expected);
    }
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  it("no importa nada del CRM por alias", () => {
    const culpables = sources.filter((s) => /from "@\//.test(s.code)).map((s) => s.file);
    expect(culpables).toEqual([]);
  });

  it("no llama a rutas /api del CRM", () => {
    const culpables = sources.filter((s) => /fetch\(\s*[`"']\/api/.test(s.code)).map((s) => s.file);
    expect(culpables).toEqual([]);
  });

  it("no importa Firebase", () => {
    const culpables = sources.filter((s) => /from "firebase\//.test(s.code)).map((s) => s.file);
    expect(culpables).toEqual([]);
  });

  it("toda var CSS lleva fallback", () => {
    const sinFallback: string[] = [];
    for (const { file, code } of sources) {
      for (const m of code.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)) {
        sinFallback.push(`${file}: ${m[1]}`);
      }
    }
    expect(sinFallback).toEqual([]);
  });
});
