/* ============================================================
   BeCRM — Email Builder · style/responsive.ts
   Per-device overrides (tablet/mobile) over a desktop base — UNIFIED for the
   editor and the server render so they can never diverge.

   Two pure read/write seams:
   - resolveForDevice(entity, device): the EFFECTIVE entity for a view (read).
   - routePatch(entity, device, patch): route a panel patch to the base or to
     the rsp[device] layer per the whitelist (write).

   Plus the send-time @media CSS generator: the email is one HTML; per-device
   differences are expressed with per-element classes (ee-{id}) + @media rules
   with !important. Outlook ignores @media → keeps the desktop inline (accepted
   fallback). Cascade: tablet @media(max-width:768px) then mobile (max-width:600px)
   (mobile last → wins ≤600).
   ============================================================ */
import { OVERRIDE_KEYS } from "../model/constants";
import type { Block, Column, Device, ImageBlock, OverrideDevice, Responsive, Row, Sides, SubColumn } from "../model/types";
import { imageWidthCss } from "./engine";

const OVERRIDE_SET = new Set<string>(OVERRIDE_KEYS);
/** Keys that may never live in a layer (identity/structure). */
const PROTECTED_KEYS = new Set<string>(["id", "type", "rsp"]);
/** Per-type keys that must always route to the BASE even in tablet/mobile
 *  views. titleImage: the PNG is always generated from the BASE fontSize (the
 *  send render has no per-device title image), so a device-layer fontSize
 *  would be dead data — and it corrupts imgW when the canvas measures the
 *  device-sized PNG back into the base. */
const TYPE_BASE_ONLY: Record<string, ReadonlySet<string>> = { titleImage: new Set(["fontSize"]) };

/* ── resolve / route (editor + render read/write) ── */

function sanitizeLayer(layer: unknown): Record<string, unknown> | null {
  if (!layer || typeof layer !== "object") return null;
  const out: Record<string, unknown> = {};
  let any = false;
  for (const [k, v] of Object.entries(layer as Record<string, unknown>)) {
    if (PROTECTED_KEYS.has(k) || !OVERRIDE_SET.has(k)) continue;
    out[k] = v;
    any = true;
  }
  return any ? out : null;
}

function layersFor(rsp: Responsive | undefined, device: Device): Array<Record<string, unknown>> {
  if (device === "desktop" || !rsp) return [];
  const out: Array<Record<string, unknown>> = [];
  const t = sanitizeLayer(rsp.tablet);
  if (t) out.push(t);
  if (device === "mobile") {
    const m = sanitizeLayer(rsp.mobile);
    if (m) out.push(m);
  }
  return out;
}

/** EFFECTIVE entity for a view: base with override layers applied. Desktop
 *  returns the same reference (zero cost). Pure: never mutates. */
export function resolveForDevice<T extends { rsp?: Responsive }>(entity: T, device: Device): T {
  if (device === "desktop") return entity;
  const layers = layersFor(entity.rsp, device);
  if (!layers.length) return entity;
  const out: Record<string, unknown> = { ...(entity as Record<string, unknown>) };
  for (const layer of layers) for (const [k, v] of Object.entries(layer)) out[k] = v;
  return out as T;
}

export function resolvedHidden(entity: { rsp?: Responsive }, device: Device): boolean {
  if (device === "desktop") return false;
  for (const layer of layersFor(entity.rsp, device)) {
    if ("hidden" in layer) return !!layer.hidden;
  }
  return false;
}

/** Route a panel patch: desktop edits the base; tablet/mobile split style keys
 *  into rsp[device] and leave the rest on the base. */
export function routePatch<T extends { rsp?: Responsive }>(
  entity: T | null | undefined,
  device: Device,
  patch: Partial<T>,
): Partial<T> {
  if (device === "desktop" || !entity) return patch;
  const base: Record<string, unknown> = {};
  const style: Record<string, unknown> = {};
  let hasStyle = false;
  const baseOnly = TYPE_BASE_ONLY[String((entity as { type?: string }).type ?? "")];
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (OVERRIDE_SET.has(k) && !PROTECTED_KEYS.has(k) && !baseOnly?.has(k)) {
      style[k] = v;
      hasStyle = true;
    } else {
      base[k] = v;
    }
  }
  if (!hasStyle) return base as Partial<T>;
  const prevRsp = (entity.rsp ?? {}) as Responsive;
  const prevLayer = (prevRsp[device as OverrideDevice] ?? {}) as Record<string, unknown>;
  const nextRsp: Responsive = { ...prevRsp, [device as OverrideDevice]: { ...prevLayer, ...style } };
  return { ...base, rsp: nextRsp } as Partial<T>;
}

