/* ============================================================
   @begraffic/email/editor · Sidebar.tsx
   Right control sidebar: 3 tabs + contextual property editors
   ============================================================ */
"use client";

import { useState, type CSSProperties, type DragEvent } from "react";
import { DEFAULT_GRADIENT, DEFAULT_OVERLAY, gradientCss } from "./background";
import { BLOCK_DEFS, C, SOCIAL_META, STRUCTURE_DEFS, type BlockDef, type StructureDef } from "./constants";
import { FONT_PREVIEW_GROUPS } from "./fonts";
import { IMAGE_FONT_PREVIEW_GROUPS } from "./imageFonts";
import { PRESET_DEFS, type PresetDef } from "../render/render/presets";
import { UI } from "./theme";
import {
  Btn,
  ColorField,
  CornerRadiusBox,
  Field,
  NumberInput,
  PaddingBox,
  PanelDivider,
  FontSelect,
  SectionLabel,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
  fieldLabel,
  focusOff,
  focusOn,
  inputBase,
} from "./controls";
import { defaultContentPanel, findBlockTree, findSubColumn, genId, newSubColumn } from "./defaults";
import { hasDeviceOverride, resolveForDevice, resolvedHidden } from "./responsive";
import { Icon, SocialGlyph } from "./Icon";
import type {
  Block,
  BlockType,
  Border,
  ButtonBlock,
  Column,
  ColumnsBlock,
  ContentPanel,
  Device,
  DividerBlock,
  FillType,
  GlobalSettings,
  Gradient,
  HeadingBlock,
  HtmlBlock,
  ImageBlock,
  ImageOverlay,
  ImageSizeUnit,
  MenuBlock,
  Offset,
  Responsive,
  SubColumn,
  TitleImageBlock,
  Row,
  Selection,
  SocialBlock,
  SocialStyle,
  SpacerBlock,
  TextBlock,
  TimerBlock,
  VideoBlock,
} from "./types";

type Updater<T> = (patch: Partial<T>) => void;
const alignSeg = [
  { value: "left", icon: "align-left" },
  { value: "center", icon: "align-center" },
  { value: "right", icon: "align-right" },
];

/* Grupos de fuente para bloques de texto (con vista previa): "Heredar (global)"
   + el catálogo, cada opción renderizada con SU tipografía. */
const BLOCK_FONT_PREVIEW_GROUPS = [
  { label: "General", options: [{ value: "", label: "Heredar (global)", css: "inherit" }] },
  ...FONT_PREVIEW_GROUPS,
];

/* ── Block card (draggable + click to add) ── */
function BlockCard({
  def,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  def: BlockDef;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 7,
        padding: "14px 8px",
        borderRadius: 10,
        border: "1px solid " + (hover ? UI.border : UI.border),
        background: hover ? UI.accentSoft : UI.surface,
        cursor: "grab",
        fontFamily: "inherit",
        textAlign: "center",
        transition: "all 120ms",
        boxShadow: hover ? "0 4px 12px rgba(15,37,66,.08)" : "none",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: hover ? UI.surface : UI.surfaceAlt,
          border: "1px solid " + UI.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: UI.accent,
        }}
      >
        <Icon name={def.icon} size={18} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: UI.text }}>{def.label}</span>
    </button>
  );
}

function StructureCard({
  def,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  def: StructureDef;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid " + (hover ? UI.border : UI.border),
        background: hover ? UI.accentSoft : UI.surface,
        cursor: "grab",
        fontFamily: "inherit",
        width: "100%",
        transition: "all 120ms",
        boxShadow: hover ? "0 4px 12px rgba(15,37,66,.08)" : "none",
      }}
    >
      <div style={{ display: "flex", gap: 3, width: 54, height: 34, flexShrink: 0 }}>
        {def.cols.map((w, i) => (
          <div key={i} style={{ width: w + "%", background: hover ? UI.border : UI.border, borderRadius: 3 }} />
        ))}
      </div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: UI.text }}>{def.label}</div>
        <div style={{ fontSize: 11, color: UI.textSubtle }}>{def.cols.map((c) => Math.round(c) + "%").join(" · ")}</div>
      </div>
      <Icon name="grip-vertical" size={14} color={UI.textSubtle} style={{ marginLeft: "auto" }} />
    </button>
  );
}

function PresetCard({ def, onClick }: { def: PresetDef; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "11px 12px",
        borderRadius: 10,
        border: "1px solid " + (hover ? UI.border : UI.border),
        background: hover ? UI.accentSoft : UI.surface,
        cursor: "pointer",
        fontFamily: "inherit",
        width: "100%",
        textAlign: "left",
        transition: "all 120ms",
        boxShadow: hover ? "0 4px 12px rgba(15,37,66,.08)" : "none",
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          flexShrink: 0,
          background: hover ? UI.surface : UI.accentSoft,
          border: "1px solid " + UI.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: UI.accent,
        }}
      >
        <Icon name={def.icon} size={17} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: UI.text }}>{def.label}</div>
        <div style={{ fontSize: 11, color: UI.textSubtle, lineHeight: 1.35, marginTop: 1 }}>{def.description}</div>
      </div>
    </button>
  );
}

/* ── Tabs view (nothing selected) ── */
function TabsPanel({
  tab,
  setTab,
  g,
  onUpdateGlobal,
  onPickGlobalImage,
  onDragStartBlock,
  onDragStartStructure,
  onDragEnd,
  onClickBlock,
  onClickStructure,
  onClickPreset,
}: {
  tab: string;
  setTab: (t: string) => void;
  g: GlobalSettings;
  onUpdateGlobal: Updater<GlobalSettings>;
  onPickGlobalImage: () => void;
  onDragStartBlock: (e: DragEvent, t: BlockType) => void;
  onDragStartStructure: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClickBlock: (t: BlockType) => void;
  onClickStructure: (id: string) => void;
  onClickPreset: (id: string) => void;
}) {
  const tabs = [
    { id: "blocks", label: "Bloques", icon: "shapes" },
    { id: "structures", label: "Estructuras", icon: "columns-3" },
    { id: "global", label: "Ajustes", icon: "sliders-horizontal" },
  ];
  return (
    <>
      <div style={{ display: "flex", padding: "10px 12px 0", gap: 4, borderBottom: "1px solid " + UI.borderSubtle }}>
        {tabs.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "8px 4px 10px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "inherit",
              color: tab === t.id ? UI.accent : UI.textMuted,
              position: "relative",
            }}
          >
            <Icon name={t.icon} size={16} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{t.label}</span>
            {tab === t.id && (
              <span style={{ position: "absolute", bottom: -1, left: 8, right: 8, height: 2.5, background: UI.accent, borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {tab === "blocks" && (
          <>
            <SectionLabel>Contenido · arrastra al lienzo</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {BLOCK_DEFS.map((def) => (
                <BlockCard
                  key={def.type}
                  def={def}
                  onDragStart={(e) => onDragStartBlock(e, def.type)}
                  onDragEnd={onDragEnd}
                  onClick={() => onClickBlock(def.type)}
                />
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                background: UI.accentSoft,
                borderRadius: 10,
                fontSize: 11.5,
                color: UI.accent,
                display: "flex",
                gap: 8,
                lineHeight: 1.5,
              }}
            >
              <Icon name="info" size={14} color={UI.accent} style={{ marginTop: 1 }} />
              <span>Arrastra un bloque a una columna, o haz clic para añadirlo a la fila seleccionada.</span>
            </div>
            <PanelDivider />
            <SectionLabel>Composiciones · listas para usar</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PRESET_DEFS.map((def) => (
                <PresetCard key={def.id} def={def} onClick={() => onClickPreset(def.id)} />
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: UI.accentSoft,
                borderRadius: 10,
                fontSize: 11.5,
                color: UI.accent,
                display: "flex",
                gap: 8,
                lineHeight: 1.5,
              }}
            >
              <Icon name="info" size={14} color={UI.accent} style={{ marginTop: 1 }} />
              <span>Una composición añade una sección lista (fila) al final del correo. Luego puedes editar cada bloque.</span>
            </div>
          </>
        )}
        {tab === "structures" && (
          <>
            <SectionLabel>Estructuras · filas de columnas</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STRUCTURE_DEFS.map((def) => (
                <StructureCard
                  key={def.id}
                  def={def}
                  onDragStart={(e) => onDragStartStructure(e, def.id)}
                  onDragEnd={onDragEnd}
                  onClick={() => onClickStructure(def.id)}
                />
              ))}
            </div>
          </>
        )}
        {tab === "global" && <GlobalSettingsPanel g={g} onUpdate={onUpdateGlobal} onPickImage={onPickGlobalImage} />}
      </div>
    </>
  );
}

function GlobalSettingsPanel({
  g,
  onUpdate,
  onPickImage,
}: {
  g: GlobalSettings;
  onUpdate: Updater<GlobalSettings>;
  onPickImage: () => void;
}) {
  const cBorder = g.contentBorder || { style: "none" as const, width: 1, color: "#E5E5E5" };
  const setCBorder = (patch: Partial<Border>) => onUpdate({ contentBorder: { ...cBorder, ...patch } });
  return (
    <>
      <SectionLabel>Bandeja de entrada</SectionLabel>
      <Field
        label="Texto de previsualización (preheader)"
        hint="El resumen que aparece en la bandeja junto al asunto. Mejora la tasa de apertura y la entregabilidad. No se muestra dentro del correo."
      >
        <TextInput
          value={g.preheader || ""}
          onChange={(v) => onUpdate({ preheader: v })}
          placeholder="Ej. Tu resumen mensual ya está listo"
        />
      </Field>
      <Field
        label="Modo oscuro (best-effort)"
        hint="Sugiere a los clientes que respeten el modo oscuro del usuario (Apple Mail, Outlook.com). El soporte varía por cliente."
      >
        <Toggle value={!!g.darkMode} onChange={(v) => onUpdate({ darkMode: v })} label="Activar" />
      </Field>
      <PanelDivider />
      <SectionLabel>Cuerpo del correo</SectionLabel>
      <Field label="Ancho del correo">
        <Slider value={g.width} onChange={(v) => onUpdate({ width: v })} min={500} max={800} step={10} />
      </Field>
      <Field label="Alto mínimo del cuerpo" hint="Alto mínimo del correo en px (0 = automático). Se ve en clientes modernos; Outlook usa el alto del contenido.">
        <NumberInput value={g.minHeight ?? 0} min={0} step={20} suffix="px" onChange={(v) => onUpdate({ minHeight: v })} />
      </Field>
      <Field label="Alineación vertical del contenido" hint="Posiciona el contenido dentro del alto mínimo. Outlook lo deja arriba.">
        <Segmented
          full
          value={g.contentVAlign || "top"}
          onChange={(v) => onUpdate({ contentVAlign: v as GlobalSettings["contentVAlign"] })}
          options={[
            { value: "top", label: "Arriba" },
            { value: "middle", label: "Centro" },
            { value: "bottom", label: "Abajo" },
          ]}
        />
      </Field>
      <Field label="Radio de esquinas del contenido" hint="Redondea las esquinas del contenedor del correo. Algunos clientes (Outlook) las dejan rectas.">
        <Slider value={g.contentRadius ?? 0} onChange={(v) => onUpdate({ contentRadius: v })} min={0} max={48} suffix="px" />
      </Field>
      <Field label="Márgenes internos del cuerpo" hint="Espacio dentro del contenedor del correo.">
        <PaddingBox value={g.padding || { t: 0, b: 0, l: 0, r: 0 }} onChange={(v) => onUpdate({ padding: v })} />
      </Field>
      <PanelDivider />
      <SectionLabel>Tipografía</SectionLabel>
      <Field
        label="Fuente global"
        hint="Se aplica a todo el correo; los bloques de texto con fuente propia la sobrescriben. Las fuentes web caen a una segura en Outlook/Gmail."
      >
        <FontSelect value={g.font || ""} onChange={(v) => onUpdate({ font: v })} groups={FONT_PREVIEW_GROUPS} />
      </Field>
      <PanelDivider />
      <SectionLabel>Colores</SectionLabel>
      <Field label="Fondo del canvas (exterior)" hint="Color del área alrededor del correo. (Las imágenes de fondo del canvas no son compatibles con correo, por eso solo hay color.)">
        <ColorField value={g.canvasBg} onChange={(v) => onUpdate({ canvasBg: v })} />
      </Field>
      {g.canvasBgImage ? (
        <Field
          label="Imagen de fondo del canvas (heredada)"
          hint="Viene de un diseño anterior: se envía detrás del correo, pero muchos clientes (Gmail, Outlook) la ignoran. Quítala si prefieres solo el color."
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={g.canvasBgImage} alt="" style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 6, border: "1px solid " + UI.border }} />
            <Btn variant="subtle" size="sm" icon="x" onClick={() => onUpdate({ canvasBgImage: "" })}>
              Quitar
            </Btn>
          </div>
        </Field>
      ) : null}
      <Field label="Fondo del contenido">
        <BgFillField
          type={g.contentBgType ?? "solid"}
          onType={(t) => onUpdate({ contentBgType: t, ...(t === "gradient" && !g.contentGradient ? { contentGradient: DEFAULT_GRADIENT } : {}) })}
          color={g.contentBg}
          onColor={(v) => onUpdate({ contentBg: v })}
          gradient={g.contentGradient ?? DEFAULT_GRADIENT}
          onGradient={(patch) => onUpdate({ contentGradient: { ...(g.contentGradient ?? DEFAULT_GRADIENT), ...patch } })}
        />
      </Field>
      <Field label="Imagen de fondo del contenido" hint="Detrás de todo el contenido del correo. MJML genera el respaldo VML, así que se ve también en Outlook (a diferencia del fondo del canvas).">
        <ImageField value={g.contentBgImage ?? ""} onChange={(v) => onUpdate({ contentBgImage: v })} onPick={onPickImage} />
      </Field>
      {g.contentBgImage ? (
        <Field label="Overlay oscuro sobre la imagen" hint="Oscurece la imagen para mejorar el contraste del texto. Se incrusta en la imagen al enviar (imágenes de tu biblioteca o Pexels), así que se ve en todos los clientes, incluido Outlook.">
          <Slider value={g.contentBgOverlay ?? 0} onChange={(v) => onUpdate({ contentBgOverlay: v })} min={0} max={100} suffix="%" />
        </Field>
      ) : null}
      <Field label="Borde del contenido">
        <Segmented
          full
          value={cBorder.style}
          onChange={(v) => setCBorder({ style: v as Border["style"] })}
          options={[
            { value: "none", label: "Ninguno" },
            { value: "solid", label: "Sólido" },
            { value: "dashed", label: "Discont." },
          ]}
        />
      </Field>
      {cBorder.style !== "none" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
          <Field label="Grosor">
            <NumberInput value={cBorder.width} min={1} max={12} suffix="px" onChange={(v) => setCBorder({ width: v })} />
          </Field>
          <Field label="Color">
            <ColorField value={cBorder.color} onChange={(v) => setCBorder({ color: v })} />
          </Field>
        </div>
      )}
      <Field label="Color de texto global">
        <ColorField value={g.textColor} onChange={(v) => onUpdate({ textColor: v })} />
      </Field>
      <Field label="Color de enlaces">
        <ColorField value={g.linkColor} onChange={(v) => onUpdate({ linkColor: v })} />
      </Field>
    </>
  );
}

