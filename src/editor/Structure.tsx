/* ============================================================
   @begraffic/email/editor · Structure.tsx
   Collapsible "Estructura" panel: a live tree of the document (sections →
   columns → blocks, incl. nested columns → sub-columns → blocks). Click a node
   to select it (drives the canvas highlight + properties panel). Drag to:
     • reorder a SECTION among sections,
     • move a BLOCK before/after any other block (any section/column), or
     • drop a BLOCK onto a column / sub-column to append it there.
   Moves reuse the editor ops (setRows / removeBlockTree + insertBeforeId), so
   the document stays the single source of truth and undo/redo works.

   NodeRow is at MODULE scope ON PURPOSE: a component defined inside the panel
   gets a new identity each render (e.g. setOver during dragover) and React would
   remount the dragged DOM node mid-drag, cancelling native HTML5 drag-and-drop.
   ============================================================ */
"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Columns2,
  Columns3,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Menu as MenuIcon,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelLeftClose,
  PlayCircle,
  Rows3,
  Share2,
  Timer,
  Type,
} from "lucide-react";

import type { Block, Row, Selection } from "./types";
import { UI } from "./theme";

type IconType = typeof Type;

const BLOCK_META: Record<string, { label: string; Icon: IconType }> = {
  heading: { label: "Encabezado", Icon: Heading },
  text: { label: "Texto", Icon: Type },
  image: { label: "Imagen", Icon: ImageIcon },
  button: { label: "Botón", Icon: MousePointerClick },
  divider: { label: "Divisor", Icon: Minus },
  spacer: { label: "Espacio", Icon: MoveVertical },
  social: { label: "Redes sociales", Icon: Share2 },
  video: { label: "Video", Icon: PlayCircle },
  html: { label: "HTML", Icon: Code2 },
  menu: { label: "Menú", Icon: MenuIcon },
  timer: { label: "Temporizador", Icon: Timer },
  titleImage: { label: "Título imagen", Icon: Heading },
  columns: { label: "Columnas", Icon: Columns3 },
};

export type BlockCtx = { rowId: string; colIndex: number; parentId?: string; subColId?: string };
export type ReorderRow = (rowId: string, beforeRowId: string | null) => void;
export type MoveBlock = (blockId: string, target: BlockCtx, beforeBlockId: string | null) => void;

type DragKind = "block" | "row";
type NodeDrag = { kind: DragKind; id: string };
type NodeDrop = { accept: DragKind; mode: "reorder" | "into"; onDrop: (draggedId: string, pos: "before" | "after") => void };
type OverState = { id: string; mode: "before" | "after" | "into" } | null;
type DragRef = { current: NodeDrag | null };
type Dnd = { over: OverState; setOver: Dispatch<SetStateAction<OverState>>; dragRef: DragRef };