export function hasDeviceOverride(entity: { rsp?: Responsive } | null | undefined, device: Device): boolean {
  if (!entity || device === "desktop") return false;
  return !!sanitizeLayer(entity.rsp?.[device as OverrideDevice]);
}

export function clearDeviceOverridePatch<T extends { rsp?: Responsive }>(entity: T, device: Device): Partial<T> {
  if (device === "desktop" || !entity.rsp) return {};
  const nextRsp: Responsive = { ...entity.rsp };
  delete nextRsp[device as OverrideDevice];
  const empty = !sanitizeLayer(nextRsp.tablet) && !sanitizeLayer(nextRsp.mobile);
  return { rsp: empty ? undefined : nextRsp } as Partial<T>;
}

/* ── @media CSS generation (send HTML) ── */

type DeviceOverride = Record<string, unknown>;
/** CSS declarations keyed by selector suffix ("" = self; " a"/" img"/" > div"). */
type SelMap = Record<string, string[]>;

const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const pad4 = (v: unknown): string => {
  const p = v as Sides;
  return p && typeof p === "object" ? `${num(p.t)}px ${num(p.r)}px ${num(p.b)}px ${num(p.l)}px` : "0";
};
const valignCss = (v: unknown): string => (v === "middle" ? "middle" : v === "bottom" ? "bottom" : "top");
const hasAny = (m?: SelMap): boolean => !!m && Object.values(m).some((d) => d.length > 0);
const nonEmpty = (m: SelMap): SelMap | undefined => (hasAny(m) ? m : undefined);

function mapTextLike(layer?: DeviceOverride): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  if ("fontSize" in layer) self.push(`font-size:${num(layer.fontSize)}px`);
  if ("lineHeight" in layer) self.push(`line-height:${num(layer.lineHeight)}`);
  if ("letterSpacing" in layer) self.push(`letter-spacing:${num(layer.letterSpacing)}px`);
  if ("align" in layer) self.push(`text-align:${String(layer.align)}`);
  if ("weight" in layer) self.push(`font-weight:${num(layer.weight)}`);
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if (layer.hidden) self.push("display:none");
  return nonEmpty({ "": self });
}

function mapButton(layer?: DeviceOverride): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  const a: string[] = [];
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if ("align" in layer) self.push(`text-align:${String(layer.align)}`);
  if (layer.hidden) self.push("display:none");
  if ("fontSize" in layer) a.push(`font-size:${num(layer.fontSize)}px`);
  if ("weight" in layer) a.push(`font-weight:${num(layer.weight)}`);
  if ("radius" in layer) a.push(`border-radius:${num(layer.radius)}px`);
  if ("fullWidth" in layer) a.push(`display:${layer.fullWidth ? "block" : "inline-block"}`);
  if ("padV" in layer) a.push(`padding-top:${num(layer.padV)}px`, `padding-bottom:${num(layer.padV)}px`);
  if ("padH" in layer) a.push(`padding-left:${num(layer.padH)}px`, `padding-right:${num(layer.padH)}px`);
  return nonEmpty({ "": self, " a": a });
}

function mapImage(b: ImageBlock, layer?: DeviceOverride, prevLayer?: DeviceOverride): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  const img: string[] = [];
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if ("align" in layer) self.push(`text-align:${String(layer.align)}`);
  if (layer.hidden) self.push("display:none");
  if ("sizeUnit" in layer || "widthPct" in layer || "width" in layer || "fullWidth" in layer) {
    // Resolve the EFFECTIVE unit exactly like the canvas does (base + previous
    // layers + this layer) instead of keying on which keys the layer happens to
    // contain — a stale widthPct next to sizeUnit:"px" must not win.
    const eff = { ...(b as Record<string, unknown>), ...prevLayer, ...layer } as unknown as ImageBlock;
    const w = imageWidthCss(eff);
    img.push(typeof w === "number" ? `width:${w}px` : `width:${w}`, "max-width:100%");
  }
  if ("radius" in layer) img.push(`border-radius:${num(layer.radius)}px`);
  return nonEmpty({ "": self, " img": img });
}

