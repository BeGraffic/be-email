/* ============================================================
   @begraffic/email/editor · adapters.test.tsx
   Guardián de la frontera: el editor no puede saber nada de BeCRM. Falla si
   vuelve a aparecer un import por alias `@/`, un `fetch` a `/api`, un import
   de Firebase, una variable CSS sin fallback (fuera del CRM esos tokens no
   existen y el editor se vería sin colores) o una lectura de `process.env`
   (el anfitrión inyecta lo que necesite por props, nunca por convención de
   variable de entorno — ver `appUrl` en `EmailPreviewFrame`/`EmailEditor`).
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
    // 21 ficheros a día de hoy. El umbral es deliberadamente bajo: solo debe
    // atrapar un escáner que se quedó ciego (0 o casi 0 resultados), no
    // romperse cada vez que se añade o se quita un fichero del editor — con
    // 20 (margen de 1 sobre 21) cualquier limpieza de dos ficheros tumbaba
    // este test sin que el escáner tuviera ningún problema real.
    expect(files.length).toBeGreaterThanOrEqual(10);
  });

  it("no importa nada del CRM por alias", () => {
    const culpables = sources.filter((s) => /from ["']@\//.test(s.code)).map((s) => s.file);
    expect(culpables).toEqual([]);
  });

  it("no llama a rutas /api del CRM", () => {
    const culpables = sources.filter((s) => /fetch\(\s*[`"']\/api/.test(s.code)).map((s) => s.file);
    expect(culpables).toEqual([]);
  });

  it("no importa Firebase", () => {
    const culpables = sources.filter((s) => /from ["']firebase\//.test(s.code)).map((s) => s.file);
    expect(culpables).toEqual([]);
  });

  it("no lee process.env", () => {
    const culpables = sources.filter((s) => /process\.env/.test(s.code)).map((s) => s.file);
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