function NodeRow({
  id,
  depth,
  Icon,
  label,
  active,
  onClick,
  hasChildren,
  expanded,
  onToggle,
  drag,
  drop,
  dnd,
}: {
  id: string;
  depth: number;
  Icon: IconType;
  label: string;
  active: boolean;
  onClick: () => void;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  drag?: NodeDrag;
  drop?: NodeDrop;
  dnd: Dnd;
}) {
  const { over, setOver, dragRef } = dnd;
  const isOver = !!(over && over.id === id);
  const overMode = isOver ? over!.mode : null;
  return (
    <div
      draggable={!!drag}
      onDragStart={
        drag
          ? (e) => {
              dragRef.current = drag;
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", drag.id);
            }
          : undefined
      }
      onDragEnd={() => {
        dragRef.current = null;
        setOver(null);
      }}
      onDragOver={
        drop
          ? (e) => {
              const dr = dragRef.current;
              if (!dr || dr.kind !== drop.accept) return;
              if (drop.mode === "reorder" && dr.id === id) return; // dropping on self
              e.preventDefault();
              let mode: "before" | "after" | "into" = "into";
              if (drop.mode === "reorder") {
                const r = e.currentTarget.getBoundingClientRect();
                mode = e.clientY < r.top + r.height / 2 ? "before" : "after";
              }
              setOver((prev) => (prev && prev.id === id && prev.mode === mode ? prev : { id, mode }));
            }
          : undefined
      }
      onDrop={
        drop
          ? (e) => {
              const dr = dragRef.current;
              if (!dr || dr.kind !== drop.accept || (drop.mode === "reorder" && dr.id === id)) {
                setOver(null);
                return;
              }
              e.preventDefault();
              let pos: "before" | "after" = "before";
              if (drop.mode === "reorder") {
                const r = e.currentTarget.getBoundingClientRect();
                pos = e.clientY < r.top + r.height / 2 ? "before" : "after";
              }
              drop.onDrop(dr.id, pos);
              dragRef.current = null;
              setOver(null);
            }
          : undefined
      }
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 30,
        paddingLeft: 8 + depth * 14,
        paddingRight: 8,
        cursor: "pointer",
        fontSize: 12.5,
        color: active ? UI.accent : UI.text,
        background: overMode === "into" ? UI.accentSoft : active ? UI.accentSoft : "transparent",
        borderRadius: 6,
        boxShadow: overMode === "into" ? `inset 0 0 0 2px ${UI.accent}` : "none",
        borderTop: overMode === "before" ? `2px solid ${UI.accent}` : "2px solid transparent",
        borderBottom: overMode === "after" ? `2px solid ${UI.accent}` : "2px solid transparent",
        userSelect: "none",
      }}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          aria-label={expanded ? "Colapsar" : "Expandir"}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: UI.textSubtle, display: "flex", padding: 0 }}
        >
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      ) : (
        <span style={{ width: 13, flexShrink: 0 }} />
      )}
      <Icon size={13} style={{ flexShrink: 0, color: active ? UI.accent : UI.textMuted }} aria-hidden />
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {drag && <GripVertical size={13} style={{ flexShrink: 0, color: UI.textSubtle, cursor: "grab" }} aria-hidden />}
    </div>
  );
}

