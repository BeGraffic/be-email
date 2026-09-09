/* ============================================================
   BeCRM — Email Builder · model/migrate.ts
   v2 (and legacy) → v3 migration. Built on the schema normalizers so it
   shares the exact same field-picking/dropping rules as load-time.

   Policy: NEVER silently blank a recognizable design. A design is
   recognizable if it carries our generator marker OR exposes `body.rows`.
   Anything else returns recognized:false so callers (the edit page, the
   backfill script) can preserve the previously-rendered html instead of
   overwriting it with an empty email.
   ============================================================ */
import { deserializeDesign, isBeCrmDesign, serializeDesign } from "./schema";
import { type EmailDesign } from "./types";

export type MigrationResult = {
  /** A clean, normalized v3 design (blank body if the input was unrecognizable). */
  design: EmailDesign;
  /** True when the input was a readable design (v3, v2, or any `body.rows`). */
  recognized: boolean;
  /** True when the input carried our generator marker (vs a foreign/legacy doc). */
  ours: boolean;
};

/** Migrate any stored design payload to a clean, normalized v3 design. */
export function migrateDesign(input: unknown): MigrationResult {
  const { g, rows, recognized } = deserializeDesign(input);
  return {
    design: serializeDesign(g, rows),
    recognized,
    ours: isBeCrmDesign(input),
  };
}

/** Convenience: the v3 design, or null when the input was unrecognizable. */
export function migrateDesignOrNull(input: unknown): EmailDesign | null {
  const result = migrateDesign(input);
  return result.recognized ? result.design : null;
}