function mapSpacer(layer?: DeviceOverride): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  if ("height" in layer) self.push(`height:${num(layer.height)}px`, `line-height:${num(layer.height)}px`);
  if (layer.hidden) self.push("display:none");
  return nonEmpty({ "": self });
}

function mapDivider(layer?: DeviceOverride): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  const inner: string[] = [];
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if ("align" in layer) self.push(`text-align:${String(layer.align)}`);
  if (layer.hidden) self.push("display:none");
  if ("width" in layer) inner.push(`width:${num(layer.width)}%`);
  return nonEmpty({ "": self, " > div": inner });
}

function mapBox(layer?: DeviceOverride): SelMap | undefined {
  // social / titleImage / timer / video: padding + align + hidden on the box.
  if (!layer) return undefined;
  const self: string[] = [];
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if ("align" in layer) self.push(`text-align:${String(layer.align)}`);
  if (layer.hidden) self.push("display:none");
  return nonEmpty({ "": self });
}

function mapMenu(layer?: DeviceOverride): SelMap | undefined {
  // menu: box (padding/align/hidden) + font-size on the <a> links
  // (EmailDocument paints fontSize inline on each <Link>).
  if (!layer) return undefined;
  const self: string[] = [];
  const a: string[] = [];
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if ("align" in layer) self.push(`text-align:${String(layer.align)}`);
  if (layer.hidden) self.push("display:none");
  if ("fontSize" in layer) a.push(`font-size:${num(layer.fontSize)}px`);
  return nonEmpty({ "": self, " a": a });
}

function mapHideOnly(layer?: DeviceOverride): SelMap | undefined {
  if (!layer || !layer.hidden) return undefined;
  return nonEmpty({ "": ["display:none"] });
}

function typeSelMap(b: Block, layer?: DeviceOverride, prevLayer?: DeviceOverride): SelMap | undefined {
  switch (b.type) {
    case "heading":
    case "text":
      return mapTextLike(layer);
    case "button":
      return mapButton(layer);
    case "image":
      return mapImage(b, layer, prevLayer);
    case "spacer":
      return mapSpacer(layer);
    case "divider":
      return mapDivider(layer);
    case "menu":
      return mapMenu(layer);
    case "social":
    case "titleImage":
    case "timer":
    case "video":
      return mapBox(layer);
    case "html":
    case "columns":
      return mapHideOnly(layer);
    default:
      return undefined;
  }
}

/** Full per-device selector map for a block: type-specific rules on the inner
 *  element (.ee-{id}) plus the margin override on the BlockWrapper div
 *  (.ee-{id}-w). The BASE margin lives inline on that wrapper, so the override
 *  must land there to REPLACE it (self-margin would ADD to it instead).
 *
 *  Se emite como `padding` porque así es como el wrapper lleva el margen base
 *  (ver BlockWrapper en render/EmailDocument.tsx): con `margin` el override no
 *  reemplazaría nada y el bloque tendría los dos espaciados a la vez. */
function blockSelMap(b: Block, layer?: DeviceOverride, prevLayer?: DeviceOverride): SelMap | undefined {
  const map: SelMap = { ...(typeSelMap(b, layer, prevLayer) ?? {}) };
  if (layer && "margin" in layer) map["-w"] = [`padding:${pad4(layer.margin)}`];
  return nonEmpty(map);
}

function columnLikeSelMap(layer: DeviceOverride | undefined, device: "tablet" | "mobile", stackMobile: boolean): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  const inner: string[] = [];
  if ("valign" in layer) self.push(`vertical-align:${valignCss(layer.valign)}`);
  if ("width" in layer && !(stackMobile && device === "mobile")) self.push(`width:${num(layer.width)}%`);
  if (layer.hidden) self.push("display:none");
  if ("padding" in layer) inner.push(`padding:${pad4(layer.padding)}`);
  if ("margin" in layer) inner.push(`margin:${pad4(layer.margin)}`);
  return nonEmpty({ "": self, " > div": inner });
}

