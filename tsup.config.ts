import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Options } from "tsup";

/* Todas las rutas se resuelven contra el directorio de ESTE fichero, nunca
   contra `cwd`: tsup puede invocarse desde cualquier sitio del repo (p.ej.
   un script en otro paquete), y resolver contra `cwd` descartaría en
   silencio TODAS las entradas de cliente si no se ejecuta desde la raíz. */
const ROOT = dirname(fileURLToPath(import.meta.url));
const resolve = (relative: string) => join(ROOT, relative);

const shared: Options = {
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  external: ["react", "react-dom"],
};

const RENDER_SUBPATH = "./render";

const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as {
  exports?: Record<string, unknown>;
};

/* Entradas de cliente: llevan el banner `"use client"` porque son componentes
   React con estado (`render` no: es el motor puro, sin estado de UI, y se
   compila aparte). Se derivan del campo `exports` de package.json — cada
   subpath declarado (menos `./render`) es `dist/<nombre>/index.js`, así que
   su fuente es `src/<nombre>/index.ts` — en vez de mantener una lista aparte
   que pueda desincronizarse de `exports`.

   Se filtran por existencia para poder construir el paquete mientras alguna
   fuente todavía no se ha movido (el compositor llega en su propia tarea),
   pero NUNCA en silencio: cada subpath declarado sin fuente avisa con
   `console.warn`, y si el conjunto de entradas de cliente queda vacío el
   build falla — un paquete de cliente vacío nunca es un estado legítimo (antes
   de este fix, ese era justo el escenario que dejaba pasar `pnpm build`,
   `pnpm verify` y `prepublishOnly` en verde con un `./composer` roto). */
const clientSubpaths = Object.keys(pkg.exports ?? {}).filter(
  (subpath) => subpath !== "." && subpath !== RENDER_SUBPATH,
);

const clientEntry: Record<string, string> = {};
for (const subpath of clientSubpaths) {
  const name = subpath.replace(/^\.\//, ""); // "./composer" -> "composer"
  const srcRelative = `src/${name}/index.ts`;
  if (existsSync(resolve(srcRelative))) {
    clientEntry[`${name}/index`] = resolve(srcRelative);
  } else {
    console.warn(
      `[tsup] package.json declara el subpath "${subpath}" pero no existe su fuente (${srcRelative}) — se omite del build.`,
    );
  }
}

if (Object.keys(clientEntry).length === 0) {
  throw new Error(
    "[tsup] ninguna entrada de cliente tiene fuente en disco — build inválido (paquete de cliente vacío nunca es un estado legítimo).",
  );
}

export default defineConfig([
  { ...shared, entry: { "render/index": resolve("src/render/index.ts") }, clean: true },
  { ...shared, entry: clientEntry, banner: { js: '"use client";' } },
]);