function ContextHeader({ icon, title, onBack }: { icon: string; title: string; onBack: () => void }) {
  return (
    <div style={{ padding: "12px 14px", borderBottom: "1px solid " + UI.borderSubtle }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          border: "1px solid " + UI.border,
          cursor: "pointer",
          color: UI.accent,
          fontSize: 12.5,
          fontWeight: 600,
          fontFamily: "inherit",
          padding: "9px 12px",
          marginBottom: 12,
          width: "100%",
          borderRadius: 8,
          background: UI.accentSoft,
          transition: "background 150ms",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = UI.accentSoft)}
        onMouseLeave={(e) => (e.currentTarget.style.background = UI.accentSoft)}
      >
        <Icon name="arrow-left" size={15} /> Volver a Bloques
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: UI.accentSoft,
            border: "1px solid " + UI.border,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: UI.accent,
          }}
        >
          <Icon name={icon} size={15} />
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: UI.text }}>{title}</span>
      </div>
    </div>
  );
}

function LayoutSwitcher({ layout, onChange }: { layout: string; onChange: (id: string) => void }) {
  return (
    <Field hint="Elige cuántas columnas tiene esta estructura.">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {STRUCTURE_DEFS.map((s) => {
          const active = layout === s.id;
          return (
            <button
              type="button"
              key={s.id}
              onClick={() => onChange(s.id)}
              title={s.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                padding: "10px 8px",
                borderRadius: 8,
                border: "1px solid " + (active ? UI.accent : UI.border),
                background: active ? UI.accentSoft : UI.surface,
                cursor: "pointer",
              }}
            >
              {s.cols.map((w, i) => (
                <span key={i} style={{ flex: w, height: 15, background: active ? UI.accent : UI.borderStrong, borderRadius: 2 }} />
              ))}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function ImageField({
  value,
  repeat,
  onChange,
  onRepeat,
  onPick,
}: {
  value?: string;
  repeat?: string;
  onChange: (v: string) => void;
  onRepeat?: (v: string) => void;
  onPick: () => void;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 8 }}>
        <TextInput placeholder="https://…" value={value} onChange={onChange} />
        <Btn variant="ghost" size="md" icon="image" onClick={onPick} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
          Elegir
        </Btn>
      </div>
      {value ? (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <img src={value} alt="" style={{ width: 48, height: 34, objectFit: "cover", borderRadius: 6, border: "1px solid " + UI.border }} />
          <Btn variant="subtle" size="sm" icon="x" onClick={() => onChange("")}>
            Quitar
          </Btn>
        </div>
      ) : null}
      {onRepeat && (
        <div style={{ marginTop: 8 }}>
          <Segmented
            full
            value={repeat || "cover"}
            onChange={onRepeat}
            options={[
              { value: "repeat", label: "Repetir" },
              { value: "cover", label: "Cubrir" },
              { value: "center", label: "Centrar" },
            ]}
          />
        </div>
      )}
    </>
  );
}

/* ── Gradient direction picker (3×3 de flechas) ── */
const GRAD_DIRS = [
  { a: 315, arrow: "↖" },
  { a: 0, arrow: "↑" },
  { a: 45, arrow: "↗" },
  { a: 270, arrow: "←" },
  { a: -1, arrow: "" },
  { a: 90, arrow: "→" },
  { a: 225, arrow: "↙" },
  { a: 180, arrow: "↓" },
  { a: 135, arrow: "↘" },
];
function DirectionPicker({ angle, onChange }: { angle: number; onChange: (a: number) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, maxWidth: 138 }}>
      {GRAD_DIRS.map((d, i) => {
        if (d.a < 0) {
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: UI.textSubtle, fontVariantNumeric: "tabular-nums" }}>
              {angle}°
            </div>
          );
        }
        const active = angle === d.a;
        return (
          <button
            type="button"
            key={i}
            onClick={() => onChange(d.a)}
            title={`${d.a}°`}
            style={{
              height: 30,
              borderRadius: 7,
              border: "1px solid " + (active ? UI.accent : UI.border),
              background: active ? UI.accentSoft : UI.surface,
              color: active ? UI.accent : UI.textMuted,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "inherit",
            }}
          >
            {d.arrow}
          </button>
        );
      })}
    </div>
  );
}

/* ── Background fill (color sólido o gradiente) ── */
function BgFillField({
  type,
  onType,
  color,
  onColor,
  gradient,
  onGradient,
  colorOpacity,
  onColorOpacity,
}: {
  type: FillType;
  onType: (t: FillType) => void;
  color?: string;
  onColor: (v: string) => void;
  gradient: Gradient;
  onGradient: (patch: Partial<Gradient>) => void;
  /** Opcional: control de opacidad del color sólido (rgba). Solo aplica a color sólido. */
  colorOpacity?: number;
  onColorOpacity?: (v: number) => void;
}) {
  return (
    <>
      <Segmented
        full
        value={type}
        onChange={(v) => onType(v as FillType)}
        options={[
          { value: "solid", label: "Color" },
          { value: "gradient", label: "Gradiente" },
        ]}
      />
      <div style={{ marginTop: 8 }}>
        {type === "solid" ? (
          <>
            <ColorField allowEmpty value={color} onChange={onColor} />
            {onColorOpacity && (
              <div style={{ marginTop: 8 }}>
                <label style={{ ...fieldLabel, marginBottom: 6 }}>Opacidad del color</label>
                <Slider value={colorOpacity ?? 100} onChange={onColorOpacity} min={0} max={100} suffix="%" />
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, minWidth: 0 }}>
              <div style={{ minWidth: 0 }}>
                <label style={{ ...fieldLabel, marginBottom: 4 }}>Color inicial</label>
                <ColorField value={gradient.from} onChange={(v) => onGradient({ from: v })} />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={{ ...fieldLabel, marginBottom: 4 }}>Color final</label>
                <ColorField value={gradient.to} onChange={(v) => onGradient({ to: v })} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ ...fieldLabel, marginBottom: 6 }}>Dirección</label>
              <DirectionPicker angle={gradient.angle} onChange={(a) => onGradient({ angle: a })} />
            </div>
            <div
              aria-hidden
              style={{ marginTop: 10, height: 30, borderRadius: 8, border: "1px solid " + UI.border, backgroundImage: gradientCss(gradient) }}
            />
          </>
        )}
      </div>
    </>
  );
}