export function StructurePanel({
  rows,
  selection,
  onSelect,
  onReorderRow,
  onMoveBlock,
  onClose,
}: {
  rows: Row[];
  selection: Selection;
  onSelect: (s: Selection) => void;
  onReorderRow: ReorderRow;
  onMoveBlock: MoveBlock;
  onClose: () => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const dragRef = useRef<NodeDrag | null>(null);
  const [over, setOver] = useState<OverState>(null);
  const dnd: Dnd = { over, setOver, dragRef };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rowIds = rows.map((r) => r.id);

  // Drop config for a BLOCK node: reorder before/after it within ITS container.
  const blockDrop = (ctx: BlockCtx, siblings: string[], blockId: string): NodeDrop => ({
    accept: "block",
    mode: "reorder",
    onDrop: (draggedId, pos) => {
      if (draggedId === blockId) return;
      const idx = siblings.indexOf(blockId);
      const beforeId = pos === "before" ? blockId : siblings[idx + 1] ?? null;
      onMoveBlock(draggedId, ctx, beforeId);
    },
  });

  const renderBlock = (block: Block, ctx: BlockCtx, siblings: string[], depth: number) => {
    const meta = BLOCK_META[block.type] ?? { label: block.type, Icon: Type };
    const active = selection.kind === "block" && selection.blockId === block.id;
    const drag: NodeDrag = { kind: "block", id: block.id };
    const onClick = () => onSelect({ kind: "block", rowId: ctx.rowId, colIndex: ctx.colIndex, blockId: block.id });

    if (block.type === "columns") {
      const expanded = !collapsed.has(block.id);
      return (
        <div key={block.id}>
          <NodeRow
            id={block.id}
            depth={depth}
            Icon={meta.Icon}
            label={`${meta.label} (${block.cols.length})`}
            active={active}
            onClick={onClick}
            hasChildren={block.cols.length > 0}
            expanded={expanded}
            onToggle={() => toggle(block.id)}
            drag={drag}
            drop={blockDrop(ctx, siblings, block.id)}
            dnd={dnd}
          />
          {expanded &&
            block.cols.map((sc) => {
              const scActive =
                selection.kind === "subcolumn" && selection.subColId === sc.id && selection.parentId === block.id;
              const scExpanded = !collapsed.has(sc.id);
              const scCtx: BlockCtx = { rowId: ctx.rowId, colIndex: ctx.colIndex, parentId: block.id, subColId: sc.id };
              const scChildIds = sc.blocks.map((b) => b.id);
              return (
                <div key={sc.id}>
                  <NodeRow
                    id={sc.id}
                    depth={depth + 1}
                    Icon={Columns2}
                    label="Subcolumna"
                    active={scActive}
                    onClick={() => onSelect({ kind: "subcolumn", rowId: ctx.rowId, colIndex: ctx.colIndex, parentId: block.id, subColId: sc.id })}
                    hasChildren={sc.blocks.length > 0}
                    expanded={scExpanded}
                    onToggle={() => toggle(sc.id)}
                    drop={{ accept: "block", mode: "into", onDrop: (draggedId) => onMoveBlock(draggedId, scCtx, null) }}
                    dnd={dnd}
                  />
                  {scExpanded && sc.blocks.map((b) => renderBlock(b, scCtx, scChildIds, depth + 2))}
                </div>
              );
            })}
        </div>
      );
    }

    return (
      <NodeRow
        key={block.id}
        id={block.id}
        depth={depth}
        Icon={meta.Icon}
        label={meta.label}
        active={active}
        onClick={onClick}
        drag={drag}
        drop={blockDrop(ctx, siblings, block.id)}
        dnd={dnd}
      />
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: UI.sidebar, borderRight: `1px solid ${UI.border}` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 10px", borderBottom: `1px solid ${UI.borderSubtle}` }}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: UI.text }}>Estructura</span>
        <button
          type="button"
          onClick={onClose}
          title="Ocultar estructura"
          aria-label="Ocultar estructura"
          style={{ border: "none", background: "transparent", cursor: "pointer", color: UI.textMuted, display: "flex", padding: 2 }}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
        {rows.length === 0 ? (
          <p style={{ padding: "12px 8px", fontSize: 12, color: UI.textSubtle }}>
            Aún no hay contenido. Arrastra estructuras o bloques al lienzo para empezar.
          </p>
        ) : (
          rows.map((row) => {
            const expanded = !collapsed.has(row.id);
            const active = selection.kind === "row" && selection.rowId === row.id;
            return (
              <div key={row.id}>
                <NodeRow
                  id={row.id}
                  depth={0}
                  Icon={Rows3}
                  label="Sección"
                  active={active}
                  onClick={() => onSelect({ kind: "row", rowId: row.id })}
                  hasChildren={row.cols.length > 0}
                  expanded={expanded}
                  onToggle={() => toggle(row.id)}
                  drag={{ kind: "row", id: row.id }}
                  drop={{
                    accept: "row",
                    mode: "reorder",
                    onDrop: (draggedId, pos) => {
                      if (draggedId === row.id) return;
                      const idx = rowIds.indexOf(row.id);
                      const beforeId = pos === "before" ? row.id : rowIds[idx + 1] ?? null;
                      onReorderRow(draggedId, beforeId);
                    },
                  }}
                  dnd={dnd}
                />
                {expanded &&
                  row.cols.map((col, colIndex) => {
                    const colActive =
                      selection.kind === "column" && selection.rowId === row.id && selection.colIndex === colIndex;
                    const colExpanded = !collapsed.has(col.id);
                    const childIds = col.blocks.map((b) => b.id);
                    const colCtx: BlockCtx = { rowId: row.id, colIndex };
                    return (
                      <div key={col.id}>
                        <NodeRow
                          id={col.id}
                          depth={1}
                          Icon={Columns2}
                          label={row.cols.length > 1 ? `Columna ${colIndex + 1}` : "Columna"}
                          active={colActive}
                          onClick={() => onSelect({ kind: "column", rowId: row.id, colIndex })}
                          hasChildren={col.blocks.length > 0}
                          expanded={colExpanded}
                          onToggle={() => toggle(col.id)}
                          drop={{ accept: "block", mode: "into", onDrop: (draggedId) => onMoveBlock(draggedId, colCtx, null) }}
                          dnd={dnd}
                        />
                        {colExpanded && col.blocks.map((b) => renderBlock(b, colCtx, childIds, 2))}
                      </div>
                    );
                  })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
