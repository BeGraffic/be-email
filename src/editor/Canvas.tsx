/* ============================================================
   @begraffic/email/editor · Canvas.tsx
   Visual block renderer + floating controls + drop zones + inline edit
   ============================================================ */
"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { CanvasBgLayers, columnSurface, columnsBlockBackground, contentPanelStyle, rowContentBackground, subColumnSurface, surfaceBackground } from "./background";
import { BLOCK_DEFS, C, DROP, MERGE_TAGS, SEL } from "./constants";
import { UI } from "./theme";
import { fontStack } from "./fonts";
import { Btn } from "./controls";
import { Icon } from "./Icon";
import { borderCss, COLUMN_GUTTER, cornersCss, offsetStyle, padCss, rowContentNeedsVisible } from "./generators";
import { safeCssColor } from "../render/model/schema";
import { BlockVisual } from "./BlockVisual";
import { resolveForDevice, resolvedHidden } from "./responsive";
import type { Block, BlockType, Column, ColumnsBlock, Device, DragItem, GlobalSettings, Row, Selection } from "./types";

export type CanvasHandlers = {
  onClearSelection: () => void;
  onSelectRow: (rowId: string) => void;
  onSelectBlock: (rowId: string, colIndex: number, blockId: string) => void;
  onSelectColumn: (rowId: string, colIndex: number) => void;
  onDropRow: (index: number) => void;
  onDropEmpty: () => void;
  onAddBlock: (rowId: string, colIndex: number, blockIndex: number) => void;
  /** Inserta/reordena un bloque en una columna antes de `anchorId` (null = al final). */
  onInsertBlockInColumn: (rowId: string, colIndex: number, anchorId: string | null) => void;
  /** Inserta/reordena un bloque en una subcolumna antes de `anchorId` (null = al final). */
  onInsertBlockInSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string, anchorId: string | null) => void;
  onAddBlockToSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string, type: BlockType) => void;
  /** Mueve un bloque existente a una subcolumna (drag-move entre columnas/subcolumnas). */
  onMoveBlockToSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string, blockId: string) => void;
  /** Selecciona una subcolumna (muestra sus ajustes en el panel). */
  onSelectSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string) => void;
  /** Abre la paleta de bloques apuntando a la subcolumna (botón "+"). */
  onOpenSubColumnPicker: (rowId: string, colIndex: number, parentId: string, subColId: string) => void;
  onDuplicateSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string) => void;
  onDeleteSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string) => void;
  onMoveSubColumn: (rowId: string, colIndex: number, parentId: string, subColId: string, dir: number) => void;
  /** Suelta una fila DENTRO de una columna → se convierte en un bloque de columnas anidado. */
  onDropRowIntoColumn: (targetRowId: string, colIndex: number, draggedRowId: string) => void;
  /** Suelta una fila DENTRO de una subcolumna anidada. */
  onDropRowIntoSubColumn: (targetRowId: string, colIndex: number, parentId: string, subColId: string, draggedRowId: string) => void;
  onUpdateBlock: (rowId: string, colIndex: number, blockId: string, patch: Partial<Block>) => void;
  onDuplicateBlock: (rowId: string, colIndex: number, blockId: string) => void;
  onDeleteBlock: (rowId: string, colIndex: number, blockId: string) => void;
  onAddBlockToRow: (rowId: string, pos: "start" | "end") => void;
  onDuplicateRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onStartEdit: (id: string) => void;
  onEndEdit: () => void;
  onRowDragStart: (e: DragEvent, rowId: string) => void;
  onBlockDragStart: (e: DragEvent, rowId: string, colIndex: number, blockId: string) => void;
};

const ctrlBtn: CSSProperties = {
  width: 30,
  height: 28,
  border: "none",
  borderRight: "1px solid " + UI.borderSubtle,
  background: UI.surface,
  color: UI.textMuted,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
const hl = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = UI.surfaceAlt);
const unhl = (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.background = UI.surface);

const popStyle: CSSProperties = {
  position: "absolute",
  top: 38,
  left: "50%",
  transform: "translateX(-50%)",
  background: UI.surface,
  borderRadius: 10,
  padding: 12,
  boxShadow: "0 12px 32px rgba(15,37,66,.22)",
  border: "1px solid " + UI.border,
  zIndex: 61,
};

/* ============================================================
   Controles flotantes pegados al borde superior — los chips/barras que se
   dibujan ARRIBA de su ancla (translateY(-100%)) se recortan cuando el ancla
   queda pegada al tope del contenedor con scroll. `useFlipPlacement` mide el
   hueco real disponible arriba (contra [data-canvas-scroll]) y, si no cabe,
   devuelve "inside" para anclar el control DENTRO del borde superior del bloque
   (siempre visible, también en bloques altos). Es chrome solo-editor: no afecta
   el HTML de envío. (El eje horizontal/móvil queda fuera de alcance por ahora.)
   ============================================================ */
type FlipPlace = "top" | "inside";

function useFlipPlacement(
  anchorRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  neededAbove: number,
): FlipPlace {
  const [place, setPlace] = useState<FlipPlace>("top");
  const placeRef = useRef<FlipPlace>("top");

  useLayoutEffect(() => {
    if (!active) {
      if (placeRef.current !== "top") {
        placeRef.current = "top";
        setPlace("top");
      }
      return;
    }
    const el = anchorRef.current;
    const scroller = el?.closest<HTMLElement>("[data-canvas-scroll]") ?? null;
    let raf = 0;
    const measure = () => {
      const node = anchorRef.current;
      if (!node) return;
      const limitTop = scroller ? scroller.getBoundingClientRect().top + scroller.clientTop : 0;
      const gap = node.getBoundingClientRect().top - limitTop;
      // Histéresis asimétrica (-4 / +24) para no parpadear en el umbral.
      let next = placeRef.current;
      if (placeRef.current === "top" && gap < neededAbove - 4) next = "inside";
      else if (placeRef.current === "inside" && gap > neededAbove + 24) next = "top";
      if (next !== placeRef.current) {
        placeRef.current = next;
        setPlace(next);
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        measure();
      });
    };
    measure();
    scroller?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Re-medir también cuando el ancla o el contenedor cambian de tamaño (p.ej.
    // una imagen de arriba carga async y empuja el bloque): el scroll/resize no
    // lo capturan.
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onScroll);
      if (el) ro.observe(el);
      if (scroller) ro.observe(scroller);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      scroller?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [active, anchorRef, neededAbove]);

  return active ? place : "top";
}

/** Posición de un control que normalmente va ARRIBA: encima del ancla ("top",
 *  comportamiento original) o dentro del borde superior ("inside"). */
function flipChrome(place: FlipPlace): CSSProperties {
  return place === "inside"
    ? { top: 0, transform: "translateY(0)" }
    : { top: 0, transform: "translateY(-100%)" };
}