/* ── Offset (desplazamiento X/Y, admite negativos) ── */
function OffsetField({ value, onChange }: { value: Offset; onChange: (v: Offset) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, minWidth: 0 }}>
      <div style={{ minWidth: 0 }}>
        <label style={{ ...fieldLabel, marginBottom: 4 }}>Horizontal (X)</label>
        <NumberInput value={value.x} step={5} suffix="px" onChange={(v) => onChange({ ...value, x: v })} />
      </div>
      <div style={{ minWidth: 0 }}>
        <label style={{ ...fieldLabel, marginBottom: 4 }}>Vertical (Y)</label>
        <NumberInput value={value.y} step={5} suffix="px" onChange={(v) => onChange({ ...value, y: v })} />
      </div>
    </div>
  );
}

/* ── Row properties ── */
function RowProps({
  row,
  onUpdate,
  onUpdateCol,
  onBack,
  onChangeRowLayout,
  onPickImage,
}: {
  row: Row;
  onUpdate: Updater<Row>;
  onUpdateCol: (colIndex: number, patch: Partial<Column>) => void;
  onBack: () => void;
  onChangeRowLayout: (rowId: string, structureId: string) => void;
  onPickImage: (intent: "row") => void;
}) {
  const setBorder = (patch: Partial<Row["border"]>) => onUpdate({ border: { ...row.border, ...patch } });
  const ov: ImageOverlay = row.bgOverlay ?? DEFAULT_OVERLAY;
  const setOverlay = (patch: Partial<ImageOverlay>) => onUpdate({ bgOverlay: { ...ov, ...patch } });
  return (
    <>
      <ContextHeader icon="rows-3" title="Propiedades de la fila" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <SectionLabel>Columnas de la estructura</SectionLabel>
        <LayoutSwitcher layout={row.layout} onChange={(s) => onChangeRowLayout(row.id, s)} />
        <PanelDivider />
        <SectionLabel>Fondo</SectionLabel>
        <Field label="Fondo de la fila (100% ancho)">
          <BgFillField
            type={row.bgRowType ?? "solid"}
            onType={(t) => onUpdate({ bgRowType: t, ...(t === "gradient" && !row.bgRowGradient ? { bgRowGradient: DEFAULT_GRADIENT } : {}) })}
            color={row.bgRow}
            onColor={(v) => onUpdate({ bgRow: v })}
            gradient={row.bgRowGradient ?? DEFAULT_GRADIENT}
            onGradient={(patch) => onUpdate({ bgRowGradient: { ...(row.bgRowGradient ?? DEFAULT_GRADIENT), ...patch } })}
          />
        </Field>
        <Field label="Fondo del contenido">
          <BgFillField
            type={row.bgContentType ?? "solid"}
            onType={(t) => onUpdate({ bgContentType: t, ...(t === "gradient" && !row.bgContentGradient ? { bgContentGradient: DEFAULT_GRADIENT } : {}) })}
            color={row.bgContent}
            onColor={(v) => onUpdate({ bgContent: v })}
            gradient={row.bgContentGradient ?? DEFAULT_GRADIENT}
            onGradient={(patch) => onUpdate({ bgContentGradient: { ...(row.bgContentGradient ?? DEFAULT_GRADIENT), ...patch } })}
          />
        </Field>
        <Field
          label="Imagen de fondo"
          hint="Se ve en Gmail, Apple Mail y la mayoría de clientes. En Outlook se genera un respaldo VML a partir del «Alto de la fila»; por eso, al añadir una imagen, se asigna un alto mínimo (ajústalo abajo)."
        >
          <ImageField
            value={row.bgImage}
            repeat={row.bgRepeat}
            // Al poner imagen de fondo, fija un alto mínimo si no hay: el VML de
            // Outlook necesita un alto explícito para mostrar la imagen.
            onChange={(v) => onUpdate(v && !row.minHeight ? { bgImage: v, minHeight: 240 } : { bgImage: v })}
            onRepeat={(v) => onUpdate({ bgRepeat: v as Row["bgRepeat"] })}
            onPick={() => onPickImage("row")}
          />
        </Field>
        {row.bgImage ? (
          <>
            <Field label="Ancho de la imagen" hint="0 = automático.">
              <NumberInput value={row.bgImageWidth ?? 0} min={0} step={10} suffix="px" onChange={(v) => onUpdate({ bgImageWidth: v })} />
            </Field>
            <Field label="Color del overlay" hint="Capa de color sobre la imagen (sube la opacidad para verlo).">
              <ColorField value={ov.color} onChange={(v) => setOverlay({ color: v })} />
            </Field>
            <Field label="Opacidad del overlay">
              <Slider value={ov.opacity} onChange={(v) => setOverlay({ opacity: v })} min={0} max={100} suffix="%" />
            </Field>
          </>
        ) : null}
        <PanelDivider />
        <SectionLabel>Espaciado</SectionLabel>
        <Field label="Márgenes internos (padding)">
          <PaddingBox value={row.padding} onChange={(v) => onUpdate({ padding: v })} />
        </Field>
        <Field label="Márgenes externos" hint="Espacio fuera de la fila, hacia las filas contiguas.">
          <PaddingBox value={row.margin ?? { t: 0, b: 0, l: 0, r: 0 }} onChange={(v) => onUpdate({ margin: v })} />
        </Field>
        <PanelDivider />
        <SectionLabel>Forma y posición</SectionLabel>
        <Field label="Alto de la fila" hint="Alto mínimo, sin límite: la fila crece si el contenido es más alto. 0 = automático.">
          <NumberInput value={row.minHeight ?? 0} min={0} step={10} suffix="px" onChange={(v) => onUpdate({ minHeight: v })} />
        </Field>
        <Field label="Esquinas redondeadas">
          <CornerRadiusBox value={row.radius ?? { tl: 0, tr: 0, br: 0, bl: 0 }} onChange={(v) => onUpdate({ radius: v })} />
        </Field>
        <Field label="Desplazamiento (offset)">
          <OffsetField value={row.offset ?? { x: 0, y: 0 }} onChange={(v) => onUpdate({ offset: v })} />
        </Field>
        <div
          style={{
            marginTop: -4,
            marginBottom: 16,
            padding: "10px 12px",
            background: UI.accentSoft,
            borderRadius: 10,
            fontSize: 11.5,
            color: UI.accent,
            display: "flex",
            gap: 8,
            lineHeight: 1.5,
          }}
        >
          <Icon name="info" size={14} color={UI.accent} style={{ marginTop: 1 }} />
          <span>
            Las <strong>esquinas redondeadas</strong> recortan el contenido: un <strong>offset</strong> que sobresalga no se verá si la fila las tiene. En Outlook/Gmail el offset y los degradados no se aplican (caen a la posición/color normal).
          </span>
        </div>

        {row.cols.length > 1 && (
          <>
            <PanelDivider />
            <SectionLabel>Columnas individuales</SectionLabel>
            {row.cols.map((col, i) => (
              <Field key={col.id} label={`Padding columna ${i + 1} (${Math.round(col.width)}%)`}>
                <PaddingBox value={col.padding} onChange={(v) => onUpdateCol(i, { padding: v })} />
              </Field>
            ))}
          </>
        )}
        <PanelDivider />
        <SectionLabel>Borde</SectionLabel>
        <Field label="Estilo">
          <Segmented
            full
            value={row.border.style}
            onChange={(v) => setBorder({ style: v as Row["border"]["style"] })}
            options={[
              { value: "none", label: "Ninguno" },
              { value: "solid", label: "Sólido" },
              { value: "dashed", label: "Discont." },
            ]}
          />
        </Field>
        {row.border.style !== "none" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
            <Field label="Grosor">
              <NumberInput value={row.border.width} min={1} max={12} suffix="px" onChange={(v) => setBorder({ width: v })} />
            </Field>
            <Field label="Color">
              <ColorField value={row.border.color} onChange={(v) => setBorder({ color: v })} />
            </Field>
          </div>
        )}
        <PanelDivider />
        <SectionLabel>Visibilidad por dispositivo</SectionLabel>
        <Field>
          <Toggle label="Ocultar en escritorio" value={row.hideDesktop} onChange={(v) => onUpdate({ hideDesktop: v })} />
        </Field>
        <Field>
          <Toggle label="Ocultar en móvil" value={row.hideMobile} onChange={(v) => onUpdate({ hideMobile: v })} />
        </Field>
      </div>
    </>
  );
}

