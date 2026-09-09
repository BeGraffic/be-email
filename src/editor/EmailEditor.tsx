/* ============================================================
   @begraffic/email/editor · EmailEditor.tsx
   Central state · undo/redo · drag handlers · assembly + imperative API

   El editor no sabe nada del proyecto anfitrión: render, subida/borrado de
   imágenes, biblioteca, búsqueda de fotos y tema entran POR PROPS.
   ============================================================ */
"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { C, STRUCTURE_DEFS } from "./constants";
import { allWebFontsHref, collectFontIds, webFontHrefs } from "./fonts";
import { imageFontFaceCss } from "./imageFonts";
import { IconBtn, Segmented } from "./controls";
import { Icon } from "./Icon";
import { Canvas, type CanvasHandlers } from "./Canvas";
import { RightPanel } from "./Sidebar";
import { MediaModal, PreviewModal } from "./modals";
import { EditorThemeToggle, UI } from "./theme";
import { StructurePanel, type BlockCtx } from "./Structure";
import { PanelLeftOpen } from "lucide-react";
import {
  DEFAULT_GLOBAL,
  addToSubColumn,
  defaultBlock,
  deserializeDesign,
  duplicateBlockTree,
  duplicateSubColumn,
  findBlockTree,
  findSubColumn,
  genId,
  insertBeforeId,
  insertToSubColumnBefore,
  moveSubColumn,
  newRow,
  patchBlockTree,
  patchSubColumn,
  removeBlockTree,
  removeSubColumn,
  rowToColumnsBlock,
  serializeDesign,
  setSubColumnWidth,
} from "./defaults";
import { clearDeviceOverridePatch, routePatch } from "./responsive";
import { buildPreset } from "../render/render/presets";
import type { ThemeController } from "./theme";
import type {
  Block,
  BlockType,
  Column,
  Device,
  DragItem,
  EmailDesign,
  EmailDoc,
  GlobalSettings,
  Row,
  Selection,
  SubColumn,
} from "./types";

export type EmailEditorHandle = {
  loadDesign: (design: unknown) => void;
  loadBlank: () => void;
  getDesign: () => EmailDesign;
  /** Export both the persisted design JSON and the server-rendered HTML. */
  exportHtml: () => Promise<{ design: EmailDesign; html: string }>;
};

export type EditorMediaItem = { name: string; src: string };

export type StockPhoto = {
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  thumb: string;
  large: string;
};

export type EmailEditorProps = {
  initialDesign?: unknown;
  /** Convierte el diseño en HTML de envío. Obligatorio: el render vive en el
   *  servidor (`@begraffic/email/render`) y el anfitrión decide cómo llegar a él. */
  renderHtml: (design: EmailDesign) => Promise<string>;
  /** Avisa al anfitrión en cada mutación del documento (para marcar "sin guardar"). */
  onChange?: () => void;
  /** Sube una imagen y devuelve su URL pública (si falta, se usa una data URL). */
  uploadImage?: (file: File) => Promise<string>;
  /** Borra imágenes subidas del almacenamiento (la biblioteca local se limpia igual). */
  deleteImage?: (urls: string[]) => Promise<void>;
  /** Lista las imágenes ya subidas por este anfitrión. */
  loadLibrary?: () => Promise<EditorMediaItem[]>;
  /** Busca fotos de stock. Si falta, el buscador no se muestra. */
  searchPhotos?: (query: string) => Promise<StockPhoto[]>;
  /** Control del tema. Si falta, no se muestra el selector. */
  theme?: ThemeController;
  /**
   * URL canónica del anfitrión (p. ej. `https://app.ejemplo.com`), la misma que
   * se le pasa al motor de render como `baseUrl`. Solo la usa la previsualización
   * (`EmailPreviewFrame`) para, en local, reescribir imágenes de producción al
   * origen actual. Si falta, ese reescrito simplemente se omite.
   */
  appUrl?: string;
  /** Se dispara una vez montado el editor (el handle imperativo ya está listo). */
  onReady?: () => void;
};

const newColumnData = (width: number): Column => ({
  id: genId(),
  width,
  blocks: [],
  padding: { t: 0, b: 0, l: 0, r: 0 },
  margin: { t: 0, b: 0, l: 0, r: 0 },
  bg: "transparent",
  bgImage: "",
  bgRepeat: "cover",
  valign: "top",
  border: { style: "none", width: 1, color: "#E5E5E5" },
});

