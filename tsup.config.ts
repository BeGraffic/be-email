import { existsSync } from "node:fs";
import { defineConfig, type Options } from "tsup";

const shared: Options = {
  format: ["esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  external: ["react", "react-dom"],
};

/* Entradas de cliente: llevan el banner `"use client"` porque son componentes
   React con estado. Se filtran por existencia para poder construir el paquete
   mientras alguna todavía no se ha movido (el compositor llega en su propia
   tarea); si un `exports` de package.json apunta a una entrada ausente, es que
   falta moverla, no que sobre. */
const CLIENT_ENTRIES: Record<string, string> = {
  "editor/index": "src/editor/index.ts",
  "composer/index": "src/composer/index.ts",
};
const clientEntry = Object.fromEntries(
  Object.entries(CLIENT_ENTRIES).filter(([, file]) => existsSync(file)),
);

export default defineConfig([
  { ...shared, entry: { "render/index": "src/render/index.ts" }, clean: true },
  { ...shared, entry: clientEntry, banner: { js: '"use client";' } },
]);
