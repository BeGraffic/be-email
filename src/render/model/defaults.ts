/* ============================================================
   BeCRM — Email Builder · model/defaults.ts
   Factories for blocks/rows/global + pure block-tree operations.
   (De)serialization + migration live in schema.ts / migrate.ts.
   ============================================================ */
import { C, STRUCTURE_DEFS } from "./constants";
import { DESIGN_GENERATOR, DESIGN_VERSION } from "./types";
import type {
  Block,
  BlockType,
  Column,
  ColumnsBlock,
  ContentPanel,
  EmailDesign,
  GlobalSettings,
  Row,
  Sides,
  SubColumn,
} from "./types";

export const genId = () => "el_" + Math.random().toString(36).slice(2, 9);

export const clampNum = (n: number, min?: number, max?: number) => {
  if (Number.isNaN(n)) n = min ?? 0;
  if (min != null && n < min) n = min;
  if (max != null && n > max) n = max;
  return n;
};

const P = (t: number, b: number, l: number, r: number): Sides => ({ t, b, l, r });

export const DEFAULT_GLOBAL: GlobalSettings = {
  width: 600,
  align: "center",
  preheader: "",
  darkMode: false,
  lang: "es",
  dir: "ltr",
  canvasBg: "#F4F6FA",
  canvasBgImage: "",
  contentBg: "#FFFFFF",
  contentRadius: 0,
  textColor: "#404040",
  linkColor: "#1E4876",
  font: "Arial",
  padding: { t: 0, b: 0, l: 0, r: 0 },
};

export function defaultBlock(type: BlockType): Block {
  const base = { id: genId(), margin: { t: 0, b: 0, l: 0, r: 0 } };
  switch (type) {
    case "heading":
      return { ...base, type, html: "Título de la sección", level: "h2", fontSize: 26, lineHeight: 1.3, weight: 700, align: "left", color: "#0F2542", padding: P(12, 8, 20, 20) };
    case "text":
      return { ...base, type, html: "Escribe aquí tu texto. Haz doble clic para editar y dar formato a tu mensaje para tus contactos.", fontSize: 15, lineHeight: 1.6, align: "left", color: "#404040", padding: P(10, 10, 20, 20) };
    case "image":
      return { ...base, type, src: "", alt: "", href: "", newTab: true, fullWidth: true, width: 600, sizeUnit: "pct", widthPct: 100, align: "center", radius: 0, padding: P(0, 0, 0, 0) };
    case "button":
      return { ...base, type, text: "Comprar ahora", href: "#", bg: C.amber500, color: C.amberDark, fontSize: 15, weight: 600, radius: 8, padV: 13, padH: 28, fullWidth: false, align: "center", padding: P(16, 16, 20, 20) };
    case "divider":
      return { ...base, type, thickness: 1, style: "solid", color: "#E5E5E5", width: 100, align: "center", padding: P(12, 12, 20, 20) };
    case "spacer":
      return { ...base, type, height: 32 };
    case "social":
      return { ...base, type, networks: [{ id: genId(), net: "facebook", url: "#" }, { id: genId(), net: "instagram", url: "#" }, { id: genId(), net: "youtube", url: "#" }], style: "rounded-color", size: 34, gap: 10, align: "center", padding: P(12, 12, 20, 20) };
    case "video":
      return {
        ...base,
        type,
        thumb: "",
        href: "",
        fullWidth: true,
        width: 600,
        align: "center",
        radius: 8,
        showPlay: true,
        playColor: "#FFFFFF",
        playAccent: "#0F2542",
        playOpacity: 95,
        playSize: 64,
        overlayText: "",
        overlaySubtext: "",
        overlayColor: "#FFFFFF",
        overlayBg: "#0F2542",
        overlayOpacity: 35,
        overlayPosition: "top",
        padding: P(10, 10, 20, 20),
      };
    case "html":
      return { ...base, type, code: '<!-- Tu HTML personalizado -->\n<p style="text-align:center;color:#737373;">Bloque HTML</p>' };
    case "menu":
      return { ...base, type, items: [{ id: genId(), label: "Inicio", href: "#" }, { id: genId(), label: "Nosotros", href: "#" }, { id: genId(), label: "Contacto", href: "#" }], color: C.navy700, fontSize: 14, gap: 18, align: "center", padding: P(12, 12, 20, 20) };
    case "timer":
      // Default target 7 days out, minute precision. Date.now is fine at editor
      // runtime (factories run client-side on user action, never in a workflow).
      return { ...base, type, target: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16), color: "#0F2542", boxBg: "#F4F6FA", labelColor: "#737373", showLabels: true, align: "center", padding: P(16, 16, 20, 20) };
    case "titleImage":
      return { ...base, type, text: "Tu título", font: "BebasNeue", fontSize: 48, color: "#0F2542", align: "center", padding: P(14, 14, 20, 20) };
    case "columns":
      return { ...base, type, gap: 16, stackMobile: true, hideDesktop: false, hideMobile: false, bg: "transparent", bgType: "solid", bgImage: "", bgRepeat: "cover", cols: [newSubColumn(50), newSubColumn(50)] };
    default: {
      const _never: never = type;
      throw new Error(`Bloque desconocido: ${_never}`);
    }
  }
}

