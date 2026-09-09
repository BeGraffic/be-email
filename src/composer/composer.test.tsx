/* ============================================================
   @begraffic/email/composer · composer.test.tsx
   Guardián de la frontera: el compositor no puede saber nada de BeCRM. Falla
   si vuelve a aparecer un import por alias `@/`, un import de Firebase, una
   clase de Tailwind (`className=`), una variable CSS sin fallback (fuera del
   CRM esos tokens no existen y el compositor se vería sin colores) o una
   lectura de `process.env` (el anfitrión inyecta lo que necesite por props —
   ver `uploadImage`).

   Un test de AUSENCIAS aprueba en falso si el escáner mira al directorio
   equivocado, así que el primer caso comprueba que de verdad ve las fuentes
   del compositor y `scanSources` lanza cuando el directorio está vacío.
   ============================================================ */
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { filesMatching, scanSources } from "../testUtils/scanSources";

const DIR = join(import.meta.dirname, ".");
const sources = scanSources(DIR);

describe("frontera del composer", () => {
  it("el escáner ve de verdad las fuentes del composer", () => {
    const files = sources.map((s) => s.file);
    for (const expected of ["RichEmailEditor.tsx", "RichTextEditor.tsx", "ui.tsx", "index.ts"]) {
      expect(files).toContain(expected);
    }
  });

  it("no importa nada del CRM por alias", () => {
    expect(filesMatching(sources, /from ["']@\//)).toEqual([]);
  });

  it("no importa Firebase", () => {
    expect(filesMatching(sources, /from ["']firebase\//)).toEqual([]);
  });

  it("no usa clases Tailwind", () => {
    expect(filesMatching(sources, /className=/)).toEqual([]);
  });

  it("no lee process.env", () => {
    expect(filesMatching(sources, /process\.env/)).toEqual([]);
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