/* ── Per-block property editors ── */
function HeadingProps({ b, u }: { b: HeadingBlock; u: Updater<HeadingBlock> }) {
  return (
    <>
      <div style={{ padding: "10px 12px", background: UI.accentSoft, borderRadius: 10, fontSize: 11.5, color: UI.accent, display: "flex", gap: 8, lineHeight: 1.5, marginBottom: 16 }}>
        <Icon name="mouse-pointer-click" size={14} color={UI.accent} style={{ marginTop: 1 }} />
        <span>
          Haz <strong>doble clic</strong> en el encabezado del lienzo para editar el texto.
        </span>
      </div>
      <SectionLabel>Encabezado</SectionLabel>
      <Field label="Nivel" hint="Jerarquía semántica del título">
        <Segmented
          full
          value={b.level}
          onChange={(v) => u({ level: v as HeadingBlock["level"] })}
          options={[
            { value: "h1", label: "H1" },
            { value: "h2", label: "H2" },
            { value: "h3", label: "H3" },
          ]}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tamaño">
          <NumberInput value={b.fontSize} min={8} suffix="px" onChange={(v) => u({ fontSize: v })} />
        </Field>
        <Field label="Grosor">
          <Select
            value={String(b.weight)}
            onChange={(v) => u({ weight: +v })}
            options={[
              { value: "500", label: "Medium" },
              { value: "600", label: "Semibold" },
              { value: "700", label: "Bold" },
              { value: "800", label: "ExtraBold" },
            ]}
          />
        </Field>
      </div>
      <Field label="Altura de línea">
        <Select value={String(b.lineHeight)} onChange={(v) => u({ lineHeight: +v })} options={["1", "1.1", "1.2", "1.3", "1.4", "1.5"]} />
      </Field>
      <Field label="Espaciado de letras" hint="Separación entre caracteres. 0 = normal; negativo = más compacto.">
        <Slider value={b.letterSpacing ?? 0} onChange={(v) => u({ letterSpacing: v })} min={-2} max={10} step={0.5} suffix="px" />
      </Field>
      <Field label="Fuente" hint="Por defecto hereda la global. Las fuentes web caen a una segura en Outlook/Gmail.">
        <FontSelect value={b.font ?? ""} onChange={(v) => u({ font: v || undefined })} groups={BLOCK_FONT_PREVIEW_GROUPS} />
      </Field>
      <Field label="Color">
        <ColorField value={b.color} onChange={(v) => u({ color: v })} />
      </Field>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as HeadingBlock["align"] })} options={alignSeg} />
      </Field>
      <PanelDivider />
      <SectionLabel>Espaciado</SectionLabel>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function TextProps({ b, u }: { b: TextBlock; u: Updater<TextBlock> }) {
  return (
    <>
      <div style={{ padding: "10px 12px", background: UI.accentSoft, borderRadius: 10, fontSize: 11.5, color: UI.accent, display: "flex", gap: 8, lineHeight: 1.5, marginBottom: 16 }}>
        <Icon name="mouse-pointer-click" size={14} color={UI.accent} style={{ marginTop: 1 }} />
        <span>
          Haz <strong>doble clic</strong> en el texto del lienzo para editarlo y dar formato.
        </span>
      </div>
      <SectionLabel>Tipografía</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tamaño">
          <NumberInput value={b.fontSize} min={6} suffix="px" onChange={(v) => u({ fontSize: v })} />
        </Field>
        <Field label="Altura de línea">
          <Select value={String(b.lineHeight)} onChange={(v) => u({ lineHeight: +v })} options={["1", "1.2", "1.4", "1.5", "1.6", "1.8", "2"]} />
        </Field>
      </div>
      <Field label="Fuente" hint="Por defecto hereda la global. Las fuentes web caen a una segura en Outlook/Gmail.">
        <FontSelect value={b.font ?? ""} onChange={(v) => u({ font: v || undefined })} groups={BLOCK_FONT_PREVIEW_GROUPS} />
      </Field>
      <Field label="Color de texto">
        <ColorField value={b.color} onChange={(v) => u({ color: v })} />
      </Field>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as TextBlock["align"] })} options={alignSeg} />
      </Field>
      <PanelDivider />
      <SectionLabel>Espaciado</SectionLabel>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function ImageProps({ b, u, onOpenMedia }: { b: ImageBlock; u: Updater<ImageBlock>; onOpenMedia: (intent?: "block") => void }) {
  const unit: ImageSizeUnit = b.sizeUnit ?? (b.fullWidth ? "pct" : "px");
  const setUnit = (newUnit: ImageSizeUnit) => {
    if (newUnit === "pct") u({ sizeUnit: "pct", widthPct: b.widthPct ?? 100, fullWidth: (b.widthPct ?? 100) >= 100 });
    else u({ sizeUnit: "px", fullWidth: false });
  };
  return (
    <>
      <SectionLabel>Origen de la imagen</SectionLabel>
      <Field label="Imagen" hint="Elige de tu biblioteca o pega una URL.">
        <ImageField value={b.src} onChange={(v) => u({ src: v })} onPick={() => onOpenMedia("block")} />
      </Field>
      <Field label="Texto alternativo (alt)" hint="Para accesibilidad y clientes que bloquean imágenes">
        <TextInput placeholder="Describe la imagen" value={b.alt} onChange={(v) => u({ alt: v })} />
      </Field>
      {b.src && !b.alt.trim() ? (
        <div style={{ marginTop: -8, marginBottom: 16, padding: "8px 10px", background: "#FFFBEB", border: "1px solid " + C.amber400, borderRadius: 8, fontSize: 11.5, color: C.amber700, display: "flex", gap: 7, lineHeight: 1.5 }}>
          <Icon name="info" size={13} color={C.amber700} style={{ marginTop: 1 }} />
          <span>Añade un texto alternativo (accesibilidad).</span>
        </div>
      ) : null}
      <PanelDivider />
      <SectionLabel>Enlace</SectionLabel>
      <Field label="Acción al hacer clic (URL)">
        <TextInput placeholder="https://…" value={b.href} onChange={(v) => u({ href: v })} />
      </Field>
      <Field>
        <Toggle label="Abrir en nueva pestaña" value={b.newTab} onChange={(v) => u({ newTab: v })} />
      </Field>
      <PanelDivider />
      <SectionLabel>Tamaño y alineación</SectionLabel>
      <Field label="Unidad del tamaño">
        <Segmented
          full
          value={unit}
          onChange={(v) => setUnit(v as ImageSizeUnit)}
          options={[
            { value: "pct", label: "Porcentaje" },
            { value: "px", label: "Píxeles" },
          ]}
        />
      </Field>
      {unit === "pct" ? (
        <Field label="Tamaño de la imagen" hint="Relativo al ancho de la fila (columna). 100% = ancho completo.">
          <Slider value={b.widthPct ?? 100} min={10} max={100} suffix="%" onChange={(v) => u({ widthPct: v, sizeUnit: "pct", fullWidth: v >= 100 })} />
        </Field>
      ) : (
        <Field label="Tamaño de la imagen" hint="Ancho fijo en píxeles (máx. 800).">
          <NumberInput value={b.width} min={40} max={800} suffix="px" onChange={(v) => u({ width: v, sizeUnit: "px", fullWidth: false })} />
        </Field>
      )}
      <Field label="Alineación en la fila">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as ImageBlock["align"] })} options={alignSeg} />
      </Field>
      <PanelDivider />
      <SectionLabel>Forma y posición</SectionLabel>
      <Field label="Radio de esquinas">
        <Slider value={b.radius} onChange={(v) => u({ radius: v })} min={0} max={48} />
      </Field>
      <Field label="Desplazamiento (offset)" hint="Mueve la imagen para que sobresalga de la fila. Negativos = arriba / izquierda. No se aplica en Outlook/Gmail.">
        <OffsetField value={b.offset ?? { x: 0, y: 0 }} onChange={(v) => u({ offset: v })} />
      </Field>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function ButtonProps({ b, u }: { b: ButtonBlock; u: Updater<ButtonBlock> }) {
  const border = b.border || { style: "none" as const, width: 1, color: "#E5E5E5" };
  const setBorder = (patch: Partial<Border>) => u({ border: { ...border, ...patch } });
  return (
    <>
      <SectionLabel>Contenido</SectionLabel>
      <Field label="Texto del botón">
        <TextInput value={b.text} onChange={(v) => u({ text: v })} />
      </Field>
      <Field label="Enlace / URL">
        <TextInput placeholder="https://…" value={b.href} onChange={(v) => u({ href: v })} />
      </Field>
      <PanelDivider />
      <SectionLabel>Color</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Fondo">
          <ColorField value={b.bg} onChange={(v) => u({ bg: v })} />
        </Field>
        <Field label="Texto">
          <ColorField value={b.color} onChange={(v) => u({ color: v })} />
        </Field>
      </div>
      <PanelDivider />
      <SectionLabel>Tipografía</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tamaño">
          <NumberInput value={b.fontSize} min={10} max={32} suffix="px" onChange={(v) => u({ fontSize: v })} />
        </Field>
        <Field label="Grosor">
          <Select
            value={String(b.weight)}
            onChange={(v) => u({ weight: +v })}
            options={[
              { value: "400", label: "Regular" },
              { value: "600", label: "Semibold" },
              { value: "700", label: "Bold" },
            ]}
          />
        </Field>
      </div>
      <PanelDivider />
      <SectionLabel>Forma y diseño</SectionLabel>
      <Field label="Radio de borde" hint="0 = cuadrado · alto = píldora">
        <Slider value={b.radius} onChange={(v) => u({ radius: v })} min={0} max={40} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Padding vertical">
          <NumberInput value={b.padV} min={4} max={40} suffix="px" onChange={(v) => u({ padV: v })} />
        </Field>
        <Field label="Padding horizontal">
          <NumberInput value={b.padH} min={8} max={80} suffix="px" onChange={(v) => u({ padH: v })} />
        </Field>
      </div>
      <Field>
        <Toggle label="Ancho completo" value={b.fullWidth} onChange={(v) => u({ fullWidth: v })} />
      </Field>
      {!b.fullWidth && (
        <Field label="Alineación">
          <Segmented full value={b.align} onChange={(v) => u({ align: v as ButtonBlock["align"] })} options={alignSeg} />
        </Field>
      )}
      <PanelDivider />
      <SectionLabel>Borde</SectionLabel>
      <Field label="Estilo" hint="Útil para botones «fantasma» (fondo transparente + borde).">
        <Segmented
          full
          value={border.style}
          onChange={(v) => setBorder({ style: v as Border["style"] })}
          options={[
            { value: "none", label: "Ninguno" },
            { value: "solid", label: "Sólido" },
            { value: "dashed", label: "Discont." },
          ]}
        />
      </Field>
      {border.style !== "none" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
          <Field label="Grosor">
            <NumberInput value={border.width} min={1} max={12} suffix="px" onChange={(v) => setBorder({ width: v })} />
          </Field>
          <Field label="Color">
            <ColorField value={border.color} onChange={(v) => setBorder({ color: v })} />
          </Field>
        </div>
      )}
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function DividerProps({ b, u }: { b: DividerBlock; u: Updater<DividerBlock> }) {
  return (
    <>
      <SectionLabel>Línea</SectionLabel>
      <Field label="Grosor">
        <Slider value={b.thickness} onChange={(v) => u({ thickness: v })} min={1} max={12} />
      </Field>
      <Field label="Estilo">
        <Select
          value={b.style}
          onChange={(v) => u({ style: v as DividerBlock["style"] })}
          options={[
            { value: "solid", label: "Sólida" },
            { value: "dashed", label: "Guiones" },
            { value: "dotted", label: "Puntos" },
          ]}
        />
      </Field>
      <Field label="Color">
        <ColorField value={b.color} onChange={(v) => u({ color: v })} />
      </Field>
      <Field label="Ancho de la línea">
        <Slider value={b.width} onChange={(v) => u({ width: v })} min={10} max={100} suffix="%" />
      </Field>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as DividerBlock["align"] })} options={alignSeg} />
      </Field>
      <PanelDivider />
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function SpacerProps({ b, u }: { b: SpacerBlock; u: Updater<SpacerBlock> }) {
  return (
    <>
      <SectionLabel>Espaciador</SectionLabel>
      <Field label="Altura del espacio">
        <Slider value={b.height} onChange={(v) => u({ height: v })} min={10} max={150} />
      </Field>
    </>
  );
}

