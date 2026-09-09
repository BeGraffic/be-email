/* ============================================================
   @begraffic/email/editor · defaults.ts (compat shim → v3 model)
   Factories, block-tree operations and (de)serialization now live in
   ../render/model. Re-exported here so the editor's relative imports keep
   working. `deserializeDesign` now also returns `recognized` (extra field;
   existing `{ g, rows }` destructuring is unaffected).
   ============================================================ */
export * from "../render/model/defaults";
export {
  serializeDesign,
  deserializeDesign,
  isBeCrmDesign,
  normalizeBlock,
  normalizeRow,
  normalizeColumn,
  normalizeSubColumn,
  normalizeGlobal,
} from "../render/model/schema";
export { DESIGN_GENERATOR, DESIGN_VERSION } from "../render/model/types";