export function newSubColumn(width: number): SubColumn {
  return { id: genId(), width, blocks: [], padding: P(8, 8, 8, 8), margin: P(0, 0, 0, 0), valign: "top", bg: "transparent" };
}

/** Glass card preset when enabled: dark translucent scrim, rounded, padded. */
export function defaultContentPanel(): ContentPanel {
  return { enabled: true, color: "#0F2542", opacity: 42, radius: 18, padding: P(20, 20, 22, 22) };
}

/** Convert a whole ROW into a `columns` block so it can be moved INSIDE a
 *  column. Carries the row's CONTENT background (color/gradient/image + scrim)
 *  to the columns block, and each Column → SubColumn preserving its surface. The
 *  full-width bgRow / row padding / height / radius have no wrapper equivalent. */
export function rowToColumnsBlock(row: Row): ColumnsBlock {
  return {
    id: genId(),
    type: "columns",
    margin: { t: 0, b: 0, l: 0, r: 0 },
    gap: 16,
    stackMobile: true,
    hideDesktop: row.hideDesktop,
    hideMobile: row.hideMobile,
    bg: row.bgContent,
    bgType: row.bgContentType,
    bgGradient: row.bgContentGradient,
    bgImage: row.bgImage || undefined,
    bgRepeat: row.bgRepeat,
    bgImageWidth: row.bgImageWidth,
    bgOverlay: row.bgOverlay,
    cols: row.cols.map((c) => ({
      id: genId(),
      width: c.width,
      blocks: c.blocks,
      padding: c.padding,
      margin: c.margin,
      valign: c.valign,
      bg: c.bg,
      bgType: c.bgType,
      bgGradient: c.bgGradient,
      bgImage: c.bgImage || undefined,
      bgRepeat: c.bgRepeat,
      bgImageWidth: c.bgImageWidth,
      bgOpacity: c.bgOpacity,
      bgOverlay: c.bgOverlay,
      panel: c.panel,
      rsp: c.rsp,
      border: c.border,
    })),
  };
}

/* ── Block tree: recursive operations that descend into the sub-columns of
   `columns` blocks. Block `id` is document-unique so flat selection works. ── */

export function findBlockTree(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.type === "columns") {
      for (const sc of b.cols) {
        const found = findBlockTree(sc.blocks, id);
        if (found) return found;
      }
    }
  }
  return null;
}

export function patchBlockTree(blocks: Block[], id: string, patch: Partial<Block>): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, ...patch } as Block;
    if (b.type === "columns") {
      return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: patchBlockTree(sc.blocks, id, patch) })) };
    }
    return b;
  });
}

