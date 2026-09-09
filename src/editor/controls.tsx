/* ============================================================
   @begraffic/email/editor · controls.tsx
   Form-control primitives used across the property panel
   ============================================================ */
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";
import { C } from "./constants";
import { UI } from "./theme";
import { clampNum } from "./defaults";
import { Icon } from "./Icon";
import type { Corners, Sides } from "./types";

export const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: UI.textMuted,
  letterSpacing: ".02em",
  display: "block",
  marginBottom: 6,
};

export const inputBase: CSSProperties = {
  width: "100%",
  fontFamily: "inherit",
  fontSize: 13,
  color: UI.text,
  background: UI.surface,
  border: "1px solid " + UI.border,
  borderRadius: 8,
  padding: "8px 10px",
  outline: "none",
  transition: "border-color 150ms, box-shadow 150ms",
};

type FocusEl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
export const focusOn = (e: FocusEvent<FocusEl>) => {
  e.currentTarget.style.borderColor = UI.accent;
  e.currentTarget.style.boxShadow = "0 0 0 3px " + UI.accentSoft;
};
export const focusOff = (e: FocusEvent<FocusEl>) => {
  e.currentTarget.style.borderColor = UI.border;
  e.currentTarget.style.boxShadow = "none";
};

const stepBtn: CSSProperties = {
  border: "none",
  background: UI.surfaceAlt,
  color: UI.textMuted,
  cursor: "pointer",
  width: 22,
  height: 17,
  fontSize: 7,
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
};