/* ── WYSIWYG toolbar button (module-level to avoid remounts) ── */
function WyTool({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      title={label}
      style={{
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        color: "#fff",
        cursor: "pointer",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,.14)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
const WySep = () => <span style={{ width: 1, height: 18, background: "rgba(255,255,255,.18)", margin: "0 3px" }} />;

/* ── Floating WYSIWYG toolbar for inline text editing ── */
function WysiwygToolbar({
  onCmd,
  onMergeTag,
}: {
  onCmd: (cmd: string, val?: string) => void;
  onMergeTag: (tag: string) => void;
}) {
  const [showColor, setShowColor] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  return (
    <div
      // Stop clicks inside the toolbar from bubbling to the block, which would
      // re-select it and clear editingId (closing the toolbar + any open popup).
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        top: -50,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 2,
        background: C.navy900,
        padding: "5px 7px",
        borderRadius: 10,
        boxShadow: "0 8px 28px rgba(15,37,66,.35)",
        zIndex: 60,
        whiteSpace: "nowrap",
      }}
    >
      <WyTool icon="bold" label="Negrita" onPress={() => onCmd("bold")} />
      <WyTool icon="italic" label="Itálica" onPress={() => onCmd("italic")} />
      <WyTool icon="underline" label="Subrayado" onPress={() => onCmd("underline")} />
      <WyTool icon="strikethrough" label="Tachado" onPress={() => onCmd("strikeThrough")} />
      <WySep />
      <div style={{ position: "relative" }}>
        <WyTool
          icon="palette"
          label="Color de fuente"
          onPress={() => {
            setShowColor(!showColor);
            setShowTags(false);
            setShowLink(false);
          }}
        />
        {showColor && (
          <div style={popStyle}>
            <div style={{ fontSize: 10, fontWeight: 700, color: UI.textSubtle, marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Color de texto
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: 150 }}>
              {[C.navy900, C.navy600, C.amber600, C.green700, C.red500, C.n500, "#ffffff"].map((col) => (
                <button
                  type="button"
                  key={col}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCmd("foreColor", col);
                    setShowColor(false);
                  }}
                  style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid " + UI.border, background: col, cursor: "pointer" }}
                />
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: UI.textSubtle, margin: "10px 0 7px", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Resaltado
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", width: 150 }}>
              {[C.amber100, C.green100, C.navy100, C.red100, "#FEF9C3", "transparent"].map((col) => (
                <button
                  type="button"
                  key={col}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCmd("hiliteColor", col);
                    setShowColor(false);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: "1px solid " + UI.border,
                    background: col === "transparent" ? "repeating-conic-gradient(#e2e2e2 0% 25%,#fff 0% 50%) 50%/8px 8px" : col,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <WySep />
      <WyTool icon="align-left" label="Izquierda" onPress={() => onCmd("justifyLeft")} />
      <WyTool icon="align-center" label="Centrar" onPress={() => onCmd("justifyCenter")} />
      <WyTool icon="align-right" label="Derecha" onPress={() => onCmd("justifyRight")} />
      <WyTool icon="align-justify" label="Justificar" onPress={() => onCmd("justifyFull")} />
      <WySep />
      <WyTool icon="list" label="Lista de viñetas" onPress={() => onCmd("insertUnorderedList")} />
      <WyTool icon="list-ordered" label="Lista numerada" onPress={() => onCmd("insertOrderedList")} />
      <WySep />
      <div style={{ position: "relative" }}>
        <WyTool
          icon="link"
          label="Enlace"
          onPress={() => {
            setShowLink(!showLink);
            setShowColor(false);
            setShowTags(false);
          }}
        />
        {showLink && (
          <div style={{ ...popStyle, width: 230 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: UI.textSubtle, marginBottom: 7, textTransform: "uppercase", letterSpacing: ".06em" }}>
              Pegar URL
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: "1px solid " + UI.border,
                  borderRadius: 8,
                  padding: "6px 8px",
                  fontSize: 12,
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <Btn
                size="sm"
                onClick={() => {
                  onCmd("createLink", linkUrl);
                  setShowLink(false);
                  setLinkUrl("");
                }}
              >
                OK
              </Btn>
            </div>
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}>
        <WyTool
          icon="braces"
          label="Insertar variable"
          onPress={() => {
            setShowTags(!showTags);
            setShowColor(false);
            setShowLink(false);
          }}
        />
        {showTags && (
          <div style={{ ...popStyle, width: 230, maxHeight: 280, overflowY: "auto" }}>
            {MERGE_TAGS.map((grp) => (
              <div key={grp.group} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: UI.textSubtle, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".06em" }}>
                  {grp.group}
                </div>
                {grp.tags.map((t) => (
                  <button
                    type="button"
                    key={t.tag}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onMergeTag(t.tag);
                      setShowTags(false);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      padding: "5px 7px",
                      borderRadius: 6,
                      gap: 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = UI.surfaceAlt)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{ fontSize: 12, color: UI.text, fontWeight: 500 }}>{t.label}</span>
                    <span style={{ fontSize: 11, color: UI.accent, fontFamily: "'JetBrains Mono',monospace" }}>{t.tag}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mini-popover de enlace (chrome solo-editor) ──
   Al posar el cursor (o situar el caret) sobre un <a> dentro de un bloque de
   texto/encabezado EN EDICIÓN, muestra la URL con acciones: abrir, editar el
   href y quitar el enlace (sin borrar el texto). Se posiciona con position:fixed
   BAJO el enlace (getBoundingClientRect) para no chocar con la barra WYSIWYG que
   flota por encima del bloque. Se cierra al hacer scroll, clic fuera o al
   terminar la edición. No afecta al HTML de envío. */
function LinkBubble({
  anchor,
  onCommit,
  onClose,
}: {
  anchor: HTMLAnchorElement;
  /** Persiste el html del bloque tras mutar el DOM del enlace. */
  onCommit: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [editingUrl, setEditingUrl] = useState(false);
  const [url, setUrl] = useState("");
  const href = anchor.getAttribute("href") || "";

  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    setPos({
      top: r.bottom + 6,
      // Clamp horizontal para que el popover (translateX(-50%)) no se salga.
      left: Math.max(150, Math.min(window.innerWidth - 150, r.left + r.width / 2)),
    });
    setEditingUrl(false);
    setUrl(anchor.getAttribute("href") || "");
  }, [anchor]);

  useEffect(() => {
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const close = () => onClose();
    // captura: también cierra con el scroll del lienzo ([data-canvas-scroll]).
    document.addEventListener("mousedown", onDown, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [anchor, onClose]);

  if (!pos) return null;

  const apply = (next: string) => {
    anchor.setAttribute("href", next);
    onCommit();
    setEditingUrl(false);
  };
  const unlink = () => {
    const parent = anchor.parentNode;
    if (parent) {
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
    }
    onCommit();
    onClose();
  };

  return (
    <div
      ref={ref}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 4,
        background: C.navy900,
        padding: "5px 7px",
        borderRadius: 10,
        boxShadow: "0 8px 28px rgba(15,37,66,.35)",
        zIndex: 70,
        whiteSpace: "nowrap",
      }}
    >
      {editingUrl ? (
        <>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply(url.trim());
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                setEditingUrl(false);
              }
            }}
            style={{ width: 210, border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 12, outline: "none", fontFamily: "inherit", background: "#fff", color: C.n900 }}
          />
          <WyTool icon="check" label="Guardar enlace" onPress={() => apply(url.trim())} />
        </>
      ) : (
        <>
          <Icon name="link" size={13} color="rgba(255,255,255,.7)" />
          <span title={href} style={{ color: "#fff", fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
            {href || "(sin URL)"}
          </span>
          <WySep />
          <WyTool
            icon="external-link"
            label="Abrir enlace"
            onPress={() => {
              if (href) window.open(href, "_blank", "noopener,noreferrer");
            }}
          />
          <WyTool
            icon="pencil"
            label="Editar enlace"
            onPress={() => {
              setUrl(href);
              setEditingUrl(true);
            }}
          />
          <WyTool icon="unlink" label="Quitar enlace" onPress={unlink} />
        </>
      )}
    </div>
  );
}

/* ── A block inside a column, with hover/selection chrome ── */
function CanvasBlock({
  b,
  selected,
  editing,
  onSelect,
  onStartEdit,
  onUpdate,
  onDuplicate,
  onDelete,
  onDragStart,
  renderNested,
  dragActive,
  selectionActive,
  device,
}: {
  b: Block;
  selected: boolean;
  editing: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onUpdate: (patch: Partial<Block>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: DragEvent) => void;
  /** Render del contenido para el bloque "columns" (columnas anidadas). */
  renderNested?: (b: ColumnsBlock) => ReactNode;
  /** Hay un arrastre en curso (oculta el chrome de hover para no estorbar). */
  dragActive?: boolean;
  /** Hay algún elemento seleccionado (solo el seleccionado muestra su barra). */
  selectionActive?: boolean;
  /** Vista activa (para resolver overrides por dispositivo en la previsualización). */
  device: Device;
}) {
  // `hover` = este bloque es el MÁS INTERNO bajo el puntero (innermost-wins): así
  // su barra no se solapa con la de la fila/columna contenedora ni con bloques
  // anidados. El chrome (barra de acciones) solo aparece para UN elemento: el
  // seleccionado, o —si no hay nada seleccionado ni arrastre— el que se hoverea.
  const [hover, setHover] = useState(false);
  // Enlace (<a>) activo bajo el cursor/caret durante la edición → LinkBubble.
  const [linkEl, setLinkEl] = useState<HTMLAnchorElement | null>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const def = BLOCK_DEFS.find((d) => d.type === b.type)!;
  const isTextual = b.type === "text" || b.type === "heading";
  const show = selected || (hover && !dragActive && !selectionActive);
  // Bloque EFECTIVO para la vista activa (overrides de margen/radio/estilo). El
  // `b` crudo se conserva para identidad/selección/arrastre; `eff` para lo visual.
  const eff = resolveForDevice(b, device);
  // Oculto en esta vista: override rsp.hidden o, para el bloque "columns", los
  // toggles hideDesktop/hideMobile (el correo los emite como ee-desktop/mobile-only).
  const hiddenHere =
    resolvedHidden(b, device) ||
    (b.type === "columns" && !!(device === "mobile" ? b.hideMobile : b.hideDesktop));
  // Radio genérico del bloque. image/button/video usan el suyo; "columns" se
  // excluye para no recortar sub-bloques que sobresalen (offset) de la subcolumna.
  const blockRadius = !["image", "button", "video", "columns"].includes(b.type) ? eff.radius ?? 0 : 0;
  // El bloque "columns" redondea su fondo (sin recortar), pero el outline de
  // selección sí debe seguir ese radio para que coincida visualmente.
  const outlineRadius = b.type === "columns" && eff.radius ? eff.radius : blockRadius > 0 ? blockRadius : 3;
  // Etiqueta y barra del bloque: si no caben arriba, se anclan dentro del borde superior.
  const chromePlace = useFlipPlacement(blockRef, show, 26);

  // Barra WYSIWYG (al editar) se dibuja ENCIMA (top:-50). Si el bloque está
  // pegado al tope del lienzo, abrimos hueco con scroll en vez de taparlo: así
  // la barra queda siempre arriba del texto y visible.
  useEffect(() => {
    if (!editing) return;
    const el = blockRef.current;
    const scroller = el?.closest<HTMLElement>("[data-canvas-scroll]");
    if (!el || !scroller) return;
    const raf = requestAnimationFrame(() => {
      const gap = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
      const need = 64; // alto de la barra (~40) + margen
      if (gap < need) scroller.scrollTop -= need - gap;
    });
    return () => cancelAnimationFrame(raf);
  }, [editing]);

  const getEditable = () => {
    const el = blockRef.current?.querySelector<HTMLElement>("[contenteditable]");
    return el && el.isContentEditable ? el : null;
  };

  // Al salir de edición, cierra el popover de enlace (si estaba abierto).
  useEffect(() => {
    if (!editing) setLinkEl(null);
  }, [editing]);

  // Además del hover, detecta el CARET dentro de un <a> (navegación con teclado
  // o clic que coloca el cursor dentro del enlace) y abre/cierra el popover.
  useEffect(() => {
    if (!editing || !isTextual) return;
    const onSel = () => {
      const editable = getEditable();
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      if (!editable || !node || !editable.contains(node)) return;
      const el = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
      const a = el?.closest("a");
      setLinkEl(a && editable.contains(a) ? (a as HTMLAnchorElement) : null);
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, isTextual]);

  // Persiste el html del bloque tras mutar el DOM del enlace desde el popover.
  const commitLinkHtml = () => {
    const editable = getEditable();
    if (editable) onUpdate({ html: editable.innerHTML } as Partial<Block>);
  };

  const runCmd = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
  };

  // Inserta el merge tag en el cursor de forma robusta (sin depender de
  // execCommand, que falla si el contentEditable perdió el caret). Si no hay
  // selección viva dentro del bloque, lo agrega al final.
  const insertTag = (tag: string) => {
    const editable = getEditable();
    if (!editable) return;
    const sel = window.getSelection();
    let range: Range;
    if (sel && sel.rangeCount > 0 && editable.contains(sel.anchorNode)) {
      range = sel.getRangeAt(0);
    } else {
      range = document.createRange();
      range.selectNodeContents(editable);
      range.collapse(false);
    }
    range.deleteContents();
    const textNode = document.createTextNode(tag);
    range.insertNode(textNode);
    const after = document.createRange();
    after.setStartAfter(textNode);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);
    editable.focus();
    onUpdate({ html: editable.innerHTML } as Partial<Block>);
  };

  return (
    <div
      ref={blockRef}
      data-ee-block
      // innermost-wins: este bloque está "hovereado" solo si es el bloque más
      // interno bajo el puntero (no un ancestro de otro bloque anidado).
      onMouseMove={(e) => {
        const innermost = (e.target as HTMLElement).closest("[data-ee-block]") === blockRef.current;
        if (innermost !== hover) setHover(innermost);
        // En edición, posar el cursor sobre un <a> del texto abre el popover de enlace.
        if (editing && isTextual) {
          const a = (e.target as HTMLElement).closest("a");
          if (a && getEditable()?.contains(a) && a !== linkEl) setLinkEl(a as HTMLAnchorElement);
        }
      }}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        // While editing, clicks inside the block (to reposition the caret) must
        // not re-select it — that would clear editingId and exit edit mode.
        if (!editing) onSelect();
      }}
      onDoubleClick={(e) => {
        if (b.type === "text" || b.type === "heading") {
          e.stopPropagation();
          onStartEdit();
        }
      }}
      style={{
        position: "relative",
        margin: eff.margin ? padCss(eff.margin) : undefined,
        outline: selected ? "2px solid " + SEL : hover ? "1px solid " + UI.accent : "1px solid transparent",
        outlineOffset: -1,
        // El outline sigue el radio del bloque para que la selección coincida con
        // las esquinas redondeadas del contenido.
        borderRadius: outlineRadius,
        // Oculto en esta vista: se atenúa (sigue seleccionable para revertir).
        opacity: hiddenHere ? 0.4 : undefined,
        transition: "outline-color 120ms, opacity 120ms",
        cursor: "pointer",
      }}
    >
      {show && (
        <div
          style={{
            position: "absolute",
            left: 0,
            ...flipChrome(chromePlace),
            background: selected ? SEL : UI.accent,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: chromePlace === "inside" ? "0 0 4px 4px" : "4px 4px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 4,
            zIndex: chromePlace === "inside" ? 62 : 20,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name={def.icon} size={11} />
          {def.label}
        </div>
      )}

      {show && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            ...flipChrome(chromePlace),
            display: "flex",
            background: UI.surface,
            borderRadius: chromePlace === "inside" ? "0 0 6px 6px" : "6px 6px 0 0",
            boxShadow: chromePlace === "inside" ? "0 2px 8px rgba(15,37,66,.12)" : "0 -2px 8px rgba(15,37,66,.12)",
            // Bordes por lado (longhand) — no mezclar `border` shorthand con
            // borderTop/Bottom condicionales: React avisa al quitar el longhand.
            borderLeft: "1px solid " + UI.border,
            borderRight: "1px solid " + UI.border,
            borderTop: chromePlace === "inside" ? "none" : "1px solid " + UI.border,
            borderBottom: chromePlace === "inside" ? "1px solid " + UI.border : "none",
            zIndex: chromePlace === "inside" ? 63 : 21,
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            draggable
            title="Mover"
            style={{ ...ctrlBtn, cursor: "grab" }}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => onDragStart(e)}
            onMouseEnter={hl}
            onMouseLeave={unhl}
          >
            <Icon name="grip-vertical" size={13} />
          </button>
          <button type="button" onClick={onDuplicate} title="Duplicar" style={ctrlBtn} onMouseEnter={hl} onMouseLeave={unhl}>
            <Icon name="copy" size={13} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            title="Eliminar"
            style={{ ...ctrlBtn, color: C.red500 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.red100)}
            onMouseLeave={unhl}
          >
            <Icon name="trash-2" size={13} />
          </button>
        </div>
      )}

      {editing && <WysiwygToolbar onCmd={runCmd} onMergeTag={insertTag} />}
      {editing && linkEl && <LinkBubble anchor={linkEl} onCommit={commitLinkHtml} onClose={() => setLinkEl(null)} />}

      {(() => {
        const content =
          b.type === "columns" && renderNested ? (
            renderNested(b)
          ) : (
            <BlockVisual b={eff} raw={b} editing={editing} onInput={(html) => onUpdate({ html } as Partial<Block>)} onUpdate={onUpdate} />
          );
        // El wrapper interno recorta el contenido (overflow) sin afectar al chrome
        // (barra de acciones) que vive en el div exterior.
        return blockRadius > 0 ? <div style={{ borderRadius: blockRadius, overflow: "hidden" }}>{content}</div> : content;
      })()}
    </div>
  );
}

/* ── Drop zone between/around rows ── */
function RowDropZone({
  active,
  onDrop,
  onOver,
  isOver,
  fill,
  blockDrag,
}: {
  active: boolean;
  onDrop: () => void;
  onOver: (v: boolean) => void;
  isOver: boolean;
  fill?: boolean;
  blockDrag: boolean;
}) {
  const label = blockDrag ? "Nueva estructura" : "Soltar aquí";
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onOver(true);
      }}
      onDragLeave={() => onOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        onOver(false);
        onDrop();
      }}
      style={{
        height: fill ? "auto" : isOver ? 40 : active ? 20 : 9,
        flex: fill ? "1 1 auto" : "0 0 auto",
        minHeight: fill ? 70 : undefined,
        display: "flex",
        alignItems: fill ? "flex-start" : "center",
        justifyContent: "center",
        transition: "height 120ms",
        position: "relative",
        paddingTop: fill ? 8 : 0,
      }}
    >
      {isOver && (
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            top: fill ? 8 : "50%",
            transform: fill ? "none" : "translateY(-50%)",
            height: 4,
            background: DROP,
            borderRadius: 2,
            boxShadow: "0 0 0 4px " + C.amber100,
          }}
        />
      )}
      {isOver && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            background: DROP,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 9999,
            top: fill ? -1 : -10,
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 4px 10px rgba(245,158,11,.35)",
          }}
        >
          <Icon name={blockDrag ? "plus-square" : "corner-down-right"} size={11} color="#fff" />
          {label}
        </div>
      )}
    </div>
  );
}