function rowSelMap(layer?: DeviceOverride): SelMap | undefined {
  if (!layer) return undefined;
  const self: string[] = [];
  if ("padding" in layer) self.push(`padding:${pad4(layer.padding)}`);
  if ("minHeight" in layer) self.push(`min-height:${num(layer.minHeight)}px`);
  if (layer.hidden) self.push("display:none");
  return nonEmpty({ "": self });
}

const layerOf = (e: { rsp?: Responsive }, d: "tablet" | "mobile") => e.rsp?.[d] as DeviceOverride | undefined;
const clsIf = (id: string, t?: SelMap, m?: SelMap): string => (hasAny(t) || hasAny(m) ? `ee-${id}` : "");

export function responsiveClassForBlock(b: Block): string {
  return clsIf(b.id, blockSelMap(b, layerOf(b, "tablet")), blockSelMap(b, layerOf(b, "mobile"), layerOf(b, "tablet")));
}
/** Class for the block's WRAPPER div (per-device margin override lands there).
 *  Empty when no tablet/mobile layer carries a margin. */
export function responsiveWrapperClassForBlock(b: Block): string {
  const has = (d: OverrideDevice) => {
    const l = layerOf(b, d);
    return !!l && "margin" in l;
  };
  return has("tablet") || has("mobile") ? `ee-${b.id}-w` : "";
}
export function responsiveClassForColumn(col: Column): string {
  return clsIf(col.id, columnLikeSelMap(layerOf(col, "tablet"), "tablet", false), columnLikeSelMap(layerOf(col, "mobile"), "mobile", false));
}
export function responsiveClassForSubColumn(sc: SubColumn, stackMobile: boolean): string {
  return clsIf(sc.id, columnLikeSelMap(layerOf(sc, "tablet"), "tablet", stackMobile), columnLikeSelMap(layerOf(sc, "mobile"), "mobile", stackMobile));
}
export function responsiveClassForRow(row: Row): string {
  return clsIf(row.id, rowSelMap(layerOf(row, "tablet")), rowSelMap(layerOf(row, "mobile")));
}

function pushRules(out: { tablet: string[]; mobile: string[] }, id: string, t?: SelMap, m?: SelMap) {
  const emit = (arr: string[], map?: SelMap) => {
    if (!map) return;
    for (const [suffix, decls] of Object.entries(map)) {
      if (!decls.length) continue;
      arr.push(`.ee-${id}${suffix}{${decls.map((d) => `${d}!important;`).join("")}}`);
    }
  };
  emit(out.tablet, t);
  emit(out.mobile, m);
}

function walkBlocks(blocks: Block[], out: { tablet: string[]; mobile: string[] }) {
  for (const b of blocks) {
    pushRules(out, b.id, blockSelMap(b, layerOf(b, "tablet")), blockSelMap(b, layerOf(b, "mobile"), layerOf(b, "tablet")));
    if (b.type === "columns") {
      for (const sc of b.cols) {
        pushRules(
          out,
          sc.id,
          columnLikeSelMap(layerOf(sc, "tablet"), "tablet", b.stackMobile),
          columnLikeSelMap(layerOf(sc, "mobile"), "mobile", b.stackMobile),
        );
        walkBlocks(sc.blocks, out);
      }
    }
  }
}

/** Full @media CSS for the document's per-device overrides ("" if none). */
export function collectResponsiveCss(rows: Row[]): string {
  const out = { tablet: [] as string[], mobile: [] as string[] };
  for (const row of rows) {
    pushRules(out, row.id, rowSelMap(layerOf(row, "tablet")), rowSelMap(layerOf(row, "mobile")));
    for (const col of row.cols) {
      pushRules(
        out,
        col.id,
        columnLikeSelMap(layerOf(col, "tablet"), "tablet", false),
        columnLikeSelMap(layerOf(col, "mobile"), "mobile", false),
      );
      walkBlocks(col.blocks, out);
    }
  }
  let css = "";
  if (out.tablet.length) css += `@media only screen and (max-width:768px){${out.tablet.join("")}}`;
  if (out.mobile.length) css += `@media only screen and (max-width:600px){${out.mobile.join("")}}`;
  return css;
}

/** Join class names (drop falsy). */
export function cx(...classes: Array<string | undefined | false>): string | undefined {
  const v = classes.filter(Boolean).join(" ");
  return v || undefined;
}