export const EmailEditor = forwardRef<EmailEditorHandle, EmailEditorProps>(function EmailEditor(
  { initialDesign, renderHtml, onChange, uploadImage, deleteImage, loadLibrary, searchPhotos, theme, appUrl, onReady },
  ref,
) {
  const init = deserializeDesign(initialDesign);
  const [doc, setDocState] = useState<EmailDoc>({ name: "Correo", g: init.g, rows: init.rows });
  const past = useRef<EmailDoc[]>([]);
  const future = useRef<EmailDoc[]>([]);
  const lastT = useRef(0);
  const [, force] = useState(0);
  const docRef = useRef(doc);
  docRef.current = doc;

  const [selection, setSelection] = useState<Selection>({ kind: null });
  const [tab, setTab] = useState("structures");
  const [device, setDevice] = useState<Device>("desktop");
  const [dragItem, setDragItem] = useState<DragItem>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modal, setModal] = useState<null | "preview" | "media">(null);
  const [mediaIntent, setMediaIntent] = useState<"block" | "row" | "col" | "content" | "colsBlock">("block");
  // Picker: subcolumna que espera un bloque (al pulsar "+" se muestra la paleta).
  const [picker, setPicker] = useState<{ rowId: string; colIndex: number; parentId: string; subColId: string } | null>(null);
  const [structureOpen, setStructureOpen] = useState(false);

  const notify = useCallback(() => onChange?.(), [onChange]);

  const apply = useCallback(
    (updater: (prev: EmailDoc) => EmailDoc, coalesce = false) => {
      setDocState((prev) => {
        const next = updater(prev);
        const now = Date.now();
        if (!(coalesce && now - lastT.current < 700)) {
          past.current.push(prev);
          if (past.current.length > 120) past.current.shift();
          future.current = [];
        }
        lastT.current = now;
        return next;
      });
      notify();
    },
    [notify],
  );

  const undo = useCallback(() => {
    if (!past.current.length) return;
    setDocState((prev) => {
      future.current.push(prev);
      return past.current.pop()!;
    });
    // El picker puede apuntar a una subcolumna que el undo elimina → ciérralo.
    setPicker(null);
    force((x) => x + 1);
    notify();
  }, [notify]);
  const redo = useCallback(() => {
    if (!future.current.length) return;
    setDocState((prev) => {
      past.current.push(prev);
      return future.current.pop()!;
    });
    setPicker(null);
    force((x) => x + 1);
    notify();
  }, [notify]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setEditingId(null);
        setPicker(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  useEffect(() => {
    onReadyRef.current?.();
  }, []);

  /* Carga las fuentes web (Google Fonts) usadas en el documento (la global y las
     de cada bloque de texto/encabezado) para que el lienzo y la previsualización
     las muestren (WYSIWYG). Las fuentes del sistema no necesitan carga. */
  const fontHrefs = webFontHrefs(collectFontIds(doc.g.font, doc.rows));
  const fontKey = fontHrefs.join("|");
  useEffect(() => {
    for (const href of fontHrefs) {
      const id = "ee-webfont-" + href;
      if (document.getElementById(id)) continue;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontKey]);

  /* Carga el catálogo COMPLETO de fuentes para la vista previa del selector de
     tipografías: todas las web (Google) + @font-face de las creativas (TTF). El
     navegador solo descarga cada fuente cuando se usa (al renderizar su nombre),
     así que el coste es nulo hasta abrir el desplegable. Se inyecta una vez. */
  useEffect(() => {
    if (!document.getElementById("ee-font-catalog-link")) {
      const link = document.createElement("link");
      link.id = "ee-font-catalog-link";
      link.rel = "stylesheet";
      link.href = allWebFontsHref();
      document.head.appendChild(link);
    }
    if (!document.getElementById("ee-font-catalog-faces")) {
      const style = document.createElement("style");
      style.id = "ee-font-catalog-faces";
      style.textContent = imageFontFaceCss();
      document.head.appendChild(style);
    }
    // Keep images inside imported "html" blocks from blowing out the column.
    // También la regla de `input.ee-num` (los spinners nativos del input
    // numérico): en BeCRM vivía en `globals.css`; el paquete no puede depender
    // del CSS del anfitrión, así que se inyecta aquí. La inyección va DENTRO
    // del componente a propósito: `sideEffects: false` haría que el
    // tree-shaking se llevara cualquier efecto a nivel de módulo.
    // Además, paridad lienzo↔correo dentro de los bloques (data-ee-block):
    // (1) restaura los defaults UA que el preflight de Tailwind anula (viñetas,
    // sangría de listas y márgenes de párrafo del HTML inline — el correo real
    // los pinta con defaults UA); (2) fija <b>/<strong> a `bold` (700) — el
    // preflight usa `bolder`, que en un heading 600-900 computaría a 900,
    // mientras los clientes de correo aplican el UA (bold=700).
    if (!document.getElementById("ee-html-block-css")) {
      const style = document.createElement("style");
      style.id = "ee-html-block-css";
      style.textContent =
        ".ee-html-block img{max-width:100%;height:auto}.ee-html-block table{max-width:100%}" +
        "[data-ee-block] :is(ul,ol){list-style:revert;margin:revert;padding:revert}" +
        "[data-ee-block] :is(p,blockquote){margin:revert}" +
        "[data-ee-block] b,[data-ee-block] strong{font-weight:bold}" +
        "input.ee-num::-webkit-outer-spin-button,input.ee-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}" +
        "input.ee-num{-moz-appearance:textfield;appearance:textfield}";
      document.head.appendChild(style);
    }
  }, []);

  /* ── helpers ── */
  const mapRow = (rows: Row[], rowId: string, fn: (r: Row) => Row) => rows.map((r) => (r.id === rowId ? fn(r) : r));
  const setRows = (rows: Row[]) => apply((prev) => ({ ...prev, rows }));

  /* ── selection ── */
  const clearSelection = () => {
    setSelection({ kind: null });
    setEditingId(null);
    setPicker(null);
  };
  const selectRow = (rowId: string) => {
    setSelection({ kind: "row", rowId });
    setEditingId(null);
    setPicker(null);
  };
  const selectBlock = (rowId: string, colIndex: number, blockId: string) => {
    setSelection({ kind: "block", rowId, colIndex, blockId });
    setEditingId(null);
    setPicker(null);
  };
  const selectColumn = (rowId: string, colIndex: number) => {
    setSelection({ kind: "column", rowId, colIndex });
    setEditingId(null);
    setPicker(null);
  };
  const selectSubColumn = (rowId: string, colIndex: number, parentId: string, subColId: string) => {
    setSelection({ kind: "subcolumn", rowId, colIndex, parentId, subColId });
    setEditingId(null);
    setPicker(null);
  };

  /* ── rows ── */
  const addRowAt = (structureId: string, index: number) => {
    const row = newRow(structureId);
    apply((prev) => {
      const rows = [...prev.rows];
      rows.splice(index, 0, row);
      return { ...prev, rows };
    });
    selectRow(row.id);
  };
  const addPreset = (presetId: string) => {
    const row = buildPreset(presetId);
    if (!row) return;
    apply((prev) => ({ ...prev, rows: [...prev.rows, row] }));
    selectRow(row.id);
  };
  const dropRow = (index: number) => {
    if (!dragItem) return;
    if (dragItem.kind === "structure") {
      addRowAt(dragItem.structureId, index);
    } else if (dragItem.kind === "block") {
      const row = newRow("100");
      const block = defaultBlock(dragItem.blockType);
      row.cols[0].blocks.push(block);
      apply((prev) => {
        const rows = [...prev.rows];
        rows.splice(index, 0, row);
        return { ...prev, rows };
      });
      selectBlock(row.id, 0, block.id);
    } else if (dragItem.kind === "block-move") {
      apply((prev) => {
        let moved: Block | null = null;
        const rows1 = prev.rows.map((r) => ({
          ...r,
          cols: r.cols.map((c) => {
            const res = removeBlockTree(c.blocks, dragItem.blockId);
            if (res.removed) moved = res.removed;
            return { ...c, blocks: res.blocks };
          }),
        }));
        if (!moved) return prev;
        const row = newRow("100");
        row.cols[0].blocks.push(moved);
        const rows = [...rows1];
        rows.splice(index, 0, row);
        return { ...prev, rows };
      });
    } else if (dragItem.kind === "row-move") {
      apply((prev) => {
        const rows = [...prev.rows];
        const from = rows.findIndex((r) => r.id === dragItem.rowId);
        if (from < 0) return prev;
        const [moved] = rows.splice(from, 1);
        const target = from < index ? index - 1 : index;
        rows.splice(target, 0, moved);
        return { ...prev, rows };
      });
    }
    setDragItem(null);
  };
  // Las ediciones de propiedades se enrutan según la vista activa: en escritorio
  // editan la base; en tableta/móvil, las claves de estilo van a la capa
  // rsp.tablet / rsp.mobile (routePatch). La entidad se lee del estado más
  // reciente para acumular bien.
  const updateRow = (patch: Partial<Row>) =>
    setRows(mapRow(doc.rows, selection.kind === "row" ? selection.rowId : "", (r) => ({ ...r, ...routePatch(r, device, patch) })));
  const updateCol = (colIndex: number, patch: Partial<Column>) =>
    setRows(
      mapRow(doc.rows, selection.kind === "row" ? selection.rowId : "", (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, ...routePatch(c, device, patch) } : c)),
      })),
    );
  const updateSelectedColumn = (patch: Partial<Column>) =>
    apply(
      (prev) => ({
        ...prev,
        rows:
          selection.kind === "column"
            ? mapRow(prev.rows, selection.rowId, (r) => ({
                ...r,
                cols: r.cols.map((c, i) => (i === selection.colIndex ? { ...c, ...routePatch(c, device, patch) } : c)),
              }))
            : prev.rows,
      }),
      true,
    );
  const moveColumn = (dir: number) => {
    if (selection.kind !== "column") return;
    const sel = selection;
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, sel.rowId, (r) => {
        // Clone each column so the in-place width writes below never mutate
        // the Column objects held by the undo-history snapshot.
        const cols = r.cols.map((c) => ({ ...c }));
        const i = sel.colIndex;
        const j = i + dir;
        if (j < 0 || j >= cols.length) return r;
        const wi = cols[i].width;
        const wj = cols[j].width;
        [cols[i], cols[j]] = [cols[j], cols[i]];
        cols[i].width = wi;
        cols[j].width = wj;
        return { ...r, cols };
      }),
    }));
    setSelection((s) =>
      s.kind === "column"
        ? { ...s, colIndex: Math.max(0, Math.min((doc.rows.find((r) => r.id === s.rowId)?.cols.length || 1) - 1, s.colIndex + dir)) }
        : s,
    );
  };
  const changeRowLayout = (rowId: string, structureId: string) => {
    const def = STRUCTURE_DEFS.find((s) => s.id === structureId) || STRUCTURE_DEFS[0];
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => {
        const newCols = def.cols.map((w, i) => {
          const old = r.cols[i];
          return old ? { ...old, width: w } : newColumnData(w);
        });
        if (r.cols.length > def.cols.length) {
          const orphan = r.cols.slice(def.cols.length).flatMap((c) => c.blocks);
          newCols[newCols.length - 1] = {
            ...newCols[newCols.length - 1],
            blocks: [...newCols[newCols.length - 1].blocks, ...orphan],
          };
        }
        return { ...r, layout: def.id, cols: newCols };
      }),
    }));
  };
  const duplicateRow = (rowId: string) =>
    apply((prev) => {
      const i = prev.rows.findIndex((r) => r.id === rowId);
      if (i < 0) return prev;
      const clone = JSON.parse(JSON.stringify(prev.rows[i])) as Row;
      clone.id = genId();
      clone.cols.forEach((c) => {
        c.id = genId();
        c.blocks.forEach((b) => (b.id = genId()));
      });
      const rows = [...prev.rows];
      rows.splice(i + 1, 0, clone);
      return { ...prev, rows };
    });
  const deleteRow = (rowId: string) => {
    apply((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== rowId) }));
    clearSelection();
  };

  /* ── blocks ── */
  const addBlock = (rowId: string, colIndex: number, blockIndex: number) => {
    if (!dragItem) return;
    if (dragItem.kind === "block") {
      const block = defaultBlock(dragItem.blockType);
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) =>
            i === colIndex ? { ...c, blocks: [...c.blocks.slice(0, blockIndex), block, ...c.blocks.slice(blockIndex)] } : c,
          ),
        })),
      }));
      selectBlock(rowId, colIndex, block.id);
    } else if (dragItem.kind === "block-move") {
      apply((prev) => {
        let moved: Block | null = null;
        const rows1 = prev.rows.map((r) => ({
          ...r,
          cols: r.cols.map((c) => {
            const res = removeBlockTree(c.blocks, dragItem.blockId);
            if (res.removed) moved = res.removed;
            return { ...c, blocks: res.blocks };
          }),
        }));
        if (!moved) return prev;
        const movedBlock = moved;
        return {
          ...prev,
          rows: mapRow(rows1, rowId, (r) => ({
            ...r,
            cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: [...c.blocks, movedBlock] } : c)),
          })),
        };
      });
    }
    setDragItem(null);
  };
  const clickAddBlock = (type: BlockType) => {
    const block = defaultBlock(type);
    // Picker activo: añade el bloque a la subcolumna destino y cierra la paleta.
    if (picker) {
      const p = picker;
      // Valida que la subcolumna destino siga existiendo (pudo borrarse / deshacerse):
      // si no, cierra el picker sin selección huérfana.
      const targetCol = doc.rows.find((r) => r.id === p.rowId)?.cols[p.colIndex];
      if (!targetCol || !findSubColumn(targetCol.blocks, p.parentId, p.subColId)) {
        setPicker(null);
        return;
      }
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, p.rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === p.colIndex ? { ...c, blocks: addToSubColumn(c.blocks, p.parentId, p.subColId, block) } : c)),
        })),
      }));
      setPicker(null);
      selectBlock(p.rowId, p.colIndex, block.id);
      return;
    }
    if (selection.kind === "block") {
      const sel = selection;
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, sel.rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => {
            if (i !== sel.colIndex) return c;
            const at = c.blocks.findIndex((b) => b.id === sel.blockId) + 1;
            return { ...c, blocks: [...c.blocks.slice(0, at), block, ...c.blocks.slice(at)] };
          }),
        })),
      }));
      selectBlock(sel.rowId, sel.colIndex, block.id);
    } else if (selection.kind === "column") {
      const sel = selection;
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, sel.rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === sel.colIndex ? { ...c, blocks: [...c.blocks, block] } : c)),
        })),
      }));
      selectBlock(sel.rowId, sel.colIndex, block.id);
    } else if (selection.kind === "row") {
      const sel = selection;
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, sel.rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === 0 ? { ...c, blocks: [...c.blocks, block] } : c)),
        })),
      }));
      selectBlock(sel.rowId, 0, block.id);
    } else if (doc.rows.length) {
      const last = doc.rows[doc.rows.length - 1];
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, last.id, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === 0 ? { ...c, blocks: [...c.blocks, block] } : c)),
        })),
      }));
      selectBlock(last.id, 0, block.id);
    } else {
      const row = newRow("100");
      row.cols[0].blocks.push(block);
      apply((prev) => ({ ...prev, rows: [row] }));
      selectBlock(row.id, 0, block.id);
    }
  };
  const updateBlock = (rowId: string, colIndex: number, blockId: string, patch: Partial<Block>) => {
    apply(
      (prev) => ({
        ...prev,
        rows: mapRow(prev.rows, rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => {
            if (i !== colIndex) return c;
            const routed = routePatch(findBlockTree(c.blocks, blockId), device, patch);
            return { ...c, blocks: patchBlockTree(c.blocks, blockId, routed) };
          }),
        })),
      }),
      true,
    );
  };
  const updateSelectedBlock = (patch: Partial<Block>) => {
    if (selection.kind !== "block") return;
    updateBlock(selection.rowId, selection.colIndex, selection.blockId, patch);
  };
  const addBlockToRow = (rowId: string, pos: "start" | "end") => {
    if (!dragItem) return;
    if (dragItem.kind === "block") {
      const block = defaultBlock(dragItem.blockType);
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === 0 ? { ...c, blocks: pos === "start" ? [block, ...c.blocks] : [...c.blocks, block] } : c)),
        })),
      }));
      selectBlock(rowId, 0, block.id);
    } else if (dragItem.kind === "block-move") {
      apply((prev) => {
        let moved: Block | null = null;
        const rows1 = prev.rows.map((r) => ({
          ...r,
          cols: r.cols.map((c) => {
            const res = removeBlockTree(c.blocks, dragItem.blockId);
            if (res.removed) moved = res.removed;
            return { ...c, blocks: res.blocks };
          }),
        }));
        if (!moved) return prev;
        const movedBlock = moved;
        return {
          ...prev,
          rows: mapRow(rows1, rowId, (r) => ({
            ...r,
            cols: r.cols.map((c, i) => (i === 0 ? { ...c, blocks: pos === "start" ? [movedBlock, ...c.blocks] : [...c.blocks, movedBlock] } : c)),
          })),
        };
      });
    }
    setDragItem(null);
  };
  const duplicateBlock = (rowId: string, colIndex: number, blockId: string) =>
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: duplicateBlockTree(c.blocks, blockId) } : c)),
      })),
    }));
  const deleteBlock = (rowId: string, colIndex: number, blockId: string) => {
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: removeBlockTree(c.blocks, blockId).blocks } : c)),
      })),
    }));
    clearSelection();
  };
  /* Añade un bloque a una SUBcolumna de un bloque "columns" (columnas anidadas). */
  const addBlockToSubColumn = (rowId: string, colIndex: number, parentId: string, subColId: string, type: BlockType) => {
    const block = defaultBlock(type);
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: addToSubColumn(c.blocks, parentId, subColId, block) } : c)),
      })),
    }));
    setDragItem(null);
    selectBlock(rowId, colIndex, block.id);
  };
  /* Mueve un bloque EXISTENTE (de cualquier columna/subcolumna) a una subcolumna.
     Lo extrae de donde esté y lo añade al final de la subcolumna destino. */
  const moveBlockToSubColumn = (rowId: string, colIndex: number, parentId: string, subColId: string, blockId: string) => {
    // Localiza el bloque (estado actual) solo para el guard de ciclos.
    let found: Block | null = null;
    for (const r of doc.rows) {
      for (const c of r.cols) {
        const f = findBlockTree(c.blocks, blockId);
        if (f) found = f;
      }
    }
    if (!found) {
      setDragItem(null);
      return;
    }
    // Evita ciclos: no mover un bloque "columns" dentro de sí mismo o de un descendiente.
    if (found.type === "columns" && findBlockTree([found], parentId)) {
      setDragItem(null);
      return;
    }
    apply((prev) => {
      // Extrae el bloque del propio snapshot `prev` (no de una referencia previa).
      let moved: Block | null = null;
      const rows1 = prev.rows.map((r) => ({
        ...r,
        cols: r.cols.map((c) => {
          const res = removeBlockTree(c.blocks, blockId);
          if (res.removed) moved = res.removed;
          return { ...c, blocks: res.blocks };
        }),
      }));
      if (!moved) return prev;
      const movedBlock = moved;
      return {
        ...prev,
        rows: mapRow(rows1, rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: addToSubColumn(c.blocks, parentId, subColId, movedBlock) } : c)),
        })),
      };
    });
    setDragItem(null);
    selectBlock(rowId, colIndex, blockId);
  };

  /* Mueve una FILA DENTRO de una columna: la convierte en un bloque "columns"
     (columnas anidadas) y la quita del nivel superior. Email-safe (tabla anidada). */
  const dropRowIntoColumn = (targetRowId: string, colIndex: number, draggedRowId: string) => {
    setDragItem(null);
    setEditingId(null);
    if (targetRowId === draggedRowId) return; // no anidar una fila en sí misma
    const dragged = doc.rows.find((r) => r.id === draggedRowId);
    const target = doc.rows.find((r) => r.id === targetRowId);
    // Sin destino válido NO seguimos: evita quitar la fila y perder su contenido.
    if (!dragged || !target || colIndex < 0 || colIndex >= target.cols.length) return;
    const block = rowToColumnsBlock(dragged);
    apply((prev) => ({
      ...prev,
      rows: prev.rows
        .filter((r) => r.id !== draggedRowId)
        .map((r) => (r.id === targetRowId ? { ...r, cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: [...c.blocks, block] } : c)) } : r)),
    }));
    selectBlock(targetRowId, colIndex, block.id);
  };

  /* Mueve una FILA DENTRO de una subcolumna anidada. */
  const dropRowIntoSubColumn = (targetRowId: string, colIndex: number, parentId: string, subColId: string, draggedRowId: string) => {
    setDragItem(null);
    setEditingId(null);
    if (targetRowId === draggedRowId) return;
    const dragged = doc.rows.find((r) => r.id === draggedRowId);
    const target = doc.rows.find((r) => r.id === targetRowId);
    if (!dragged || !target || colIndex < 0 || colIndex >= target.cols.length) return;
    const block = rowToColumnsBlock(dragged);
    apply((prev) => ({
      ...prev,
      rows: prev.rows
        .filter((r) => r.id !== draggedRowId)
        .map((r) => (r.id === targetRowId ? { ...r, cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: addToSubColumn(c.blocks, parentId, subColId, block) } : c)) } : r)),
    }));
    selectBlock(targetRowId, colIndex, block.id);
  };

  /* Inserta/reordena un bloque en una COLUMNA antes de `anchorId` (null = al final).
     Habilita arrastrar para reordenar (no solo anexar). */
  const insertBlockInColumn = (rowId: string, colIndex: number, anchorId: string | null) => {
    if (!dragItem) return;
    if (dragItem.kind === "block") {
      const block = defaultBlock(dragItem.blockType);
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: insertBeforeId(c.blocks, anchorId, block) } : c)),
        })),
      }));
      setDragItem(null);
      selectBlock(rowId, colIndex, block.id);
    } else if (dragItem.kind === "block-move") {
      const blockId = dragItem.blockId;
      if (blockId === anchorId) {
        setDragItem(null);
        return; // soltar justo encima de sí mismo = sin cambios
      }
      apply((prev) => {
        let moved: Block | null = null;
        const rows1 = prev.rows.map((r) => ({
          ...r,
          cols: r.cols.map((c) => {
            const res = removeBlockTree(c.blocks, blockId);
            if (res.removed) moved = res.removed;
            return { ...c, blocks: res.blocks };
          }),
        }));
        if (!moved) return prev;
        const mb = moved;
        return {
          ...prev,
          rows: mapRow(rows1, rowId, (r) => ({
            ...r,
            cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: insertBeforeId(c.blocks, anchorId, mb) } : c)),
          })),
        };
      });
      setDragItem(null);
      selectBlock(rowId, colIndex, blockId);
    }
  };
  /* Inserta/reordena un bloque en una SUBCOLUMNA antes de `anchorId` (null = al final). */
  const insertBlockInSubColumn = (rowId: string, colIndex: number, parentId: string, subColId: string, anchorId: string | null) => {
    if (!dragItem) return;
    if (dragItem.kind === "block") {
      const block = defaultBlock(dragItem.blockType);
      apply((prev) => ({
        ...prev,
        rows: mapRow(prev.rows, rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: insertToSubColumnBefore(c.blocks, parentId, subColId, anchorId, block) } : c)),
        })),
      }));
      setDragItem(null);
      selectBlock(rowId, colIndex, block.id);
    } else if (dragItem.kind === "block-move") {
      const blockId = dragItem.blockId;
      if (blockId === anchorId) {
        setDragItem(null);
        return;
      }
      // Guard de ciclos: no mover un bloque "columns" dentro de sí mismo/descendiente.
      let found: Block | null = null;
      for (const r of doc.rows) for (const c of r.cols) { const f = findBlockTree(c.blocks, blockId); if (f) found = f; }
      if (!found) {
        setDragItem(null);
        return;
      }
      if (found.type === "columns" && findBlockTree([found], parentId)) {
        setDragItem(null);
        return;
      }
      apply((prev) => {
        let moved: Block | null = null;
        const rows1 = prev.rows.map((r) => ({
          ...r,
          cols: r.cols.map((c) => {
            const res = removeBlockTree(c.blocks, blockId);
            if (res.removed) moved = res.removed;
            return { ...c, blocks: res.blocks };
          }),
        }));
        if (!moved) return prev;
        const mb = moved;
        return {
          ...prev,
          rows: mapRow(rows1, rowId, (r) => ({
            ...r,
            cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: insertToSubColumnBefore(c.blocks, parentId, subColId, anchorId, mb) } : c)),
          })),
        };
      });
      setDragItem(null);
      selectBlock(rowId, colIndex, blockId);
    }
  };

  /* ── subcolumnas (de un bloque "columns") ── */
  // Pulsar "+" en una subcolumna abre la paleta de bloques apuntando a ella.
  const openSubColumnPicker = (rowId: string, colIndex: number, parentId: string, subColId: string) => {
    setEditingId(null);
    setSelection({ kind: "subcolumn", rowId, colIndex, parentId, subColId });
    setPicker({ rowId, colIndex, parentId, subColId });
  };
  const updateSelectedSubColumn = (patch: Partial<SubColumn>) => {
    if (selection.kind !== "subcolumn") return;
    const sel = selection;
    apply(
      (prev) => ({
        ...prev,
        rows: mapRow(prev.rows, sel.rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => {
            if (i !== sel.colIndex) return c;
            const routed = routePatch(findSubColumn(c.blocks, sel.parentId, sel.subColId), device, patch);
            return { ...c, blocks: patchSubColumn(c.blocks, sel.parentId, sel.subColId, routed) };
          }),
        })),
      }),
      true,
    );
  };
  // El ancho reescala las hermanas para que el total siga sumando 100%.
  const setSelectedSubColumnWidth = (width: number) => {
    if (selection.kind !== "subcolumn") return;
    const sel = selection;
    apply(
      (prev) => ({
        ...prev,
        rows: mapRow(prev.rows, sel.rowId, (r) => ({
          ...r,
          cols: r.cols.map((c, i) => (i === sel.colIndex ? { ...c, blocks: setSubColumnWidth(c.blocks, sel.parentId, sel.subColId, width) } : c)),
        })),
      }),
      true,
    );
  };
  // Restablece (elimina) la capa de overrides de la vista activa para el elemento
  // seleccionado: vuelve a heredar de escritorio. El patch { rsp } se enruta a la
  // base (rsp no es clave de estilo) a través del handler correspondiente.
  const resetDeviceOverride = () => {
    if (device === "desktop") return;
    if (selection.kind === "row") {
      const row = doc.rows.find((r) => r.id === selection.rowId);
      if (row) updateRow(clearDeviceOverridePatch(row, device));
    } else if (selection.kind === "column") {
      const col = doc.rows.find((r) => r.id === selection.rowId)?.cols[selection.colIndex];
      if (col) updateSelectedColumn(clearDeviceOverridePatch(col, device));
    } else if (selection.kind === "block") {
      const col = doc.rows.find((r) => r.id === selection.rowId)?.cols[selection.colIndex];
      const b = col ? findBlockTree(col.blocks, selection.blockId) : null;
      if (b) updateSelectedBlock(clearDeviceOverridePatch(b, device));
    } else if (selection.kind === "subcolumn") {
      const col = doc.rows.find((r) => r.id === selection.rowId)?.cols[selection.colIndex];
      const sc = col ? findSubColumn(col.blocks, selection.parentId, selection.subColId) : null;
      if (sc) updateSelectedSubColumn(clearDeviceOverridePatch(sc, device));
    }
  };
  // Operan por ids explícitos (los usa el chrome del lienzo sobre la subcolumna
  // hovereada y el panel sobre la seleccionada).
  const duplicateSubColumnAt = (rowId: string, colIndex: number, parentId: string, subColId: string) =>
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: duplicateSubColumn(c.blocks, parentId, subColId) } : c)),
      })),
    }));
  const deleteSubColumnAt = (rowId: string, colIndex: number, parentId: string, subColId: string) => {
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: removeSubColumn(c.blocks, parentId, subColId) } : c)),
      })),
    }));
    clearSelection();
  };
  const moveSubColumnAt = (rowId: string, colIndex: number, parentId: string, subColId: string, dir: number) =>
    apply((prev) => ({
      ...prev,
      rows: mapRow(prev.rows, rowId, (r) => ({
        ...r,
        cols: r.cols.map((c, i) => (i === colIndex ? { ...c, blocks: moveSubColumn(c.blocks, parentId, subColId, dir) } : c)),
      })),
    }));

  /* ── drag start ── */
  const startDrag = (e: DragEvent, item: DragItem) => {
    setDragItem(item);
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    } catch {
      /* ignore */
    }
  };
  const dropEmpty = () => {
    if (!dragItem) return;
    if (dragItem.kind === "structure") {
      addRowAt(dragItem.structureId, 0);
    } else if (dragItem.kind === "block") {
      const row = newRow("100");
      const block = defaultBlock(dragItem.blockType);
      row.cols[0].blocks.push(block);
      apply((prev) => ({ ...prev, rows: [row] }));
      selectBlock(row.id, 0, block.id);
    } else {
      addRowAt("100", 0);
    }
    setDragItem(null);
  };

  const canvasHandlers: CanvasHandlers = {
    onClearSelection: clearSelection,
    onSelectRow: selectRow,
    onSelectBlock: selectBlock,
    onSelectColumn: selectColumn,
    onDropRow: dropRow,
    onDropEmpty: dropEmpty,
    onAddBlock: addBlock,
    onInsertBlockInColumn: insertBlockInColumn,
    onInsertBlockInSubColumn: insertBlockInSubColumn,
    onAddBlockToSubColumn: addBlockToSubColumn,
    onMoveBlockToSubColumn: moveBlockToSubColumn,
    onSelectSubColumn: selectSubColumn,
    onOpenSubColumnPicker: openSubColumnPicker,
    onDuplicateSubColumn: duplicateSubColumnAt,
    onDeleteSubColumn: deleteSubColumnAt,
    onMoveSubColumn: moveSubColumnAt,
    onDropRowIntoColumn: dropRowIntoColumn,
    onDropRowIntoSubColumn: dropRowIntoSubColumn,
    onUpdateBlock: updateBlock,
    onDuplicateBlock: duplicateBlock,
    onDeleteBlock: deleteBlock,
    onAddBlockToRow: addBlockToRow,
    onDuplicateRow: duplicateRow,
    onDeleteRow: deleteRow,
    onStartEdit: (id) => setEditingId(id),
    onEndEdit: () => setEditingId(null),
    onRowDragStart: (e, rowId) => startDrag(e, { kind: "row-move", rowId }),
    onBlockDragStart: (e, rowId, colIndex, blockId) => startDrag(e, { kind: "block-move", rowId, colIndex, blockId }),
  };

  /* ── Structure-panel reorder: move a section/block WITHIN its container ── */
  const reorderRow = useCallback(
    (rowId: string, beforeRowId: string | null) => {
      apply((prev) => {
        const moving = prev.rows.find((r) => r.id === rowId);
        if (!moving) return prev;
        const without = prev.rows.filter((r) => r.id !== rowId);
        let idx = beforeRowId ? without.findIndex((r) => r.id === beforeRowId) : without.length;
        if (idx < 0) idx = without.length;
        return { ...prev, rows: [...without.slice(0, idx), moving, ...without.slice(idx)] };
      });
    },
    [apply],
  );

  // Move a block to a target container (same one = reorder, different = move
  // across sections/columns). Removes it from wherever it currently is, then
  // inserts it into the target before `beforeBlockId` (null = append).
  const moveBlock = useCallback(
    (blockId: string, target: BlockCtx, beforeBlockId: string | null) => {
      apply((prev) => {
        let found: Block | null = null;
        const cleaned = prev.rows.map((r) => ({
          ...r,
          cols: r.cols.map((c) => {
            const res = removeBlockTree(c.blocks, blockId);
            if (res.removed) found = res.removed;
            return { ...c, blocks: res.blocks };
          }),
        }));
        if (!found) return prev;
        const moved: Block = found;
        const rows = cleaned.map((r) => {
          if (r.id !== target.rowId) return r;
          return {
            ...r,
            cols: r.cols.map((c, i) => {
              if (i !== target.colIndex) return c;
              const blocks =
                target.parentId && target.subColId
                  ? insertToSubColumnBefore(c.blocks, target.parentId, target.subColId, beforeBlockId, moved)
                  : insertBeforeId(c.blocks, beforeBlockId, moved);
              return { ...c, blocks };
            }),
          };
        });
        // Safety: if the block didn't land anywhere (e.g. dropping a columns
        // block into its own descendant — removing it also removed the target),
        // abort the move so the block is never lost.
        const landed = rows.some((r) => r.cols.some((c) => !!findBlockTree(c.blocks, blockId)));
        if (!landed) return prev;
        return { ...prev, rows };
      });
    },
    [apply],
  );

  const selectFromTree = useCallback((s: Selection) => {
    setSelection(s);
    setEditingId(null);
    setPicker(null);
  }, []);

  /* ── imperative API for the host adapter ── */
  useImperativeHandle(
    ref,
    () => ({
      loadDesign: (design: unknown) => {
        const { g, rows } = deserializeDesign(design);
        past.current = [];
        future.current = [];
        setSelection({ kind: null });
        setEditingId(null);
        setDocState((prev) => ({ ...prev, g, rows }));
      },
      loadBlank: () => {
        past.current = [];
        future.current = [];
        setSelection({ kind: null });
        setEditingId(null);
        setDocState((prev) => ({ ...prev, g: { ...DEFAULT_GLOBAL }, rows: [] }));
      },
      getDesign: () => serializeDesign(docRef.current.g, docRef.current.rows),
      exportHtml: async () => {
        const design = serializeDesign(docRef.current.g, docRef.current.rows);
        const html = await renderHtml(design);
        return { design, html };
      },
    }),
    // `renderHtml` viene del anfitrión: si cambia, el handle debe usar el nuevo.
    [renderHtml],
  );

  const { g, rows } = doc;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: UI.surface,
        fontFamily: "'Google Sans', system-ui, -apple-system, sans-serif",
        color: UI.text,
      }}
    >
      {/* slim editor toolbar (template name/save/export are owned by the host page) */}
      <header
        style={{
          height: 48,
          flexShrink: 0,
          background: UI.surface,
          borderBottom: "1px solid " + UI.border,
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 10,
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", gap: 2 }}>
          <IconBtn name="undo-2" title="Deshacer" disabled={!past.current.length} onClick={undo} />
          <IconBtn name="redo-2" title="Rehacer" disabled={!future.current.length} onClick={redo} />
        </div>
        <div style={{ width: 1, height: 24, background: UI.border }} />
        <div style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Segmented
            value={device}
            onChange={(v) => setDevice(v as Device)}
            options={[
              { value: "desktop", icon: "monitor", title: "Escritorio" },
              { value: "tablet", icon: "tablet", title: "Tableta" },
              { value: "mobile", icon: "smartphone", title: "Móvil" },
            ]}
          />
          {device !== "desktop" && (
            <span
              title="Estás editando una vista específica. Los cambios de diseño/tipografía solo afectan a esta vista; colores y textos se comparten."
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, background: C.amber100, color: C.amber700, border: "1px solid " + C.amber400, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}
            >
              <Icon name={device === "tablet" ? "tablet" : "smartphone"} size={13} />
              {device === "tablet" ? "Editas tableta · solo esta vista" : "Editas móvil · solo esta vista"}
            </span>
          )}
          <button
            type="button"
            onClick={() => setModal("preview")}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, border: "1px solid " + UI.border, background: UI.surface, color: UI.accent, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}
          >
            <Icon name="eye" size={15} /> Previsualizar
          </button>
        </div>
        {theme ? <EditorThemeToggle theme={theme} /> : null}
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden", cursor: dragItem ? "grabbing" : "auto", minHeight: 0 }}>
        {structureOpen ? (
          <div style={{ width: 250, flexShrink: 0, height: "100%" }}>
            <StructurePanel
              rows={rows}
              selection={selection}
              onSelect={selectFromTree}
              onReorderRow={reorderRow}
              onMoveBlock={moveBlock}
              onClose={() => setStructureOpen(false)}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStructureOpen(true)}
            title="Mostrar estructura"
            aria-label="Mostrar estructura"
            style={{ flexShrink: 0, width: 36, height: "100%", border: "none", borderRight: `1px solid ${UI.border}`, background: UI.sidebar, cursor: "pointer", color: UI.textMuted, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 14 }}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <Canvas rows={rows} g={g} selection={selection} editingId={editingId} device={device} dragItem={dragItem} handlers={canvasHandlers} />
        <RightPanel
          selection={selection}
          rows={rows}
          g={g}
          device={device}
          onResetOverride={resetDeviceOverride}
          tab={tab}
          setTab={setTab}
          onClearSelection={clearSelection}
          onUpdateRow={updateRow}
          onUpdateCol={updateCol}
          onUpdateSelectedBlock={updateSelectedBlock}
          onUpdateSelectedColumn={updateSelectedColumn}
          onChangeRowLayout={changeRowLayout}
          onMoveColumn={moveColumn}
          picker={!!picker}
          onClosePicker={() => setPicker(null)}
          onUpdateSelectedSubColumn={updateSelectedSubColumn}
          onSetSelectedSubColumnWidth={setSelectedSubColumnWidth}
          onAddBlockToSelectedSubColumn={() => {
            if (selection.kind === "subcolumn") openSubColumnPicker(selection.rowId, selection.colIndex, selection.parentId, selection.subColId);
          }}
          onDuplicateSelectedSubColumn={() => {
            if (selection.kind === "subcolumn") duplicateSubColumnAt(selection.rowId, selection.colIndex, selection.parentId, selection.subColId);
          }}
          onDeleteSelectedSubColumn={() => {
            if (selection.kind === "subcolumn") deleteSubColumnAt(selection.rowId, selection.colIndex, selection.parentId, selection.subColId);
          }}
          onMoveSelectedSubColumn={(dir: number) => {
            if (selection.kind === "subcolumn") moveSubColumnAt(selection.rowId, selection.colIndex, selection.parentId, selection.subColId, dir);
          }}
          onUpdateGlobal={(patch: Partial<GlobalSettings>) => apply((prev) => ({ ...prev, g: { ...prev.g, ...patch } }), true)}
          onOpenMedia={(intent) => {
            setMediaIntent(intent || "block");
            setModal("media");
          }}
          onDragStartBlock={(e, type) => startDrag(e, { kind: "block", blockType: type })}
          onDragStartStructure={(e, id) => startDrag(e, { kind: "structure", structureId: id })}
          onDragEnd={() => setDragItem(null)}
          onClickBlock={clickAddBlock}
          onClickStructure={(id) => addRowAt(id, doc.rows.length)}
          onClickPreset={addPreset}
        />
      </div>

      {modal === "preview" && (
        <PreviewModal rows={rows} g={g} renderHtml={renderHtml} appUrl={appUrl} onClose={() => setModal(null)} />
      )}
      {modal === "media" && (
        <MediaModal
          uploadFile={uploadImage}
          deleteFile={deleteImage}
          listFiles={loadLibrary}
          searchPhotos={searchPhotos}
          onClose={() => setModal(null)}
          onPick={(src) => {
            if (mediaIntent === "row") updateRow({ bgImage: src });
            else if (mediaIntent === "col") updateSelectedColumn({ bgImage: src });
            else if (mediaIntent === "colsBlock") updateSelectedBlock({ bgImage: src } as Partial<Block>);
            else if (mediaIntent === "content") apply((prev) => ({ ...prev, g: { ...prev.g, contentBgImage: src } }));
            else if (mediaIntent === "block") updateSelectedBlock({ src } as Partial<Block>);
            setModal(null);
          }}
        />
      )}
    </div>
  );
});