export function removeBlockTree(blocks: Block[], id: string): { blocks: Block[]; removed: Block | null } {
  let removed: Block | null = null;
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) {
      removed = b;
      continue;
    }
    if (b.type === "columns") {
      const cols = b.cols.map((sc) => {
        const r = removeBlockTree(sc.blocks, id);
        if (r.removed) removed = r.removed;
        return { ...sc, blocks: r.blocks };
      });
      out.push({ ...b, cols });
    } else {
      out.push(b);
    }
  }
  return { blocks: out, removed };
}

export function regenBlockIds(b: Block): Block {
  if (b.type === "columns") {
    return { ...b, id: genId(), cols: b.cols.map((sc) => ({ ...sc, id: genId(), blocks: sc.blocks.map(regenBlockIds) })) };
  }
  return { ...b, id: genId() };
}

export function duplicateBlockTree(blocks: Block[], id: string): Block[] {
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.id === id) {
      out.push(b, regenBlockIds(b));
      continue;
    }
    if (b.type === "columns") {
      out.push({ ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: duplicateBlockTree(sc.blocks, id) })) });
    } else {
      out.push(b);
    }
  }
  return out;
}

export function insertBeforeId(blocks: Block[], anchorId: string | null, newBlock: Block): Block[] {
  if (!anchorId) return [...blocks, newBlock];
  const i = blocks.findIndex((b) => b.id === anchorId);
  if (i < 0) return [...blocks, newBlock];
  return [...blocks.slice(0, i), newBlock, ...blocks.slice(i)];
}

export function insertToSubColumnBefore(blocks: Block[], parentId: string, subColId: string, anchorId: string | null, newBlock: Block): Block[] {
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      return { ...b, cols: b.cols.map((sc) => (sc.id === subColId ? { ...sc, blocks: insertBeforeId(sc.blocks, anchorId, newBlock) } : sc)) };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: insertToSubColumnBefore(sc.blocks, parentId, subColId, anchorId, newBlock) })) };
  });
}

export function addToSubColumn(blocks: Block[], parentId: string, subColId: string, newBlock: Block): Block[] {
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      return { ...b, cols: b.cols.map((sc) => (sc.id === subColId ? { ...sc, blocks: [...sc.blocks, newBlock] } : sc)) };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: addToSubColumn(sc.blocks, parentId, subColId, newBlock) })) };
  });
}

/* ── Sub-column operations (auto-rebalance widths to ~100%) ── */

const evenSubWidths = (cols: SubColumn[]): SubColumn[] => {
  const w = cols.length ? Math.round((100 / cols.length) * 100) / 100 : 100;
  return cols.map((sc) => ({ ...sc, width: w }));
};

export function patchSubColumn(blocks: Block[], parentId: string, subColId: string, patch: Partial<SubColumn>): Block[] {
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      return { ...b, cols: b.cols.map((sc) => (sc.id === subColId ? { ...sc, ...patch } : sc)) };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: patchSubColumn(sc.blocks, parentId, subColId, patch) })) };
  });
}

export function findSubColumn(blocks: Block[], parentId: string, subColId: string): SubColumn | null {
  for (const b of blocks) {
    if (b.type !== "columns") continue;
    if (b.id === parentId) {
      const sc = b.cols.find((s) => s.id === subColId);
      if (sc) return sc;
    }
    for (const sc of b.cols) {
      const found = findSubColumn(sc.blocks, parentId, subColId);
      if (found) return found;
    }
  }
  return null;
}

export function duplicateSubColumn(blocks: Block[], parentId: string, subColId: string): Block[] {
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      const idx = b.cols.findIndex((s) => s.id === subColId);
      if (idx < 0) return b;
      const clone: SubColumn = { ...b.cols[idx], id: genId(), blocks: b.cols[idx].blocks.map(regenBlockIds) };
      return { ...b, cols: evenSubWidths([...b.cols.slice(0, idx + 1), clone, ...b.cols.slice(idx + 1)]) };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: duplicateSubColumn(sc.blocks, parentId, subColId) })) };
  });
}

