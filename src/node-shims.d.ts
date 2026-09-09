/* ============================================================
   @begraffic/email · node-shims.d.ts
   Superficie MÍNIMA de Node que usan los tests guardianes y `tsup.config.ts`.
   El paquete NO declara `@types/node` como dependencia (nada del código
   publicado necesita Node), así que en vez de arrastrar los tipos completos se
   declaran aquí las pocas firmas que se usan.
   ============================================================ */
declare module "node:fs" {
  export type Dirent = { name: string; isDirectory(): boolean; isFile(): boolean };
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function existsSync(path: string): boolean;
}

declare module "node:path" {
  export const sep: string;
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
}

interface ImportMeta {
  /** Directorio del módulo actual (Node ≥ 20.11 / vitest). */
  readonly dirname: string;
}
