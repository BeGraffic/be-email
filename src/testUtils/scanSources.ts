/* ============================================================
   @begraffic/email · testUtils/scanSources.ts
   Lector de fuentes para los tests guardianes de frontera (`/editor`,
   `/composer`): devuelve el código de cada módulo de un directorio para poder
   afirmar AUSENCIAS (no hay imports por alias, ni `fetch("/api…")`, ni
   Firebase, ni `var(--x)` sin fallback).

   Un test de ausencias pasa trivialmente si el escáner no mira nada, así que
   `scanSources` LANZA cuando el directorio no existe o no tiene fuentes: el
   guardián falla en vez de aprobar en falso.
   ============================================================ */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type SourceFile = {
  /** Ruta relativa al directorio escaneado, con "/" como separador. */
  file: string;
  code: string;
};

const SOURCE_RE = /\.tsx?$/;
const TEST_RE = /\.(test|spec)\.tsx?$/;
const SKIP_DIRS = new Set(["node_modules", "dist", "__snapshots__"]);

function walk(dir: string, root: string, out: SourceFile[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full, root, out);
      continue;
    }
    if (!entry.isFile()) continue;
    if (!SOURCE_RE.test(entry.name) || TEST_RE.test(entry.name)) continue;
    out.push({ file: relative(root, full).split(sep).join("/"), code: readFileSync(full, "utf8") });
  }
}

/** Lee recursivamente los `.ts`/`.tsx` de `dir`, excluyendo los propios tests. */
export function scanSources(dir: string): SourceFile[] {
  let sources: SourceFile[];
  try {
    sources = [];
    walk(dir, dir, sources);
  } catch (error) {
    throw new Error(`scanSources: no se pudo leer "${dir}": ${(error as Error).message}`);
  }
  if (sources.length === 0) {
    throw new Error(`scanSources: "${dir}" no contiene fuentes .ts/.tsx — el guardián no vigila nada.`);
  }
  return sources;
}

/** Nombres de los ficheros cuyo código casa con `pattern`. */
export function filesMatching(sources: SourceFile[], pattern: RegExp): string[] {
  return sources.filter((s) => new RegExp(pattern.source, pattern.flags.replace("g", "")).test(s.code)).map((s) => s.file);
}