export function removeSubColumn(blocks: Block[], parentId: string, subColId: string): Block[] {
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      if (b.cols.length <= 1) return b;
      return { ...b, cols: evenSubWidths(b.cols.filter((s) => s.id !== subColId)) };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: removeSubColumn(sc.blocks, parentId, subColId) })) };
  });
}

export function setSubColumnWidth(blocks: Block[], parentId: string, subColId: string, width: number): Block[] {
  const w = Math.max(5, Math.min(95, Math.round(width)));
  const round2 = (n: number) => Math.round(n * 100) / 100;
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      const others = b.cols.filter((s) => s.id !== subColId);
      if (!others.length) return { ...b, cols: b.cols.map((s) => (s.id === subColId ? { ...s, width: 100 } : s)) };
      const remaining = 100 - w;
      const othersTotal = others.reduce((sum, s) => sum + (s.width || 0), 0);
      return {
        ...b,
        cols: b.cols.map((s) => {
          if (s.id === subColId) return { ...s, width: w };
          const share = othersTotal > 0 ? (s.width || 0) / othersTotal : 1 / others.length;
          return { ...s, width: round2(remaining * share) };
        }),
      };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: setSubColumnWidth(sc.blocks, parentId, subColId, width) })) };
  });
}

export function moveSubColumn(blocks: Block[], parentId: string, subColId: string, dir: number): Block[] {
  return blocks.map((b) => {
    if (b.type !== "columns") return b;
    if (b.id === parentId) {
      const i = b.cols.findIndex((s) => s.id === subColId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= b.cols.length) return b;
      const cols = [...b.cols];
      [cols[i], cols[j]] = [cols[j], cols[i]];
      return { ...b, cols };
    }
    return { ...b, cols: b.cols.map((sc) => ({ ...sc, blocks: moveSubColumn(sc.blocks, parentId, subColId, dir) })) };
  });
}

export function newColumn(width: number): Column {
  return {
    id: genId(),
    width,
    blocks: [],
    padding: { t: 0, b: 0, l: 0, r: 0 },
    margin: { t: 0, b: 0, l: 0, r: 0 },
    bg: "transparent",
    bgImage: "",
    bgRepeat: "cover",
    bgOpacity: 100,
    valign: "top",
    border: { style: "none", width: 1, color: "#E5E5E5" },
  };
}

export function newRow(structureId: string): Row {
  const def = STRUCTURE_DEFS.find((s) => s.id === structureId) || STRUCTURE_DEFS[0];
  return {
    id: genId(),
    layout: def.id,
    cols: def.cols.map((w) => ({ ...newColumn(w) })),
    bgRow: "transparent",
    bgContent: "transparent",
    padding: { t: 16, b: 16, l: 0, r: 0 },
    border: { style: "none", width: 1, color: "#E5E5E5" },
    hideDesktop: false,
    hideMobile: false,
  };
}

/**
 * Best-effort import of a LEGACY (non-becrm) template's stored HTML into a v3
 * design so the new editor opens with the existing content instead of blank:
 * one full-width row → column → a single `html` block holding the legacy body.
 * The `<head>`/`<style>`/`<script>` are dropped (they can't live in an html
 * block); structural tables are stripped at render time for cell-safety, so
 * complex table layouts may flatten — acceptable as an editable starting point.
 */
export function legacyHtmlToDesign(html: string): EmailDesign {
  const source = html || "";
  const bodyMatch = source.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let inner = (bodyMatch ? bodyMatch[1] : source).trim();
  inner = inner
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();
  const row = newRow("100");
  row.cols[0].blocks = [{ ...defaultBlock("html"), code: inner || "<p></p>" } as Block];
  return {
    version: DESIGN_VERSION,
    generator: DESIGN_GENERATOR,
    body: { global: { ...DEFAULT_GLOBAL }, rows: [row] },
  };
}
