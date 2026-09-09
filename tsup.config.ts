import { defineConfig } from "tsup";

const shared = {
  format: ["esm"] as const,
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  external: ["react", "react-dom"],
};

export default defineConfig([
  { ...shared, entry: { "render/index": "src/render/index.ts" }, clean: true },
  {
    ...shared,
    entry: {
      "editor/index": "src/editor/index.ts",
      "composer/index": "src/composer/index.ts",
    },
    banner: { js: '"use client";' },
  },
]);