function SocialProps({ b, u }: { b: SocialBlock; u: Updater<SocialBlock> }) {
  const addNet = (net: string) => u({ networks: [...b.networks, { id: genId(), net, url: "#" }] });
  const [showAdd, setShowAdd] = useState(false);
  const available = Object.keys(SOCIAL_META);
  const styleOpts: Array<{ v: SocialStyle; l: string }> = [
    { v: "rounded-color", l: "Redondo color" },
    { v: "square-color", l: "Cuadrado color" },
    { v: "rounded-mono", l: "Redondo mono" },
    { v: "square-mono", l: "Cuadrado mono" },
  ];
  return (
    <>
      <SectionLabel>Redes activas</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {b.networks.map((n, i) => {
          const m = SOCIAL_META[n.net] || { color: C.navy700 };
          return (
            <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid " + UI.border, borderRadius: 8, padding: "6px 8px", background: UI.surface }}>
              <Icon name="grip-vertical" size={13} color={UI.textSubtle} />
              <span style={{ width: 24, height: 24, borderRadius: 6, background: m.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <SocialGlyph net={n.net} size={13} />
              </span>
              <input
                value={n.url}
                onChange={(e) => u({ networks: b.networks.map((x, xi) => (xi === i ? { ...x, url: e.target.value } : x)) })}
                placeholder="URL del perfil"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 12, color: UI.text, fontFamily: "inherit", minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => u({ networks: b.networks.filter((_, xi) => xi !== i) })}
                style={{ border: "none", background: "transparent", cursor: "pointer", color: UI.textSubtle, display: "flex", padding: 2 }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Btn variant="ghost" icon="plus" size="sm" style={{ width: "100%" }} onClick={() => setShowAdd(!showAdd)}>
          Añadir nueva red
        </Btn>
        {showAdd && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 6,
              background: UI.surface,
              border: "1px solid " + UI.border,
              borderRadius: 10,
              padding: 8,
              boxShadow: "0 12px 28px rgba(15,37,66,.18)",
              zIndex: 30,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {available.map((net) => {
              const m = SOCIAL_META[net];
              return (
                <button
                  type="button"
                  key={net}
                  onClick={() => {
                    addNet(net);
                    setShowAdd(false);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 7, border: "none", background: "transparent", cursor: "pointer", padding: "6px 8px", borderRadius: 7, fontFamily: "inherit" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = UI.surfaceAlt)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: 20, height: 20, borderRadius: 5, background: m.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <SocialGlyph net={net} size={11} />
                  </span>
                  <span style={{ fontSize: 12, color: UI.text }}>{m.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <PanelDivider />
      <SectionLabel>Estilo de iconos</SectionLabel>
      <Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {styleOpts.map((o) => (
            <button
              type="button"
              key={o.v}
              onClick={() => u({ style: o.v })}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: 10,
                borderRadius: 9,
                border: "1px solid " + (b.style === o.v ? UI.accent : UI.border),
                background: b.style === o.v ? UI.accentSoft : UI.surface,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ width: 22, height: 22, borderRadius: o.v.includes("rounded") ? "50%" : 5, background: o.v.includes("mono") ? C.navy900 : C.amber500 }} />
              <span style={{ fontSize: 10.5, fontWeight: 600, color: UI.textMuted }}>{o.l}</span>
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tamaño de iconos">
        <Slider value={b.size} onChange={(v) => u({ size: v })} min={24} max={48} />
      </Field>
      <Field label="Espaciado entre iconos">
        <Slider value={b.gap} onChange={(v) => u({ gap: v })} min={0} max={32} />
      </Field>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as SocialBlock["align"] })} options={alignSeg} />
      </Field>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function VideoProps({ b, u }: { b: VideoBlock; u: Updater<VideoBlock> }) {
  const overlayPosSeg = [
    { value: "top", label: "Arriba" },
    { value: "center", label: "Centro" },
    { value: "bottom", label: "Abajo" },
  ];
  // Fallbacks por si el bloque se guardó antes de tener estos campos.
  const fullWidth = b.fullWidth !== false;
  const showPlay = b.showPlay !== false;
  const hasOverlay = Boolean(b.overlayText || b.overlaySubtext);
  return (
    <>
      <SectionLabel>Video</SectionLabel>
      <Field label="URL del video (YouTube / Vimeo)">
        <TextInput placeholder="https://youtube.com/…" value={b.href} onChange={(v) => u({ href: v })} />
      </Field>
      <Field label="Miniatura (URL)" hint="Si se deja vacía, se genera automáticamente">
        <TextInput placeholder="https://…" value={b.thumb} onChange={(v) => u({ thumb: v })} />
      </Field>

      <PanelDivider />
      <SectionLabel>Dimensiones y forma</SectionLabel>
      <Field>
        <Toggle label="Ancho completo (responsive)" value={fullWidth} onChange={(v) => u({ fullWidth: v })} />
      </Field>
      {!fullWidth && (
        <Field label="Ancho máximo">
          <NumberInput value={b.width ?? 600} min={120} max={600} suffix="px" onChange={(v) => u({ width: v })} />
        </Field>
      )}
      <Field label="Alineación">
        <Segmented full value={b.align ?? "center"} onChange={(v) => u({ align: v as VideoBlock["align"] })} options={alignSeg} />
      </Field>
      <Field label="Radio de esquinas">
        <Slider value={b.radius ?? 8} onChange={(v) => u({ radius: v })} min={0} max={48} />
      </Field>

      <PanelDivider />
      <SectionLabel>Botón de play</SectionLabel>
      <Field>
        <Toggle label="Mostrar botón de play" value={showPlay} onChange={(v) => u({ showPlay: v })} />
      </Field>
      {showPlay && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Color del círculo">
              <ColorField value={b.playColor ?? "#FFFFFF"} onChange={(v) => u({ playColor: v })} />
            </Field>
            <Field label="Color de acento" hint="Triángulo / flecha">
              <ColorField value={b.playAccent ?? "#0F2542"} onChange={(v) => u({ playAccent: v })} />
            </Field>
          </div>
          <Field label="Tamaño">
            <NumberInput value={b.playSize ?? 64} min={32} max={120} suffix="px" onChange={(v) => u({ playSize: v })} />
          </Field>
          <Field label="Opacidad del círculo">
            <Slider value={b.playOpacity ?? 95} onChange={(v) => u({ playOpacity: v })} min={20} max={100} suffix="%" />
          </Field>
        </>
      )}

      <PanelDivider />
      <SectionLabel>Texto sobre la imagen</SectionLabel>
      <Field label="Título" hint="Déjalo vacío para no mostrar texto encima">
        <TextInput value={b.overlayText ?? ""} onChange={(v) => u({ overlayText: v })} />
      </Field>
      <Field label="Subtítulo">
        <TextInput value={b.overlaySubtext ?? ""} onChange={(v) => u({ overlaySubtext: v })} />
      </Field>
      {hasOverlay && (
        <>
          <Field label="Posición del texto">
            <Segmented
              full
              value={b.overlayPosition ?? "center"}
              onChange={(v) => u({ overlayPosition: v as VideoBlock["overlayPosition"] })}
              options={overlayPosSeg}
            />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Color del texto">
              <ColorField value={b.overlayColor ?? "#FFFFFF"} onChange={(v) => u({ overlayColor: v })} />
            </Field>
            <Field label="Fondo (scrim)">
              <ColorField value={b.overlayBg ?? "#0F2542"} onChange={(v) => u({ overlayBg: v })} />
            </Field>
          </div>
          <Field label="Opacidad del fondo">
            <Slider value={b.overlayOpacity ?? 35} onChange={(v) => u({ overlayOpacity: v })} min={0} max={90} suffix="%" />
          </Field>
        </>
      )}

      <PanelDivider />
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function MenuProps({ b, u }: { b: MenuBlock; u: Updater<MenuBlock> }) {
  return (
    <>
      <SectionLabel>Enlaces del menú</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {b.items.map((it, i) => (
          <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid " + UI.border, borderRadius: 8, padding: "6px 8px" }}>
            <input
              value={it.label}
              onChange={(e) => u({ items: b.items.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)) })}
              placeholder="Etiqueta"
              style={{ width: "42%", border: "none", outline: "none", fontSize: 12, color: UI.text, fontFamily: "inherit", fontWeight: 600 }}
            />
            <span style={{ color: UI.textSubtle }}>·</span>
            <input
              value={it.href}
              onChange={(e) => u({ items: b.items.map((x, xi) => (xi === i ? { ...x, href: e.target.value } : x)) })}
              placeholder="URL"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 12, color: UI.textMuted, fontFamily: "inherit", minWidth: 0 }}
            />
            <button
              type="button"
              onClick={() => u({ items: b.items.filter((_, xi) => xi !== i) })}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: UI.textSubtle, display: "flex", padding: 2 }}
            >
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
      <Btn variant="ghost" icon="plus" size="sm" style={{ width: "100%" }} onClick={() => u({ items: [...b.items, { id: genId(), label: "Enlace", href: "#" }] })}>
        Añadir enlace
      </Btn>
      <PanelDivider />
      <SectionLabel>Estilo</SectionLabel>
      <Field label="Color de texto">
        <ColorField value={b.color} onChange={(v) => u({ color: v })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tamaño">
          <NumberInput value={b.fontSize} min={10} max={24} suffix="px" onChange={(v) => u({ fontSize: v })} />
        </Field>
        <Field label="Separación">
          <NumberInput value={b.gap} min={4} max={48} suffix="px" onChange={(v) => u({ gap: v })} />
        </Field>
      </div>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as MenuBlock["align"] })} options={alignSeg} />
      </Field>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function TimerProps({ b, u }: { b: TimerBlock; u: Updater<TimerBlock> }) {
  return (
    <>
      <SectionLabel>Cuenta regresiva</SectionLabel>
      <Field label="Fecha y hora objetivo">
        <input type="datetime-local" value={b.target} onChange={(e) => u({ target: e.target.value })} onFocus={focusOn} onBlur={focusOff} style={{ ...inputBase }} />
      </Field>
      <Field>
        <Toggle label="Mostrar etiquetas (Días, Horas…)" value={b.showLabels} onChange={(v) => u({ showLabels: v })} />
      </Field>
      <PanelDivider />
      <SectionLabel>Estilo</SectionLabel>
      <Field label="Color de los dígitos">
        <ColorField value={b.color} onChange={(v) => u({ color: v })} />
      </Field>
      <Field label="Fondo de las cajas">
        <ColorField value={b.boxBg} onChange={(v) => u({ boxBg: v })} />
      </Field>
      <Field label="Color de etiquetas">
        <ColorField value={b.labelColor} onChange={(v) => u({ labelColor: v })} />
      </Field>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as TimerBlock["align"] })} options={alignSeg} />
      </Field>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function HtmlProps({ b, u }: { b: HtmlBlock; u: Updater<HtmlBlock> }) {
  return (
    <>
      <SectionLabel>HTML personalizado</SectionLabel>
      <Field hint="Inyecta código directo. Úsalo con cuidado.">
        <textarea
          value={b.code}
          onChange={(e) => u({ code: e.target.value })}
          onFocus={focusOn}
          onBlur={focusOff}
          style={{ ...inputBase, fontFamily: "'JetBrains Mono',monospace", fontSize: 12, minHeight: 180, resize: "vertical", lineHeight: 1.5 }}
        />
      </Field>
    </>
  );
}

function TitleImageProps({ b, u }: { b: TitleImageBlock; u: Updater<TitleImageBlock> }) {
  return (
    <>
      <div style={{ padding: "10px 12px", background: UI.accentSoft, borderRadius: 10, fontSize: 11.5, color: UI.accent, display: "flex", gap: 8, lineHeight: 1.5, marginBottom: 16 }}>
        <Icon name="info" size={14} color={UI.accent} style={{ marginTop: 1 }} />
        <span>
          El texto se envía como <strong>imagen</strong>: la fuente creativa se ve idéntica en todos los clientes (Gmail, Outlook). Ideal para títulos — no admite variables de personalización.
        </span>
      </div>
      <SectionLabel>Texto</SectionLabel>
      <Field hint="Usa Enter para varias líneas.">
        <textarea
          value={b.text}
          onChange={(e) => u({ text: e.target.value, imgW: undefined })}
          onFocus={focusOn}
          onBlur={focusOff}
          style={{ ...inputBase, minHeight: 64, resize: "vertical", lineHeight: 1.4 }}
        />
      </Field>
      <PanelDivider />
      <SectionLabel>Fuente creativa</SectionLabel>
      <Field>
        <FontSelect value={b.font} onChange={(v) => u({ font: v, imgW: undefined })} groups={IMAGE_FONT_PREVIEW_GROUPS} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Tamaño">
          <NumberInput value={b.fontSize} min={12} max={400} suffix="px" onChange={(v) => u({ fontSize: v, imgW: undefined })} />
        </Field>
        <Field label="Color">
          <ColorField value={b.color} onChange={(v) => u({ color: v })} />
        </Field>
      </div>
      <Field label="Alineación">
        <Segmented full value={b.align} onChange={(v) => u({ align: v as TitleImageBlock["align"] })} options={alignSeg} />
      </Field>
      <PanelDivider />
      <SectionLabel>Espaciado</SectionLabel>
      <Field label="Espaciado del bloque">
        <PaddingBox value={b.padding} onChange={(v) => u({ padding: v })} />
      </Field>
    </>
  );
}

function ColumnsBlockProps({ b, u, onPickImage }: { b: ColumnsBlock; u: Updater<ColumnsBlock>; onPickImage: () => void }) {
  const ov: ImageOverlay = b.bgOverlay ?? DEFAULT_OVERLAY;
  const setOverlay = (patch: Partial<ImageOverlay>) => u({ bgOverlay: { ...ov, ...patch } });
  // Cambia la cantidad de subcolumnas repartiendo el ancho en partes iguales y
  // conservando los bloques (los sobrantes se reubican en la última).
  const setCount = (n: number) => {
    const width = Math.round((100 / n) * 100) / 100;
    const next: SubColumn[] = [];
    for (let i = 0; i < n; i++) {
      const old = b.cols[i];
      next.push(old ? { ...old, width } : newSubColumn(width));
    }
    if (b.cols.length > n) {
      const orphan = b.cols.slice(n).flatMap((sc) => sc.blocks);
      next[n - 1] = { ...next[n - 1], blocks: [...next[n - 1].blocks, ...orphan] };
    }
    u({ cols: next });
  };
  const setSub = (i: number, patch: Partial<SubColumn>) =>
    u({ cols: b.cols.map((sc, idx) => (idx === i ? { ...sc, ...patch } : sc)) });
  const evenWidths = () => {
    const width = Math.round((100 / b.cols.length) * 100) / 100;
    u({ cols: b.cols.map((sc) => ({ ...sc, width })) });
  };
  return (
    <>
      <div style={{ padding: "10px 12px", background: UI.accentSoft, borderRadius: 10, fontSize: 11.5, color: UI.accent, display: "flex", gap: 8, lineHeight: 1.5, marginBottom: 16 }}>
        <Icon name="info" size={14} color={UI.accent} style={{ marginTop: 1 }} />
        <span>
          Añade bloques dentro de cada subcolumna con el botón <strong>+</strong> en el lienzo, o arrastrándolos desde el panel de bloques.
        </span>
      </div>
      <SectionLabel>Subcolumnas</SectionLabel>
      <Field label="Cantidad">
        <Segmented
          full
          value={String(b.cols.length)}
          onChange={(v) => setCount(+v)}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
            { value: "4", label: "4" },
          ]}
        />
      </Field>
      <Field label="Separación (gap)">
        <Slider value={b.gap} onChange={(v) => u({ gap: v })} min={0} max={48} suffix="px" />
      </Field>
      <Field>
        <Toggle label="Apilar en móvil" value={b.stackMobile} onChange={(v) => u({ stackMobile: v })} />
      </Field>
      <PanelDivider />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <SectionLabel>Ancho de cada subcolumna</SectionLabel>
        <button
          type="button"
          onClick={evenWidths}
          style={{ border: "1px solid " + UI.border, background: UI.surface, color: UI.accent, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
        >
          Igualar
        </button>
      </div>
      {b.cols.map((sc, i) => (
        <div key={sc.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10, alignItems: "end" }}>
          <Field label={`Col ${i + 1}`}>
            <NumberInput value={sc.width} min={5} max={95} suffix="%" onChange={(v) => setSub(i, { width: v })} />
          </Field>
          <Field label="Fondo">
            <ColorField value={sc.bg === "transparent" ? "#FFFFFF" : sc.bg} onChange={(v) => setSub(i, { bg: v })} />
          </Field>
          <Field label="V. align">
            <Select
              value={sc.valign}
              onChange={(v) => setSub(i, { valign: v as SubColumn["valign"] })}
              options={[
                { value: "top", label: "Arriba" },
                { value: "middle", label: "Centro" },
                { value: "bottom", label: "Abajo" },
              ]}
            />
          </Field>
        </div>
      ))}
      <PanelDivider />
      <SectionLabel>Fondo del bloque</SectionLabel>
      <Field label="Color o gradiente">
        <BgFillField
          type={b.bgType ?? "solid"}
          onType={(t) => u({ bgType: t, ...(t === "gradient" && !b.bgGradient ? { bgGradient: DEFAULT_GRADIENT } : {}) })}
          color={b.bg ?? "transparent"}
          onColor={(v) => u({ bg: v })}
          gradient={b.bgGradient ?? DEFAULT_GRADIENT}
          onGradient={(patch) => u({ bgGradient: { ...(b.bgGradient ?? DEFAULT_GRADIENT), ...patch } })}
        />
      </Field>
      <Field label="Imagen de fondo" hint="Se ve en Gmail, Apple Mail y la mayoría de clientes. En Outlook de escritorio se muestra el color de respaldo (define un color de fondo legible).">
        <ImageField
          value={b.bgImage ?? ""}
          repeat={b.bgRepeat}
          onChange={(v) => u({ bgImage: v })}
          onRepeat={(v) => u({ bgRepeat: v as ColumnsBlock["bgRepeat"] })}
          onPick={onPickImage}
        />
      </Field>
      {b.bgImage ? (
        <>
          <Field label="Ancho de la imagen" hint="0 = automático.">
            <NumberInput value={b.bgImageWidth ?? 0} min={0} step={10} suffix="px" onChange={(v) => u({ bgImageWidth: v })} />
          </Field>
          <Field label="Color del overlay" hint="Capa de color sobre la imagen (sube la opacidad para verlo).">
            <ColorField value={ov.color} onChange={(v) => setOverlay({ color: v })} />
          </Field>
          <Field label="Opacidad del overlay">
            <Slider value={ov.opacity} onChange={(v) => setOverlay({ opacity: v })} min={0} max={100} suffix="%" />
          </Field>
        </>
      ) : null}
      <PanelDivider />
      <SectionLabel>Forma</SectionLabel>
      <Field label="Radio de esquinas" hint="Redondea el fondo del bloque (la imagen superpuesta puede seguir sobresaliendo). Se ve en Gmail/Apple Mail; Outlook de escritorio lo muestra cuadrado.">
        <Slider value={b.radius ?? 0} onChange={(v) => u({ radius: v })} min={0} max={48} suffix="px" />
      </Field>
      <PanelDivider />
      <SectionLabel>Visibilidad por dispositivo</SectionLabel>
      <Field>
        <Toggle label="Ocultar en escritorio" value={!!b.hideDesktop} onChange={(v) => u({ hideDesktop: v })} />
      </Field>
      <Field>
        <Toggle label="Ocultar en móvil" value={!!b.hideMobile} onChange={(v) => u({ hideMobile: v })} />
      </Field>
    </>
  );
}

/* ── Block properties router ── */
function BlockProps({
  block,
  onUpdate,
  onBack,
  onOpenMedia,
}: {
  block: Block;
  onUpdate: Updater<Block>;
  onBack: () => void;
  onOpenMedia: (intent?: "block" | "row" | "col" | "content" | "colsBlock") => void;
}) {
  const def = BLOCK_DEFS.find((d) => d.type === block.type)!;
  return (
    <>
      <ContextHeader icon={def.icon} title={`Bloque · ${def.label}`} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {block.type === "heading" && <HeadingProps b={block} u={onUpdate as Updater<HeadingBlock>} />}
        {block.type === "text" && <TextProps b={block} u={onUpdate as Updater<TextBlock>} />}
        {block.type === "image" && <ImageProps b={block} u={onUpdate as Updater<ImageBlock>} onOpenMedia={onOpenMedia} />}
        {block.type === "button" && <ButtonProps b={block} u={onUpdate as Updater<ButtonBlock>} />}
        {block.type === "divider" && <DividerProps b={block} u={onUpdate as Updater<DividerBlock>} />}
        {block.type === "spacer" && <SpacerProps b={block} u={onUpdate as Updater<SpacerBlock>} />}
        {block.type === "social" && <SocialProps b={block} u={onUpdate as Updater<SocialBlock>} />}
        {block.type === "video" && <VideoProps b={block} u={onUpdate as Updater<VideoBlock>} />}
        {block.type === "menu" && <MenuProps b={block} u={onUpdate as Updater<MenuBlock>} />}
        {block.type === "timer" && <TimerProps b={block} u={onUpdate as Updater<TimerBlock>} />}
        {block.type === "html" && <HtmlProps b={block} u={onUpdate as Updater<HtmlBlock>} />}
        {block.type === "titleImage" && <TitleImageProps b={block} u={onUpdate as Updater<TitleImageBlock>} />}
        {block.type === "columns" && <ColumnsBlockProps b={block} u={onUpdate as Updater<ColumnsBlock>} onPickImage={() => onOpenMedia("colsBlock")} />}
        {block.type !== "spacer" && (
          <>
            <PanelDivider />
            <SectionLabel>Margen externo</SectionLabel>
            <Field hint="Espacio fuera del bloque, hacia los bloques contiguos.">
              <PaddingBox value={block.margin || { t: 0, b: 0, l: 0, r: 0 }} onChange={(v) => onUpdate({ margin: v } as Partial<Block>)} />
            </Field>
          </>
        )}
        {/* Radio de esquinas genérico (image/button/video tienen el suyo; columns se
            excluye para no recortar sub-bloques que sobresalen). */}
        {!["spacer", "image", "button", "video", "columns"].includes(block.type) && (
          <Field label="Radio de esquinas" hint="Redondea las esquinas del bloque (recorta su contenido y fondo).">
            <Slider value={block.radius ?? 0} onChange={(v) => onUpdate({ radius: v } as Partial<Block>)} min={0} max={48} suffix="px" />
          </Field>
        )}
      </div>
    </>
  );
}

/* ── Column properties ── */
/** Sección "Panel de contenido" (tarjeta de vidrio esmerilado) reutilizable por
 *  columnas y subcolumnas. La tarjeta es un scrim translúcido (HTML real) sobre
 *  la imagen de fondo; el desenfoque viene de «Desenfoque de la imagen». */
function ContentPanelSection({ panel, onChange }: { panel?: ContentPanel; onChange: (p: ContentPanel) => void }) {
  const p = panel ?? defaultContentPanel();
  const enabled = !!panel?.enabled;
  const set = (patch: Partial<ContentPanel>) => onChange({ ...p, ...patch });
  return (
    <>
      <SectionLabel>Panel de contenido</SectionLabel>
      <Field hint="Coloca el contenido sobre una tarjeta translúcida. Combínalo con el «Desenfoque de la imagen» de arriba para lograr el efecto vidrio esmerilado. En Outlook clásico degrada con elegancia (texto sobre la imagen), por eso conviene apoyar el contraste con el overlay.">
        <Toggle
          label="Activar tarjeta"
          value={enabled}
          onChange={(v) => (v ? onChange({ ...defaultContentPanel(), ...(panel ?? {}), enabled: true }) : set({ enabled: false }))}
        />
      </Field>
      {enabled && (
        <>
          <Field label="Color de la tarjeta">
            <ColorField value={p.color} onChange={(v) => set({ color: v })} />
          </Field>
          <Field label="Opacidad de la tarjeta" hint="0% = invisible, 100% = sólido.">
            <Slider value={p.opacity} onChange={(v) => set({ opacity: v })} min={0} max={100} suffix="%" />
          </Field>
          <Field label="Redondez de la tarjeta">
            <Slider value={p.radius} onChange={(v) => set({ radius: v })} min={0} max={40} suffix="px" />
          </Field>
          <Field label="Relleno interno de la tarjeta">
            <PaddingBox value={p.padding} onChange={(v) => set({ padding: v })} />
          </Field>
        </>
      )}
    </>
  );
}

function ColumnProps({
  col,
  index,
  total,
  onUpdate,
  onBack,
  onMove,
  onPickImage,
}: {
  col: Column;
  index: number;
  total: number;
  onUpdate: Updater<Column>;
  onBack: () => void;
  onMove: (dir: number) => void;
  onPickImage: () => void;
}) {
  const border = col.border || { style: "none" as const, width: 1, color: "#E5E5E5" };
  const setBorder = (patch: Partial<Column["border"]>) => onUpdate({ border: { ...border, ...patch } });
  const ov: ImageOverlay = col.bgOverlay ?? DEFAULT_OVERLAY;
  const setOverlay = (patch: Partial<ImageOverlay>) => onUpdate({ bgOverlay: { ...ov, ...patch } });
  return (
    <>
      <ContextHeader icon="columns-2" title={`Columna ${index + 1} de ${total}`} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {total > 1 && (
          <>
            <SectionLabel>Posición</SectionLabel>
            <Field hint="Reordena esta columna dentro de la fila.">
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" size="md" icon="arrow-left" disabled={index === 0} onClick={() => onMove(-1)} style={{ flex: 1 }}>
                  Mover izq.
                </Btn>
                <Btn variant="ghost" size="md" iconRight="arrow-right" disabled={index === total - 1} onClick={() => onMove(1)} style={{ flex: 1 }}>
                  Mover der.
                </Btn>
              </div>
            </Field>
            <PanelDivider />
          </>
        )}
        <SectionLabel>Fondo y alineación</SectionLabel>
        <Field label="Fondo de la columna">
          <BgFillField
            type={col.bgType ?? "solid"}
            onType={(t) => onUpdate({ bgType: t, ...(t === "gradient" && !col.bgGradient ? { bgGradient: DEFAULT_GRADIENT } : {}) })}
            color={col.bg}
            onColor={(v) => onUpdate({ bg: v })}
            colorOpacity={col.bgOpacity}
            onColorOpacity={(v) => onUpdate({ bgOpacity: v })}
            gradient={col.bgGradient ?? DEFAULT_GRADIENT}
            onGradient={(patch) => onUpdate({ bgGradient: { ...(col.bgGradient ?? DEFAULT_GRADIENT), ...patch } })}
          />
        </Field>
        <Field label="Imagen de fondo" hint="Se ve en Gmail, Apple Mail y la mayoría de clientes. En Outlook de escritorio se muestra el color de respaldo (define un color de fondo legible). Para una imagen de fondo a prueba de Outlook, ponla en la FILA con un alto mínimo.">
          <ImageField
            value={col.bgImage}
            repeat={col.bgRepeat}
            onChange={(v) => onUpdate({ bgImage: v })}
            onRepeat={(v) => onUpdate({ bgRepeat: v as Column["bgRepeat"] })}
            onPick={onPickImage}
          />
        </Field>
        {col.bgImage ? (
          <>
            <Field label="Ancho de la imagen de fondo" hint="0 = automático (se ajusta a la columna).">
              <NumberInput value={col.bgImageWidth ?? 0} min={0} step={10} suffix="px" onChange={(v) => onUpdate({ bgImageWidth: v })} />
            </Field>
            <Field label="Color del overlay" hint="Capa de color sobre la imagen (sube la opacidad para verlo).">
              <ColorField value={ov.color} onChange={(v) => setOverlay({ color: v })} />
            </Field>
            <Field label="Opacidad del overlay">
              <Slider value={ov.opacity} onChange={(v) => setOverlay({ opacity: v })} min={0} max={100} suffix="%" />
            </Field>
          </>
        ) : null}
        <Field label="Alineación vertical del contenido">
          <Segmented
            full
            value={col.valign || "top"}
            onChange={(v) => onUpdate({ valign: v as Column["valign"] })}
            options={[
              { value: "top", label: "Arriba" },
              { value: "middle", label: "Centro" },
              { value: "bottom", label: "Abajo" },
            ]}
          />
        </Field>
        <PanelDivider />
        <ContentPanelSection panel={col.panel} onChange={(panel) => onUpdate({ panel })} />
        <PanelDivider />
        <SectionLabel>Espaciado</SectionLabel>
        <Field label="Margen interno (padding)">
          <PaddingBox value={col.padding} onChange={(v) => onUpdate({ padding: v })} />
        </Field>
        <Field label="Margen externo">
          <PaddingBox value={col.margin || { t: 0, b: 0, l: 0, r: 0 }} onChange={(v) => onUpdate({ margin: v })} />
        </Field>
        <PanelDivider />
        <SectionLabel>Forma y posición</SectionLabel>
        <Field label="Desplazamiento (offset)" hint="Mueve la columna para que sobresalga. Negativos = arriba / izquierda. No se aplica en Outlook/Gmail.">
          <OffsetField value={col.offset ?? { x: 0, y: 0 }} onChange={(v) => onUpdate({ offset: v })} />
        </Field>
        <PanelDivider />
        <SectionLabel>Borde</SectionLabel>
        <Field label="Estilo">
          <Segmented
            full
            value={border.style}
            onChange={(v) => setBorder({ style: v as Column["border"]["style"] })}
            options={[
              { value: "none", label: "Ninguno" },
              { value: "solid", label: "Sólido" },
              { value: "dashed", label: "Discont." },
            ]}
          />
        </Field>
        {border.style !== "none" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
            <Field label="Grosor">
              <NumberInput value={border.width} min={1} max={12} suffix="px" onChange={(v) => setBorder({ width: v })} />
            </Field>
            <Field label="Color">
              <ColorField value={border.color} onChange={(v) => setBorder({ color: v })} />
            </Field>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Right panel shell ── */
export type RightPanelProps = {
  selection: Selection;
  rows: Row[];
  g: GlobalSettings;
  device: Device;
  onResetOverride: () => void;
  tab: string;
  setTab: (t: string) => void;
  onClearSelection: () => void;
  onUpdateRow: Updater<Row>;
  onUpdateCol: (colIndex: number, patch: Partial<Column>) => void;
  onUpdateSelectedBlock: Updater<Block>;
  onUpdateSelectedColumn: Updater<Column>;
  onChangeRowLayout: (rowId: string, structureId: string) => void;
  onMoveColumn: (dir: number) => void;
  picker: boolean;
  onClosePicker: () => void;
  onUpdateSelectedSubColumn: Updater<SubColumn>;
  onSetSelectedSubColumnWidth: (w: number) => void;
  onAddBlockToSelectedSubColumn: () => void;
  onDuplicateSelectedSubColumn: () => void;
  onDeleteSelectedSubColumn: () => void;
  onMoveSelectedSubColumn: (dir: number) => void;
  onUpdateGlobal: Updater<GlobalSettings>;
  onOpenMedia: (intent?: "block" | "row" | "col" | "content" | "colsBlock") => void;
  onDragStartBlock: (e: DragEvent, t: BlockType) => void;
  onDragStartStructure: (e: DragEvent, id: string) => void;
  onDragEnd: () => void;
  onClickBlock: (t: BlockType) => void;
  onClickStructure: (id: string) => void;
  onClickPreset: (id: string) => void;
};

/* ── Subcolumna (de un bloque "columns") ── */
function SubColumnProps({
  sub,
  index,
  total,
  onUpdate,
  onSetWidth,
  onAddBlock,
  onDuplicate,
  onDelete,
  onMove,
  onBack,
  onPickImage,
}: {
  sub: SubColumn;
  index: number;
  total: number;
  onUpdate: Updater<SubColumn>;
  onSetWidth: (w: number) => void;
  onAddBlock: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: number) => void;
  onBack: () => void;
  onPickImage: () => void;
}) {
  const border = sub.border || { style: "none" as const, width: 1, color: "#E5E5E5" };
  const setBorder = (patch: Partial<Border>) => onUpdate({ border: { ...border, ...patch } });
  const ov: ImageOverlay = sub.bgOverlay ?? DEFAULT_OVERLAY;
  const setOverlay = (patch: Partial<ImageOverlay>) => onUpdate({ bgOverlay: { ...ov, ...patch } });
  return (
    <>
      <ContextHeader icon="columns-2" title={`Subcolumna ${index + 1} de ${total}`} onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <Btn variant="primary" size="md" icon="plus" onClick={onAddBlock} style={{ width: "100%" }}>
          Añadir bloque
        </Btn>
        <PanelDivider />
        <SectionLabel>Subcolumna {index + 1} de {total}</SectionLabel>
        {total > 1 && (
          <Field hint="Reordena esta subcolumna.">
            <div style={{ display: "flex", gap: 8 }}>
              <Btn variant="ghost" size="md" icon="arrow-left" disabled={index === 0} onClick={() => onMove(-1)} style={{ flex: 1 }}>
                Mover izq.
              </Btn>
              <Btn variant="ghost" size="md" iconRight="arrow-right" disabled={index === total - 1} onClick={() => onMove(1)} style={{ flex: 1 }}>
                Mover der.
              </Btn>
            </div>
          </Field>
        )}
        <Field>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="ghost" size="md" icon="copy" onClick={onDuplicate} style={{ flex: 1 }}>
              Duplicar
            </Btn>
            <Btn variant="ghost" size="md" icon="trash-2" disabled={total <= 1} onClick={onDelete} style={{ flex: 1, color: C.red500 }}>
              Eliminar
            </Btn>
          </div>
        </Field>
        <Field label="Ancho" hint="Las demás subcolumnas se reajustan para sumar 100%.">
          <NumberInput value={Math.round(sub.width)} min={5} max={95} suffix="%" onChange={onSetWidth} />
        </Field>
        <PanelDivider />
        <SectionLabel>Fondo y alineación</SectionLabel>
        <Field label="Fondo de la subcolumna">
          <BgFillField
            type={sub.bgType ?? "solid"}
            onType={(t) => onUpdate({ bgType: t, ...(t === "gradient" && !sub.bgGradient ? { bgGradient: DEFAULT_GRADIENT } : {}) })}
            color={sub.bg}
            onColor={(v) => onUpdate({ bg: v })}
            colorOpacity={sub.bgOpacity}
            onColorOpacity={(v) => onUpdate({ bgOpacity: v })}
            gradient={sub.bgGradient ?? DEFAULT_GRADIENT}
            onGradient={(patch) => onUpdate({ bgGradient: { ...(sub.bgGradient ?? DEFAULT_GRADIENT), ...patch } })}
          />
        </Field>
        <Field label="Imagen de fondo">
          <ImageField
            value={sub.bgImage ?? ""}
            repeat={sub.bgRepeat}
            onChange={(v) => onUpdate({ bgImage: v })}
            onRepeat={(v) => onUpdate({ bgRepeat: v as SubColumn["bgRepeat"] })}
            onPick={onPickImage}
          />
        </Field>
        {sub.bgImage ? (
          <>
            <Field label="Color del overlay" hint="Capa de color sobre la imagen (sube la opacidad para verlo).">
              <ColorField value={ov.color} onChange={(v) => setOverlay({ color: v })} />
            </Field>
            <Field label="Opacidad del overlay" hint="0% = invisible, 100% = opaco.">
              <Slider value={ov.opacity} onChange={(v) => setOverlay({ opacity: v })} min={0} max={100} suffix="%" />
            </Field>
          </>
        ) : null}
        <Field label="Alineación vertical del contenido">
          <Segmented
            full
            value={sub.valign || "top"}
            onChange={(v) => onUpdate({ valign: v as SubColumn["valign"] })}
            options={[
              { value: "top", label: "Arriba" },
              { value: "middle", label: "Centro" },
              { value: "bottom", label: "Abajo" },
            ]}
          />
        </Field>
        <PanelDivider />
        <ContentPanelSection panel={sub.panel} onChange={(panel) => onUpdate({ panel })} />
        <PanelDivider />
        <SectionLabel>Espaciado</SectionLabel>
        <Field label="Margen interno (padding)">
          <PaddingBox value={sub.padding} onChange={(v) => onUpdate({ padding: v })} />
        </Field>
        <Field label="Margen externo" hint="Espacio fuera de la subcolumna. Se suma al «gap» (separación) del bloque de columnas.">
          <PaddingBox value={sub.margin || { t: 0, b: 0, l: 0, r: 0 }} onChange={(v) => onUpdate({ margin: v })} />
        </Field>
        <PanelDivider />
        <SectionLabel>Borde</SectionLabel>
        <Field label="Estilo">
          <Segmented
            full
            value={border.style}
            onChange={(v) => setBorder({ style: v as Border["style"] })}
            options={[
              { value: "none", label: "Ninguno" },
              { value: "solid", label: "Sólido" },
              { value: "dashed", label: "Discont." },
            ]}
          />
        </Field>
        {border.style !== "none" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Grosor">
              <NumberInput value={border.width} min={1} max={12} suffix="px" onChange={(v) => setBorder({ width: v })} />
            </Field>
            <Field label="Color">
              <ColorField value={border.color} onChange={(v) => setBorder({ color: v })} />
            </Field>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Paleta de bloques apuntando a una subcolumna (modo "picker") ── */
function BlockPickerPanel({
  onClickBlock,
  onDragStartBlock,
  onDragEnd,
  onBack,
}: {
  onClickBlock: (t: BlockType) => void;
  onDragStartBlock: (e: DragEvent, t: BlockType) => void;
  onDragEnd: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <ContextHeader icon="shapes" title="Añadir bloque" onBack={onBack} />
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <SectionLabel>Elige un bloque para la subcolumna</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {BLOCK_DEFS.map((def) => (
            <BlockCard key={def.type} def={def} onDragStart={(e) => onDragStartBlock(e, def.type)} onDragEnd={onDragEnd} onClick={() => onClickBlock(def.type)} />
          ))}
        </div>
        <div style={{ marginTop: 16, padding: "10px 12px", background: UI.accentSoft, borderRadius: 10, fontSize: 11.5, color: UI.accent, display: "flex", gap: 8, lineHeight: 1.5 }}>
          <Icon name="info" size={14} color={UI.accent} style={{ marginTop: 1 }} />
          <span>Haz clic en un bloque para añadirlo a la subcolumna, o arrástralo al lienzo.</span>
        </div>
      </div>
    </>
  );
}

const sidebarStyle: CSSProperties = {
  width: 316,
  flexShrink: 0,
  background: UI.surface,
  borderLeft: "1px solid " + UI.border,
  display: "flex",
  flexDirection: "column",
  height: "100%",
};

export function RightPanel(props: RightPanelProps) {
  const { selection, rows, device } = props;
  let body: React.ReactNode = null;
  // Entidad seleccionada SIN resolver — para el banner de override por vista.
  let rawSelected: { rsp?: Responsive } | null = null;
  // Despacha un patch al handler de la selección activa (para el toggle "ocultar").
  const dispatchSelectedPatch = (patch: Record<string, unknown>) => {
    if (selection.kind === "block") props.onUpdateSelectedBlock(patch as Partial<Block>);
    else if (selection.kind === "column") props.onUpdateSelectedColumn(patch as Partial<Column>);
    else if (selection.kind === "subcolumn") props.onUpdateSelectedSubColumn(patch as Partial<SubColumn>);
    else if (selection.kind === "row") props.onUpdateRow(patch as Partial<Row>);
  };

  // El picker (paleta de bloques apuntando a una subcolumna) tiene prioridad.
  if (props.picker) {
    body = (
      <BlockPickerPanel
        onClickBlock={props.onClickBlock}
        onDragStartBlock={props.onDragStartBlock}
        onDragEnd={props.onDragEnd}
        onBack={props.onClosePicker}
      />
    );
  } else if (selection.kind === "subcolumn") {
    const row = rows.find((r) => r.id === selection.rowId);
    const colBlocks = row?.cols[selection.colIndex]?.blocks;
    const sub = colBlocks ? findSubColumn(colBlocks, selection.parentId, selection.subColId) : null;
    const parent = colBlocks ? findBlockTree(colBlocks, selection.parentId) : null;
    const total = parent && parent.type === "columns" ? parent.cols.length : 1;
    const idx = parent && parent.type === "columns" ? parent.cols.findIndex((s) => s.id === selection.subColId) : 0;
    rawSelected = sub;
    body = sub ? (
      <SubColumnProps
        sub={resolveForDevice(sub, device)}
        index={idx < 0 ? 0 : idx}
        total={total}
        onUpdate={props.onUpdateSelectedSubColumn}
        onSetWidth={props.onSetSelectedSubColumnWidth}
        onAddBlock={props.onAddBlockToSelectedSubColumn}
        onDuplicate={props.onDuplicateSelectedSubColumn}
        onDelete={props.onDeleteSelectedSubColumn}
        onMove={props.onMoveSelectedSubColumn}
        onBack={props.onClearSelection}
        onPickImage={() => props.onOpenMedia("col")}
      />
    ) : null;
  } else if (selection.kind === "row") {
    const row = rows.find((r) => r.id === selection.rowId);
    rawSelected = row ?? null;
    body = row ? (
      <RowProps
        row={resolveForDevice(row, device)}
        onUpdate={props.onUpdateRow}
        onUpdateCol={props.onUpdateCol}
        onBack={props.onClearSelection}
        onChangeRowLayout={props.onChangeRowLayout}
        onPickImage={() => props.onOpenMedia("row")}
      />
    ) : null;
  } else if (selection.kind === "column") {
    const row = rows.find((r) => r.id === selection.rowId);
    const col = row?.cols[selection.colIndex];
    rawSelected = col ?? null;
    body = col ? (
      <ColumnProps
        col={resolveForDevice(col, device)}
        index={selection.colIndex}
        total={row!.cols.length}
        onUpdate={props.onUpdateSelectedColumn}
        onMove={props.onMoveColumn}
        onPickImage={() => props.onOpenMedia("col")}
        onBack={props.onClearSelection}
      />
    ) : null;
  } else if (selection.kind === "block") {
    const row = rows.find((r) => r.id === selection.rowId);
    // Búsqueda recursiva: el bloque puede estar dentro de una subcolumna de un
    // bloque "columns" (columnas anidadas). Un `.find` plano no lo encontraría.
    const colBlocks = row?.cols[selection.colIndex]?.blocks;
    const block = colBlocks ? findBlockTree(colBlocks, selection.blockId) : null;
    rawSelected = block;
    body = block ? (
      <BlockProps block={resolveForDevice(block, device)} onUpdate={props.onUpdateSelectedBlock} onBack={props.onClearSelection} onOpenMedia={props.onOpenMedia} />
    ) : null;
  }

  return (
    <aside style={sidebarStyle}>
      {device !== "desktop" && rawSelected && body && (
        <div style={{ padding: "10px 12px", borderBottom: "1px solid " + UI.border, background: "#FFFBEB", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: C.amber700 }}>
            <Icon name={device === "tablet" ? "tablet" : "smartphone"} size={13} />
            {device === "tablet" ? "Editas la vista tableta · solo afecta aquí" : "Editas la vista móvil · solo afecta aquí"}
          </div>
          <Toggle
            label="Ocultar en esta vista"
            value={resolvedHidden(rawSelected, device)}
            onChange={(v) => dispatchSelectedPatch({ hidden: v })}
          />
          <Btn variant="ghost" size="sm" icon="undo-2" disabled={!hasDeviceOverride(rawSelected, device)} onClick={props.onResetOverride} style={{ width: "100%" }}>
            Restablecer a escritorio
          </Btn>
        </div>
      )}
      {body || (
        <TabsPanel
          tab={props.tab}
          setTab={props.setTab}
          g={props.g}
          onUpdateGlobal={props.onUpdateGlobal}
          onPickGlobalImage={() => props.onOpenMedia("content")}
          onDragStartBlock={props.onDragStartBlock}
          onDragStartStructure={props.onDragStartStructure}
          onDragEnd={props.onDragEnd}
          onClickBlock={props.onClickBlock}
          onClickStructure={props.onClickStructure}
          onClickPreset={props.onClickPreset}
        />
      )}
    </aside>
  );
}