/* ── Drop zone entre bloques (para reordenar / insertar en una posición) ──
   Solo es interactiva durante un arrastre de bloque (`active`); fuera de eso
   ocupa 0px para no alterar el layout. */
function BlockDropZone({ active, onDrop }: { active: boolean; onDrop: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={
        active
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              setOver(true);
            }
          : undefined
      }
      onDragLeave={() => setOver(false)}
      onDrop={
        active
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setOver(false);
              onDrop();
            }
          : undefined
      }
      style={{ height: active ? (over ? 18 : 8) : 0, flexShrink: 0, display: "flex", alignItems: "center", transition: "height 100ms" }}
    >
      {over && <div style={{ height: 4, width: "100%", background: DROP, borderRadius: 2, boxShadow: "0 0 0 3px " + C.amber100 }} />}
    </div>
  );
}

/* ── Column (drop target for blocks) ── */
function CanvasColumn({
  col,
  colIndex,
  row,
  selection,
  editingId,
  dragItem,
  device,
  handlers,
}: {
  col: Column;
  colIndex: number;
  row: Row;
  selection: Selection;
  editingId: string | null;
  dragItem: DragItem;
  device: Device;
  handlers: CanvasHandlers;
}) {
  const [over, setOver] = useState(false);
  // Columna EFECTIVA para la vista activa (padding/valign por dispositivo).
  const rcol = resolveForDevice(col, device);
  const empty = col.blocks.length === 0;
  const canDropBlock = dragItem && (dragItem.kind === "block" || dragItem.kind === "block-move");
  const blockDragActive = !!(dragItem && (dragItem.kind === "block" || dragItem.kind === "block-move"));
  // Soltar una FILA dentro de esta columna (anidar). No se permite soltar la fila
  // dentro de sí misma (sus propias columnas pertenecen a row.id).
  const draggedRowId = dragItem?.kind === "row-move" ? dragItem.rowId : null;
  const canDropRow = !!draggedRowId && draggedRowId !== row.id;
  const multi = row.cols.length > 1;
  const colSelected = selection.kind === "column" && selection.rowId === row.id && selection.colIndex === colIndex;
  const valignMap: Record<string, CSSProperties["justifyContent"]> = {
    top: "flex-start",
    middle: "center",
    bottom: "flex-end",
  };
  const colBorder =
    col.border && col.border.style !== "none" ? `${col.border.width}px ${col.border.style} ${col.border.color}` : "none";
  const fill = columnSurface(col);

  return (
    <div
      title={draggedRowId === row.id ? "No puedes soltar una fila dentro de sí misma" : undefined}
      onClick={(e) => {
        e.stopPropagation();
        handlers.onSelectColumn(row.id, colIndex);
      }}
      onDragOver={(e) => {
        if (canDropBlock || canDropRow) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (canDropRow && draggedRowId) {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          handlers.onDropRowIntoColumn(row.id, colIndex, draggedRowId);
        } else if (canDropBlock) {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          handlers.onAddBlock(row.id, colIndex, col.blocks.length);
        }
      }}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        padding: padCss(rcol.padding),
        minHeight: empty ? 96 : "auto",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        // Let the column shrink below its content's intrinsic width (no overflow
        // clip here — that would cut the floating WYSIWYG toolbar while editing).
        minWidth: 0,
        justifyContent: empty ? "center" : valignMap[rcol.valign] || "flex-start",
        border: colBorder,
        // Sin borderRadius aquí: el fondo real de la columna se pinta CUADRADO,
        // como lo emite el correo. El radio 6 es chrome y vive en el overlay.
        ...offsetStyle(col.offset),
        ...fill,
        // Estados solo-editor (arrastrar encima / columna vacía) priman sobre el color de relleno.
        backgroundColor: over
          ? C.amber100 + "88"
          : fill.backgroundColor ?? (empty ? UI.accentSoft : undefined),
        transition: "background-color 120ms",
        cursor: "pointer",
      }}
    >
      {/* Chrome de selección/hover (solo-editor): outline redondeado por encima
          del contenido; no afecta al layout ni al fondo (pointerEvents none). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 6,
          pointerEvents: "none",
          zIndex: 12,
          outline: over
            ? "2px dashed " + DROP
            : colSelected
              ? "2px solid " + SEL
              : empty || multi
                ? "1px dashed " + UI.border
                : "none",
          outlineOffset: -2,
          transition: "outline-color 120ms",
        }}
      />
      {colSelected && !empty && (
        // Chip dentro del borde superior de la columna (no por encima): así nunca
        // se recorta por el overflow:hidden de las filas con esquinas redondeadas.
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            background: SEL,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            gap: 4,
            zIndex: 14,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="columns-2" size={11} />
          Columna {colIndex + 1}
        </div>
      )}
      {empty ? (
        <div
          style={{
            flex: 1,
            minHeight: 80,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            color: over ? C.amber700 : UI.textSubtle,
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
            padding: 10,
            width: "100%",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: UI.surface,
              border: "1px solid " + UI.border,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="plus" size={16} color={over ? C.amber600 : UI.textSubtle} />
          </div>
          {!dragItem
            ? "Arrastra un bloque"
            : canDropRow
              ? "Suelta la fila aquí"
              : dragItem.kind === "row-move"
                ? "No puedes anidar aquí"
                : "Suelta el bloque aquí"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", ...(contentPanelStyle(col.panel) || {}) }}>
          {col.blocks.map((b) => (
            <Fragment key={b.id}>
              <BlockDropZone active={blockDragActive} onDrop={() => handlers.onInsertBlockInColumn(row.id, colIndex, b.id)} />
              <CanvasBlock
                b={b}
                selected={selection.kind === "block" && selection.blockId === b.id}
                editing={editingId === b.id}
                onSelect={() => handlers.onSelectBlock(row.id, colIndex, b.id)}
                onStartEdit={() => handlers.onStartEdit(b.id)}
                onUpdate={(patch) => handlers.onUpdateBlock(row.id, colIndex, b.id, patch)}
                onDuplicate={() => handlers.onDuplicateBlock(row.id, colIndex, b.id)}
                onDelete={() => handlers.onDeleteBlock(row.id, colIndex, b.id)}
                onDragStart={(e) => handlers.onBlockDragStart(e, row.id, colIndex, b.id)}
                dragActive={!!dragItem}
                selectionActive={selection.kind !== null}
                device={device}
                renderNested={(cb) => (
                  <NestedColumnsBody
                    block={cb}
                    row={row}
                    colIndex={colIndex}
                    selection={selection}
                    editingId={editingId}
                    dragItem={dragItem}
                    device={device}
                    handlers={handlers}
                  />
                )}
              />
            </Fragment>
          ))}
          <BlockDropZone active={blockDragActive} onDrop={() => handlers.onInsertBlockInColumn(row.id, colIndex, null)} />
        </div>
      )}
    </div>
  );
}

/* ── Nested columns block (columnas dentro de una columna) ──
   Renderiza las subcolumnas del bloque "columns". Cada subcolumna es seleccionable
   (muestra sus ajustes) y cada subbloque se edita por su id (handlers recursivos). */
function NestedColumnsBody({
  block,
  row,
  colIndex,
  selection,
  editingId,
  dragItem,
  device,
  handlers,
}: {
  block: ColumnsBlock;
  row: Row;
  colIndex: number;
  selection: Selection;
  editingId: string | null;
  dragItem: DragItem;
  device: Device;
  handlers: CanvasHandlers;
}) {
  return (
    <div style={{ position: "relative", zIndex: 0, width: "100%", borderRadius: block.radius || undefined, ...columnsBlockBackground(block) }}>
      <div style={{ display: "flex", flexWrap: "wrap", width: "100%", alignItems: "stretch" }}>
        {block.cols.map((sc, i) => (
          <NestedSubColumn
            key={sc.id}
            sc={sc}
            index={i}
            total={block.cols.length}
            block={block}
            row={row}
            colIndex={colIndex}
            selection={selection}
            editingId={editingId}
            dragItem={dragItem}
            device={device}
            handlers={handlers}
          />
        ))}
      </div>
    </div>
  );
}

function NestedSubColumn({
  sc,
  index,
  total,
  block,
  row,
  colIndex,
  selection,
  editingId,
  dragItem,
  device,
  handlers,
}: {
  sc: ColumnsBlock["cols"][number];
  index: number;
  total: number;
  block: ColumnsBlock;
  row: Row;
  colIndex: number;
  selection: Selection;
  editingId: string | null;
  dragItem: DragItem;
  device: Device;
  handlers: CanvasHandlers;
}) {
  const [over, setOver] = useState(false);
  const [hover, setHover] = useState(false);
  // Subcolumna EFECTIVA para la vista activa (padding/valign/ancho por dispositivo).
  const rsc = resolveForDevice(sc, device);
  const empty = sc.blocks.length === 0;
  // Acepta soltar un bloque NUEVO ("block") o MOVER uno existente ("block-move"),
  // salvo arrastrar este propio bloque de columnas sobre su subcolumna (auto-anidado).
  const canDropBlock = !!(
    dragItem &&
    (dragItem.kind === "block" || (dragItem.kind === "block-move" && dragItem.blockId !== block.id))
  );
  const draggedRowId = dragItem?.kind === "row-move" ? dragItem.rowId : null;
  const canDropRow = !!draggedRowId && draggedRowId !== row.id;
  const blockDragActive = !!(dragItem && (dragItem.kind === "block" || dragItem.kind === "block-move"));
  const selected = selection.kind === "subcolumn" && selection.parentId === block.id && selection.subColId === sc.id;
  // El chrome (chip + barra) se muestra al hover o si está seleccionada; se oculta
  // durante un arrastre. Visible aunque haya otro elemento seleccionado, para poder
  // seleccionar la subcolumna incluso cuando ya tiene bloques.
  const showChrome = (hover || selected) && !dragItem;
  const scFill = subColumnSurface(sc);
  // Borde REAL configurado por el usuario (igual que el render de envío).
  const scBorder = borderCss(sc.border);
  const scPanelStyle = contentPanelStyle(sc.panel);
  const selectSelf = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    handlers.onSelectSubColumn(row.id, colIndex, block.id, sc.id);
  };
  const openPicker = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    handlers.onOpenSubColumnPicker(row.id, colIndex, block.id, sc.id);
  };
  const ctrl = (icon: string, title: string, onClick: () => void, disabled = false) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: disabled ? UI.textSubtle : UI.accent, cursor: disabled ? "default" : "pointer", borderRadius: 4 }}
    >
      <Icon name={icon} size={12} />
    </button>
  );
  const valignJustify: CSSProperties["justifyContent"] = rsc.valign === "middle" ? "center" : rsc.valign === "bottom" ? "flex-end" : "flex-start";
  return (
    // Wrapper en flex-column: la caja usa flex:1 para llenar la altura (que la fija
    // la subcolumna más alta) y el margen NO desborda — el bloque crece en su lugar.
    // stackMobile: en vista móvil replica `.ee-stack-col` del correo (100% fijo;
    // el render también suprime el override de ancho por dispositivo al apilar).
    <div style={{ width: device === "mobile" && block.stackMobile ? "100%" : rsc.width + "%", padding: `0 ${block.gap / 2}px`, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        // Sin onClick aquí: clicar el fondo de la subcolumna propaga al bloque de
        // columnas (lo selecciona). La subcolumna se selecciona con su chip.
        onDragOver={(e) => {
          if (canDropBlock || canDropRow) {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          // Solo consumimos (stopPropagation) cuando la subcolumna MANEJA el drop.
          // Si no lo maneja (p.ej. arrastrar este propio bloque de columnas), el
          // evento burbujea a la columna exterior, que sí lo gestiona → sin
          // congelamiento del resaltado.
          if (canDropRow && draggedRowId) {
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            handlers.onDropRowIntoSubColumn(row.id, colIndex, block.id, sc.id, draggedRowId);
          } else if (dragItem && dragItem.kind === "block") {
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            handlers.onAddBlockToSubColumn(row.id, colIndex, block.id, sc.id, dragItem.blockType);
          } else if (canDropBlock && dragItem && dragItem.kind === "block-move") {
            e.preventDefault();
            e.stopPropagation();
            setOver(false);
            handlers.onMoveBlockToSubColumn(row.id, colIndex, block.id, sc.id, dragItem.blockId);
          }
        }}
        style={{
          position: "relative",
          flex: 1,
          minHeight: empty ? 72 : undefined,
          // Refleja el padding/margen reales de la subcolumna (como en el envío).
          padding: padCss(rsc.padding),
          margin: rsc.margin ? padCss(rsc.margin) : undefined,
          // Sin borderRadius: el fondo y el borde REALES de la subcolumna se
          // pintan cuadrados, como los emite el correo. El radio 6 es chrome y
          // vive en el overlay de abajo (junto con el dashed de referencia).
          ...scFill,
          border: scBorder,
          backgroundColor: over ? C.amber100 + "55" : scFill.backgroundColor ?? (sc.bg !== "transparent" ? sc.bg : undefined),
          opacity: resolvedHidden(sc, device) ? 0.4 : undefined,
          display: "flex",
          flexDirection: "column",
          justifyContent: empty ? "center" : valignJustify,
          gap: 2,
          transition: "background 120ms, opacity 120ms",
        }}
      >
        {/* Chrome de selección/hover (solo-editor): outline redondeado + borde
            discontinuo de referencia cuando no hay borde real del usuario. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 6,
            pointerEvents: "none",
            zIndex: 12,
            border: scBorder ? undefined : "1px dashed " + UI.border,
            outline: over ? "2px dashed " + DROP : selected ? "2px solid " + SEL : "none",
            outlineOffset: -2,
            transition: "outline-color 120ms",
          }}
        />
        {showChrome && (
          <>
            <button
              type="button"
              title="Seleccionar subcolumna"
              onClick={selectSelf}
              style={{ position: "absolute", top: 2, left: 2, zIndex: 13, display: "inline-flex", alignItems: "center", gap: 4, background: selected ? SEL : UI.accent, color: "#fff", border: "none", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <Icon name="columns-2" size={11} /> Subcol {index + 1}
            </button>
            <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 2, right: 2, zIndex: 13, display: "flex", background: UI.surface, border: "1px solid " + UI.border, borderRadius: 6, boxShadow: "0 2px 8px rgba(15,37,66,.12)" }}>
              {ctrl("arrow-left", "Mover a la izquierda", () => handlers.onMoveSubColumn(row.id, colIndex, block.id, sc.id, -1), index === 0)}
              {ctrl("arrow-right", "Mover a la derecha", () => handlers.onMoveSubColumn(row.id, colIndex, block.id, sc.id, 1), index === total - 1)}
              {ctrl("copy", "Duplicar subcolumna", () => handlers.onDuplicateSubColumn(row.id, colIndex, block.id, sc.id))}
              {ctrl("trash-2", "Eliminar subcolumna", () => handlers.onDeleteSubColumn(row.id, colIndex, block.id, sc.id), total <= 1)}
            </div>
          </>
        )}
        {empty ? (
          <button
            type="button"
            onClick={openPicker}
            style={{
              flex: 1,
              minHeight: 58,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              border: "none",
              background: "transparent",
              color: over ? C.amber700 : UI.textSubtle,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Icon name="plus" size={15} color={over ? C.amber600 : UI.textSubtle} />
            {!dragItem
              ? "Añadir bloque"
              : canDropRow
                ? "Suelta la fila aquí"
                : dragItem.kind === "row-move"
                  ? "No puedes anidar aquí"
                  : "Suelta el bloque aquí"}
          </button>
        ) : (
          <div style={scPanelStyle ? { display: "flex", flexDirection: "column", gap: 2, width: "100%", ...scPanelStyle } : { display: "contents" }}>
            {sc.blocks.map((sb) => (
              <Fragment key={sb.id}>
                <BlockDropZone active={blockDragActive} onDrop={() => handlers.onInsertBlockInSubColumn(row.id, colIndex, block.id, sc.id, sb.id)} />
                <CanvasBlock
                  b={sb}
                  selected={selection.kind === "block" && selection.blockId === sb.id}
                  editing={editingId === sb.id}
                  onSelect={() => handlers.onSelectBlock(row.id, colIndex, sb.id)}
                  onStartEdit={() => handlers.onStartEdit(sb.id)}
                  onUpdate={(patch) => handlers.onUpdateBlock(row.id, colIndex, sb.id, patch)}
                  onDuplicate={() => handlers.onDuplicateBlock(row.id, colIndex, sb.id)}
                  onDelete={() => handlers.onDeleteBlock(row.id, colIndex, sb.id)}
                  onDragStart={(e) => handlers.onBlockDragStart(e, row.id, colIndex, sb.id)}
                  dragActive={!!dragItem}
                  selectionActive={selection.kind !== null}
                  device={device}
                  renderNested={(cb) => (
                    <NestedColumnsBody
                      block={cb}
                      row={row}
                      colIndex={colIndex}
                      selection={selection}
                      editingId={editingId}
                      dragItem={dragItem}
                      device={device}
                      handlers={handlers}
                    />
                  )}
                />
              </Fragment>
            ))}
            <BlockDropZone active={blockDragActive} onDrop={() => handlers.onInsertBlockInSubColumn(row.id, colIndex, block.id, sc.id, null)} />
            {/* El "+ bloque" solo en estado vacío: con contenido se añade desde el
                panel ("Añadir bloque") o arrastrando un bloque. */}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Edge strip inside a structure: "add to this structure" (green) ── */
function StructureEdgeZone({ pos, onDrop }: { pos: "top" | "bottom"; onDrop: () => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setOver(false);
        onDrop();
      }}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        [pos]: 0,
        height: 30,
        zIndex: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: over ? C.green50 : "transparent",
        boxShadow: over ? (pos === "top" ? "inset 0 3px 0 " + C.green500 : "inset 0 -3px 0 " + C.green500) : "none",
        transition: "background 120ms",
      }}
    >
      {over && (
        <span
          style={{
            background: C.green500,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "3px 9px",
            borderRadius: 9999,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="plus" size={11} color="#fff" />
          Añadir a esta estructura
        </span>
      )}
    </div>
  );
}

/* ── A row on the canvas ── */
function CanvasRow({
  row,
  g,
  selection,
  editingId,
  dragItem,
  device,
  handlers,
}: {
  row: Row;
  g: GlobalSettings;
  selection: Selection;
  editingId: string | null;
  dragItem: DragItem;
  device: Device;
  handlers: CanvasHandlers;
}) {
  // `hover` = el puntero está sobre la fila pero NO sobre un bloque (innermost):
  // así la barra de la fila no choca con la del bloque hovereado. Y solo se
  // muestra si no hay otro elemento seleccionado ni un arrastre en curso.
  const [hover, setHover] = useState(false);
  const selected = selection.kind === "row" && selection.rowId === row.id;
  const show = selected || (hover && selection.kind === null && !dragItem);
  const dragBlock = dragItem && (dragItem.kind === "block" || dragItem.kind === "block-move");
  const border = row.border?.style && row.border.style !== "none" ? `${row.border.width}px ${row.border.style} ${row.border.color}` : "none";
  // Fila EFECTIVA para la vista activa. SOLO padding/minHeight: el render de
  // envío (rowSelMap) únicamente emite esas dos propiedades por dispositivo;
  // margin/radius/fondos deben seguir leyendo `row` crudo para no divergir.
  const rrow = resolveForDevice(row, device);
  // Oculta en esta vista (rsp.hidden o los toggles hideDesktop/hideMobile del
  // panel): se atenúa igual que bloques/subcolumnas.
  const rowHiddenHere = resolvedHidden(row, device) || !!(device === "mobile" ? row.hideMobile : row.hideDesktop);
  const rowBg = surfaceBackground({ color: row.bgRow, type: row.bgRowType, gradient: row.bgRowGradient });
  const rowBgVisible = !!(rowBg.backgroundColor || rowBg.backgroundImage);
  const rowRef = useRef<HTMLDivElement>(null);
  // Etiqueta y barra de la fila: si no caben arriba, se anclan dentro del borde superior.
  const rowPlace = useFlipPlacement(rowRef, show, 34);

  return (
    <div
      ref={rowRef}
      onMouseMove={(e) => {
        const overBlock = !!(e.target as HTMLElement).closest("[data-ee-block]");
        if (overBlock === hover) setHover(!overBlock);
      }}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        handlers.onSelectRow(row.id);
      }}
      style={{
        position: "relative",
        ...rowBg,
        // El radio también en el contenedor de la fila, PERO solo si tiene fondo
        // visible: así se redondea el fondo de la fila (si lo hay) y se evita
        // redondear de más cuando es transparente.
        borderRadius: rowBgVisible ? cornersCss(row.radius) : undefined,
        margin: row.margin ? padCss(row.margin) : undefined,
        ...offsetStyle(row.offset),
        outline: selected
          ? "2px solid " + SEL
          : hover
            ? "1px solid " + UI.border
            : dragBlock
              ? "1px dashed " + C.green500
              : "1px solid transparent",
        outlineOffset: -1,
        opacity: rowHiddenHere ? 0.4 : undefined,
        transition: "outline-color 120ms, opacity 120ms",
      }}
    >
      {show && (
        <div
          style={{
            position: "absolute",
            left: 0,
            ...flipChrome(rowPlace),
            background: selected ? SEL : UI.accent,
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 7px",
            borderRadius: rowPlace === "inside" ? "0 0 4px 4px" : "4px 4px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 4,
            zIndex: rowPlace === "inside" ? 62 : 15,
          }}
        >
          <Icon name="rows-3" size={11} />
          Fila · {row.cols.length} col{row.cols.length > 1 ? "s" : ""}
        </div>
      )}
      {show && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            right: 0,
            ...flipChrome(rowPlace),
            display: "flex",
            background: UI.surface,
            borderRadius: rowPlace === "inside" ? "0 0 6px 6px" : "6px 6px 0 0",
            boxShadow: rowPlace === "inside" ? "0 2px 8px rgba(15,37,66,.12)" : "0 -2px 8px rgba(15,37,66,.12)",
            // Bordes por lado (longhand) — evita el aviso de React por mezclar
            // `border` shorthand con borderTop/Bottom condicionales.
            borderLeft: "1px solid " + UI.border,
            borderRight: "1px solid " + UI.border,
            borderTop: rowPlace === "inside" ? "none" : "1px solid " + UI.border,
            borderBottom: rowPlace === "inside" ? "1px solid " + UI.border : "none",
            zIndex: rowPlace === "inside" ? 63 : 16,
          }}
        >
          <button
            type="button"
            draggable
            title="Mover fila"
            style={{ ...ctrlBtn, cursor: "grab" }}
            onClick={(e) => e.stopPropagation()}
            onDragStart={(e) => handlers.onRowDragStart(e, row.id)}
            onMouseEnter={hl}
            onMouseLeave={unhl}
          >
            <Icon name="grip-vertical" size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onDuplicateRow(row.id);
            }}
            title="Duplicar fila"
            style={ctrlBtn}
            onMouseEnter={hl}
            onMouseLeave={unhl}
          >
            <Icon name="copy" size={13} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlers.onDeleteRow(row.id);
            }}
            title="Eliminar fila"
            style={{ ...ctrlBtn, color: C.red500 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.red100)}
            onMouseLeave={unhl}
          >
            <Icon name="trash-2" size={13} />
          </button>
        </div>
      )}
      <div
        style={{
          position: "relative",
          zIndex: 0,
          maxWidth: g.width,
          margin: g.align === "center" ? "0 auto" : "0",
          ...rowContentBackground(row),
          borderRadius: cornersCss(row.radius),
          // No recortar mientras se edita un bloque: la barra WYSIWYG flota por
          // encima de la fila y el overflow:hidden la cortaría.
          overflow: cornersCss(row.radius) && !rowContentNeedsVisible(row) && !editingId ? "hidden" : undefined,
          minHeight: rrow.minHeight || undefined,
          padding: padCss(rrow.padding),
          border,
          boxSizing: "border-box",
          display: "flex",
          flexWrap: device === "mobile" ? "wrap" : "nowrap",
        }}
      >
        {row.cols.map((col, ci) => {
          const rcol = resolveForDevice(col, device);
          return (
            <div
              key={col.id}
              style={{
                width: device === "mobile" ? "100%" : rcol.width + "%",
                boxSizing: "border-box",
                padding:
                  rcol.margin && (rcol.margin.t || rcol.margin.b || rcol.margin.l || rcol.margin.r)
                    ? padCss(rcol.margin)
                    : row.cols.length > 1
                      ? `0 ${COLUMN_GUTTER}px`
                      : "0",
                display: "flex",
                // Let the column shrink below its content's intrinsic width so a
                // wide child clamps instead of pushing the whole row past g.width.
                minWidth: 0,
              }}
            >
              <CanvasColumn
                col={col}
                colIndex={ci}
                row={row}
                selection={selection}
                editingId={editingId}
                dragItem={dragItem}
                device={device}
                handlers={handlers}
              />
            </div>
          );
        })}
      </div>
      {dragBlock && (
        <>
          <StructureEdgeZone pos="top" onDrop={() => handlers.onAddBlockToRow(row.id, "start")} />
          <StructureEdgeZone pos="bottom" onDrop={() => handlers.onAddBlockToRow(row.id, "end")} />
        </>
      )}
    </div>
  );
}