export function Field({
  label,
  htmlFor,
  children,
  hint,
  style,
}: {
  label?: string;
  /** Id del control al que etiqueta. Opcional: sin él el <label> es decorativo. */
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0, ...style }}>
      {label && (
        <label htmlFor={htmlFor} style={fieldLabel}>
          {label}
        </label>
      )}
      {children}
      {hint && <div style={{ fontSize: 11, color: UI.textSubtle, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  mono,
  style,
  id,
  type = "text",
  autoFocus,
  onKeyDown,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  style?: CSSProperties;
  /** Para asociarlo a un <label htmlFor> (ver `Field`). */
  id?: string;
  type?: "text" | "url" | "email" | "tel";
  autoFocus?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <input
      id={id}
      type={type}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={focusOn}
      onBlur={focusOff}
      style={{
        ...inputBase,
        fontFamily: mono ? "'JetBrains Mono',monospace" : "inherit",
        fontSize: mono ? 12 : 13,
        ...style,
      }}
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid " + UI.border,
        borderRadius: 8,
        overflow: "hidden",
        background: UI.surface,
        minWidth: 0,
      }}
    >
      <input
        type="number"
        className="ee-num"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(clampNum(+e.target.value, min, max))}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: 13,
          color: UI.text,
          padding: "8px 10px",
          width: "100%",
          background: "transparent",
        }}
      />
      {suffix && (
        <span
          style={{
            fontSize: 11,
            color: UI.textSubtle,
            padding: "0 10px",
            borderLeft: "1px solid " + UI.border,
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
          }}
        >
          {suffix}
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid " + UI.border }}>
        <button type="button" onClick={() => onChange(clampNum(+value + step, min, max))} style={stepBtn}>
          ▲
        </button>
        <button
          type="button"
          onClick={() => onChange(clampNum(+value - step, min, max))}
          style={{ ...stepBtn, borderTop: "1px solid " + UI.border }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = "px",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(+e.target.value)}
        style={{ flex: 1, accentColor: UI.accent, height: 4 }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: UI.text,
          minWidth: 46,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        {suffix}
      </span>
    </div>
  );
}

export type Option = { value: string; label?: string };
export type OptGroup = { label: string; options: Array<Option | string> };
const renderOption = (o: Option | string) => {
  const val = typeof o === "string" ? o : o.value;
  const label = typeof o === "string" ? o : o.label ?? o.value;
  return (
    <option key={val} value={val}>
      {label}
    </option>
  );
};
export function Select({
  value,
  onChange,
  options,
  groups,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: Array<Option | string>;
  /** Si se pasa, la lista se renderiza agrupada con <optgroup> (ignora `options`). */
  groups?: OptGroup[];
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={focusOn}
        onBlur={focusOff}
        style={{ ...inputBase, appearance: "none", cursor: "pointer", paddingRight: 34 }}
      >
        {groups
          ? groups.map((gr) => (
              <optgroup key={gr.label} label={gr.label}>
                {gr.options.map(renderOption)}
              </optgroup>
            ))
          : (options ?? []).map(renderOption)}
      </select>
      <span
        style={{
          position: "absolute",
          right: 11,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: UI.textSubtle,
          display: "flex",
        }}
      >
        <Icon name="chevron-down" size={15} />
      </span>
    </div>
  );
}

/* ── Font picker con vista previa ──
   Selector personalizado (no <select> nativo: en macOS los <option> no respetan
   `font-family`). Cada opción se muestra renderizada con SU tipografía para
   elegir de un vistazo. `css` por opción = familia CSS de la vista previa. */
export type FontOption = { value: string; label: string; css?: string };
export type FontOptGroup = { label: string; options: FontOption[] };

export function FontSelect({
  value,
  onChange,
  groups,
  placeholder = "Seleccionar…",
}: {
  value: string;
  onChange: (v: string) => void;
  groups: FontOptGroup[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = useMemo(() => {
    for (const g of groups) for (const o of g.options) if (o.value === value) return o;
    return undefined;
  }, [groups, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          ...inputBase,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontFamily: current?.css,
            fontSize: 15,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: current ? UI.text : UI.textSubtle,
          }}
        >
          {current?.label ?? placeholder}
        </span>
        <Icon name="chevron-down" size={15} color={UI.textSubtle} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 80,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            maxHeight: 320,
            overflowY: "auto",
            background: UI.surface,
            border: "1px solid " + UI.border,
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(15,37,66,.18)",
            padding: 4,
          }}
        >
          {groups.map((gr) => (
            <div key={gr.label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: UI.textSubtle,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  padding: "7px 9px 3px",
                }}
              >
                {gr.label}
              </div>
              {gr.options.map((o) => {
                const sel = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: sel ? UI.accentSoft : "transparent",
                      color: UI.text,
                      padding: "8px 9px",
                      borderRadius: 7,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      if (!sel) e.currentTarget.style.background = UI.surfaceAlt;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = sel ? UI.accentSoft : "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontFamily: o.css,
                        fontSize: 16,
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.label}
                    </span>
                    {sel && <Icon name="check" size={14} color={UI.accent} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ColorField({
  value,
  onChange,
  allowEmpty,
}: {
  value?: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}) {
  const swatch = value && value !== "transparent" ? value : "#ffffff";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        border: "1px solid " + UI.border,
        borderRadius: 8,
        padding: "5px 8px 5px 6px",
        background: UI.surface,
        minWidth: 0,
      }}
    >
      <label
        style={{
          width: 26,
          height: 26,
          borderRadius: 6,
          border: "1px solid " + UI.border,
          background:
            value === "transparent" || !value
              ? "repeating-conic-gradient(#e2e2e2 0% 25%, #fff 0% 50%) 50%/8px 8px"
              : swatch,
          cursor: "pointer",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <input
          type="color"
          value={swatch}
          onChange={(e) => onChange(e.target.value)}
          style={{ opacity: 0, width: "100%", height: "100%", cursor: "pointer" }}
        />
      </label>
      <input
        value={value ?? ""}
        placeholder="transparent"
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          fontFamily: "'JetBrains Mono',monospace",
          fontSize: 12,
          color: UI.text,
          background: "transparent",
          textTransform: "lowercase",
          minWidth: 0,
        }}
      />
      {allowEmpty && value && value !== "transparent" && (
        <button
          type="button"
          onClick={() => onChange("transparent")}
          title="Quitar color"
          style={{ border: "none", background: "transparent", cursor: "pointer", color: UI.textSubtle, display: "flex", padding: 2 }}
        >
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}

export type SegOption = { value: string; label?: string; icon?: string; title?: string };
export function Segmented({
  value,
  onChange,
  options,
  full,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SegOption[];
  full?: boolean;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: UI.surfaceAlt,
        borderRadius: 8,
        padding: 3,
        gap: 2,
        width: full ? "100%" : "auto",
      }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            type="button"
            key={o.value}
            onClick={() => onChange(o.value)}
            title={o.title}
            style={{
              flex: full ? 1 : "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              border: "none",
              cursor: "pointer",
              borderRadius: 6,
              padding: o.icon && !o.label ? "6px 9px" : "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              background: active ? UI.surface : "transparent",
              color: active ? UI.accent : UI.textMuted,
              boxShadow: active ? "0 1px 2px rgba(15,37,66,.12)" : "none",
              transition: "all 150ms",
            }}
          >
            {o.icon && <Icon name={o.icon} size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      {label && <span style={{ fontSize: 13, color: UI.text, fontWeight: 500 }}>{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        style={{
          width: 40,
          height: 23,
          borderRadius: 9999,
          border: "none",
          cursor: "pointer",
          position: "relative",
          background: value ? C.green500 : UI.borderStrong,
          transition: "background 200ms",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2.5,
            left: value ? 20 : 2.5,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: UI.surface,
            boxShadow: "0 1px 2px rgba(0,0,0,.25)",
            transition: "left 200ms",
          }}
        />
      </button>
    </div>
  );
}

export function PaddingBox({
  value,
  onChange,
  max = 200,
}: {
  value: Sides;
  onChange: (v: Sides) => void;
  max?: number;
}) {
  const [linked, setLinked] = useState(
    value.t === value.b && value.b === value.l && value.l === value.r,
  );
  const set = (side: keyof Sides, v: number | string) => {
    const nv = clampNum(+v, 0, max);
    if (linked) onChange({ t: nv, b: nv, l: nv, r: nv });
    else onChange({ ...value, [side]: nv });
  };
  const cell = (side: keyof Sides, icon: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid " + UI.border,
        borderRadius: 7,
        background: UI.surface,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", paddingLeft: 7, color: UI.textSubtle }}>
        <Icon name={icon} size={13} />
      </span>
      <input
        type="number"
        className="ee-num"
        min={0}
        value={value[side]}
        onChange={(e) => set(side, e.target.value)}
        style={{
          width: "100%",
          minWidth: 0,
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: 12,
          color: UI.text,
          background: "transparent",
          padding: "6px 4px 6px 6px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid " + UI.border, flexShrink: 0 }}>
        <button type="button" onClick={() => set(side, +value[side] + 1)} style={stepBtn}>
          ▲
        </button>
        <button
          type="button"
          onClick={() => set(side, +value[side] - 1)}
          style={{ ...stepBtn, borderTop: "1px solid " + UI.border }}
        >
          ▼
        </button>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        {cell("t", "arrow-up-to-line")}
        {cell("b", "arrow-down-to-line")}
        {cell("l", "arrow-left-to-line")}
        {cell("r", "arrow-right-to-line")}
      </div>
      <button
        type="button"
        onClick={() => setLinked(!linked)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: linked ? UI.accent : UI.textSubtle,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        <Icon name={linked ? "link" : "unlink"} size={12} />{" "}
        {linked ? "Lados vinculados" : "Lados independientes"}
      </button>
    </div>
  );
}

export function CornerRadiusBox({
  value,
  onChange,
  max = 80,
}: {
  value: Corners;
  onChange: (v: Corners) => void;
  max?: number;
}) {
  const [linked, setLinked] = useState(
    value.tl === value.tr && value.tr === value.br && value.br === value.bl,
  );
  const set = (corner: keyof Corners, v: number | string) => {
    const nv = clampNum(+v, 0, max);
    if (linked) onChange({ tl: nv, tr: nv, br: nv, bl: nv });
    else onChange({ ...value, [corner]: nv });
  };
  const cell = (corner: keyof Corners, arrow: string) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        border: "1px solid " + UI.border,
        borderRadius: 7,
        background: UI.surface,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", paddingLeft: 8, color: UI.textSubtle, fontSize: 13, fontWeight: 700, lineHeight: 1 }}>
        {arrow}
      </span>
      <input
        type="number"
        className="ee-num"
        min={0}
        value={value[corner]}
        onChange={(e) => set(corner, e.target.value)}
        style={{
          width: "100%",
          minWidth: 0,
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          fontSize: 12,
          color: UI.text,
          background: "transparent",
          padding: "6px 4px 6px 6px",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", borderLeft: "1px solid " + UI.border, flexShrink: 0 }}>
        <button type="button" onClick={() => set(corner, +value[corner] + 1)} style={stepBtn}>
          ▲
        </button>
        <button
          type="button"
          onClick={() => set(corner, +value[corner] - 1)}
          style={{ ...stepBtn, borderTop: "1px solid " + UI.border }}
        >
          ▼
        </button>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
        {cell("tl", "↖")}
        {cell("tr", "↗")}
        {cell("bl", "↙")}
        {cell("br", "↘")}
      </div>
      <button
        type="button"
        onClick={() => setLinked(!linked)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          color: linked ? UI.accent : UI.textSubtle,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "inherit",
          padding: 0,
        }}
      >
        <Icon name={linked ? "link" : "unlink"} size={12} />{" "}
        {linked ? "Esquinas vinculadas" : "Esquinas independientes"}
      </button>
    </div>
  );
}

export const PanelDivider = () => (
  <div style={{ height: 1, background: UI.borderSubtle, margin: "4px 0 16px" }} />
);

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: ".07em",
      textTransform: "uppercase",
      color: UI.textSubtle,
      margin: "2px 0 12px",
    }}
  >
    {children}
  </div>
);

/* ── Buttons ── */
type BtnVariant = "primary" | "accent" | "ghost" | "subtle" | "danger";
type BtnSize = "xs" | "sm" | "md" | "lg";

export function Btn({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  children,
  onClick,
  disabled,
  title,
  style,
}: {
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: string;
  iconRight?: string;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const sz: Record<BtnSize, CSSProperties> = {
    xs: { fontSize: 11, padding: "5px 9px", borderRadius: 6, gap: 5 },
    sm: { fontSize: 12, padding: "6px 11px", borderRadius: 7, gap: 6 },
    md: { fontSize: 13, padding: "8px 14px", borderRadius: 8, gap: 6 },
    lg: { fontSize: 14, padding: "10px 18px", borderRadius: 8, gap: 7 },
  };
  const v: Record<BtnVariant, CSSProperties> = {
    primary: { background: UI.accent, color: "#fff", border: "1px solid " + UI.accent },
    accent: { background: C.amber500, color: C.amberDark, border: "1px solid " + C.amber500 },
    ghost: { background: UI.surface, color: UI.accent, border: "1px solid " + UI.border },
    subtle: { background: UI.surfaceAlt, color: UI.text, border: "1px solid transparent" },
    danger: { background: C.red500, color: "#fff", border: "1px solid " + C.red500 },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        ...sz[size],
        ...v[variant],
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "inherit",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.45 : 1,
        transition: "opacity 150ms, transform 80ms",
        ...style,
      }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.opacity = ".85")}
      onMouseLeave={(e) => !disabled && (e.currentTarget.style.opacity = "1")}
    >
      {icon && <Icon name={icon} size={size === "xs" ? 12 : 14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "xs" ? 12 : 14} />}
    </button>
  );
}

export function IconBtn({
  name,
  onClick,
  active,
  disabled,
  title,
  size = 16,
  danger,
  style,
}: {
  name: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  size?: number;
  danger?: boolean;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        border: "1px solid " + (active ? UI.border : "transparent"),
        background: active ? UI.accentSoft : "transparent",
        color: danger ? C.red500 : disabled ? UI.textSubtle : UI.textMuted,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 150ms",
        ...style,
      }}
      onMouseEnter={(e) => !disabled && !active && (e.currentTarget.style.background = UI.surfaceAlt)}
      onMouseLeave={(e) => !disabled && !active && (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={name} size={size} />
    </button>
  );
}