function EmptyDrop({ dragItem, onDrop }: { dragItem: DragItem; onDrop: () => void }) {
  const [over, setOver] = useState(false);
  const active = dragItem && (dragItem.kind === "structure" || dragItem.kind === "block");
  const isBlock = dragItem && dragItem.kind === "block";
  return (
    <div
      onDragOver={(e) => {
        if (active) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (active) {
          e.preventDefault();
          setOver(false);
          onDrop();
        }
      }}
      style={{
        minHeight: 280,
        margin: 10,
        border: `2px dashed ${over ? DROP : UI.border}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        background: over ? C.amber100 + "40" : UI.accentSoft,
        transition: "all 150ms",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: UI.surface,
          border: "1px solid " + UI.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(15,37,66,.06)",
        }}
      >
        <Icon name="layout-template" size={26} color={over ? C.amber600 : UI.textSubtle} />
      </div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: UI.text, marginBottom: 4 }}>
          {over
            ? isBlock
              ? "Suelta para crear una fila con este bloque"
              : "Suelta la estructura aquí"
            : "Arrastra una estructura o fila aquí para comenzar"}
        </div>
        <div style={{ fontSize: 13, color: UI.textMuted }}>
          Elige un diseño de columnas desde el panel <strong style={{ color: UI.accent }}>Estructuras</strong>, o haz clic en uno para añadirlo.
        </div>
      </div>
    </div>
  );
}

/* ── The canvas workspace ── */
export function Canvas({
  rows,
  g,
  selection,
  editingId,
  device,
  dragItem,
  handlers,
}: {
  rows: Row[];
  g: GlobalSettings;
  selection: Selection;
  editingId: string | null;
  device: Device;
  dragItem: DragItem;
  handlers: CanvasHandlers;
}) {
  const [overIndex, setOverIndex] = useState(-1);
  const dragActive = !!dragItem;
  const blockDrag = !!(dragItem && (dragItem.kind === "block" || dragItem.kind === "block-move"));
  // Móvil: el CUERPO del correo (.ee-body) debe medir exactamente 375px — igual
  // que el renderWidth 375 del preview. El frame (border-box) suma el marco:
  // 375 + 10px de padding lateral × 2 + 1px de borde × 2.
  // Tableta: mismo criterio con un viewport de 768px exactos (= el breakpoint
  // @media(max-width:768px) del correo); el contenedor sigue midiendo g.width
  // centrado, igual que en un correo real a ese ancho.
  const width = device === "mobile" ? 375 + 22 : device === "tablet" ? 768 + 22 : g.width + 80;

  return (
    <div
      data-canvas-scroll
      onClick={() => handlers.onClearSelection()}
      style={{
        flex: 1,
        overflowY: "auto",
        background: UI.workspace,
        padding: "28px 0 120px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width,
          maxWidth: "100%",
          marginBottom: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: UI.textSubtle,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <Icon name={device === "mobile" ? "smartphone" : device === "tablet" ? "tablet" : "monitor"} size={14} />
        {device === "mobile" ? "Vista móvil · 375px" : device === "tablet" ? "Vista tableta · 768px" : `Vista escritorio · ${g.width}px`}
      </div>

      <div
        style={{
          width,
          maxWidth: "100%",
          minHeight: 520,
          // Sin esto, el flex-shrink por defecto encoge la tarjeta cuando el
          // contenido supera el alto del scroller, y la capa de fondo (inset:0)
          // se queda corta: el fondo debe crecer con todo el cuerpo del correo.
          flexShrink: 0,
          background: g.canvasBg,
          borderRadius: device === "mobile" ? 28 : device === "tablet" ? 20 : 14,
          // El `<Container>` del correo va pegado al tope del cuerpo: el canvasBg
          // NUNCA se ve por encima del contenido (solo a los lados en pantallas
          // anchas y por debajo si el cuerpo es corto). Por eso el padding superior
          // es 0 — así el margen superior del editor coincide con el del correo
          // real (antes los 24px de marco añadían un espacio que el correo no tiene).
          // Móvil/tableta: 10px de marco lateral (el viewport interior queda en
          // 375/768 exactos); escritorio conserva su marco ancho.
          padding: device === "desktop" ? "0 40px 24px" : "0 10px 18px",
          boxShadow: "0 1px 3px rgba(15,37,66,.08)",
          border: "1px solid " + C.n200,
          transition: "width 250ms cubic-bezier(.4,0,.2,1)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Imagen de fondo del canvas (legacy v2): el render de envío la emite en
            el <Body> del correo, así que el lienzo la pinta para ser WYSIWYG. El
            color del canvas se aplica vía `background: g.canvasBg` del frame. */}
        <CanvasBgLayers g={g} />
        <div
          className="ee-body"
          style={{
            position: "relative",
            zIndex: 1,
            ...surfaceBackground({ color: g.contentBg, type: g.contentBgType, gradient: g.contentGradient, image: g.contentBgImage || undefined, repeat: "cover", overlay: g.contentBgOverlay ? { color: "#000000", opacity: g.contentBgOverlay } : undefined }),
            borderRadius: g.contentRadius || 0,
            border: g.contentBorder && g.contentBorder.style !== "none" ? `${g.contentBorder.width}px ${g.contentBorder.style} ${g.contentBorder.color}` : undefined,
            fontFamily: fontStack(g.font),
            color: g.textColor,
            margin: "0 auto",
            width: device === "mobile" ? "100%" : g.width,
            maxWidth: "100%",
            minHeight: g.minHeight && g.minHeight > 0 ? g.minHeight : 460,
            flex: "1 0 auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: g.contentVAlign === "middle" ? "center" : g.contentVAlign === "bottom" ? "flex-end" : "flex-start",
            padding: g.padding ? padCss(g.padding) : undefined,
            boxSizing: "border-box",
            // NB: no overflow clip here. `overflow-x:hidden` forces overflow-y to
            // compute to `auto`, which clips the selection/drag chrome that floats
            // ABOVE the first row/block. Over-wide content is instead contained by
            // the columns' `minWidth:0` and the html block's own overflow guard.
          }}
        >
          {/* Paridad con el correo: el render emite `a{color:linkColor}` (+
              text-decoration:none del BASE_CSS) en el head. Los estilos inline
              del usuario siguen ganando, igual que en el correo real. */}
          <style>{`.ee-body a{color:${safeCssColor(g.linkColor, "#1E4876")};text-decoration:none;}`}</style>
          {rows.length === 0 ? (
            <EmptyDrop dragItem={dragItem} onDrop={() => handlers.onDropEmpty()} />
          ) : (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                flexDirection: "column",
                // Con alineación vertical centro/abajo el contenedor NO se estira,
                // así el justifyContent del padre lo posiciona dentro del alto mínimo.
                // En "arriba" sí se estira para que la zona de drop final ocupe el
                // espacio sobrante y se pueda soltar al final.
                flex: g.contentVAlign === "middle" || g.contentVAlign === "bottom" ? "0 0 auto" : "1 0 auto",
              }}
            >
              {rows.map((row, ri) => (
                <Fragment key={row.id}>
                  <RowDropZone
                    isOver={dragActive && overIndex === ri}
                    onOver={(v) => setOverIndex(v ? ri : -1)}
                    onDrop={() => handlers.onDropRow(ri)}
                    active={dragActive}
                    blockDrag={blockDrag}
                  />
                  <CanvasRow
                    row={row}
                    g={g}
                    selection={selection}
                    editingId={editingId}
                    dragItem={dragItem}
                    device={device}
                    handlers={handlers}
                  />
                </Fragment>
              ))}
              <RowDropZone
                fill
                isOver={dragActive && overIndex === rows.length}
                onOver={(v) => setOverIndex(v ? rows.length : -1)}
                onDrop={() => handlers.onDropRow(rows.length)}
                active={dragActive}
                blockDrag={blockDrag}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
