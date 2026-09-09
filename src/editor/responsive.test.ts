import { describe, it, expect } from "vitest";
import { resolveForDevice, routePatch, resolvedHidden, hasDeviceOverride, clearDeviceOverridePatch } from "./responsive";
import type { Responsive } from "../render/model/types";

/**
 * Los helpers son genéricos sobre `{ rsp?: Responsive }`, así que no hace falta
 * un `Block` real: basta una entidad mínima con esa forma. Tiparla (en vez de
 * castear a `any`) hace que el test verifique también el contrato de tipos.
 */
type TestBlock = {
  id: string;
  type: string;
  html: string;
  fontSize: number;
  letterSpacing?: number;
  align: string;
  color: string;
  padding: { t: number; b: number; l: number; r: number };
  rsp?: Responsive;
};

const block = (): TestBlock => ({ id: "b1", type: "text", html: "hi", fontSize: 16, align: "left", color: "#000", padding: { t: 10, b: 10, l: 20, r: 20 } });

describe("resolveForDevice", () => {
  it("desktop returns same reference", () => {
    const b = block();
    expect(resolveForDevice(b, "desktop")).toBe(b);
  });
  it("mobile applies mobile layer over base", () => {
    const b: TestBlock = { ...block(), rsp: { mobile: { fontSize: 13 } } };
    const r = resolveForDevice(b, "mobile");
    expect(r.fontSize).toBe(13);
    expect(r.color).toBe("#000");
    expect(r.id).toBe("b1");
  });
  it("mobile inherits tablet (cascade), mobile wins on conflict", () => {
    const b: TestBlock = { ...block(), rsp: { tablet: { fontSize: 15, align: "center" }, mobile: { fontSize: 13 } } };
    const r = resolveForDevice(b, "mobile");
    expect(r.fontSize).toBe(13);   // mobile wins
    expect(r.align).toBe("center"); // inherited from tablet
  });
  it("tablet ignores mobile layer", () => {
    const b: TestBlock = { ...block(), rsp: { tablet: { fontSize: 15 }, mobile: { fontSize: 13 } } };
    expect(resolveForDevice(b, "tablet").fontSize).toBe(15);
  });
  it("ignores non-allowlisted keys in a layer (defensive)", () => {
    // Capa deliberadamente INVÁLIDA: `color` no es override-elegible y `id`/`type`
    // están protegidas. El cast es intencional — es justo el input que el test
    // quiere meter para comprobar que el runtime se defiende.
    const rsp = { mobile: { color: "#f00", id: "X", type: "heading", fontSize: 12 } } as unknown as Responsive;
    const b: TestBlock = { ...block(), rsp };
    const r = resolveForDevice(b, "mobile");
    expect(r.fontSize).toBe(12);
    expect(r.color).toBe("#000"); // color is NOT override-eligible → base kept
    expect(r.id).toBe("b1");
    expect(r.type).toBe("text");
  });
});

describe("routePatch", () => {
  it("desktop is passthrough", () => {
    const b = block();
    expect(routePatch(b, "desktop", { fontSize: 20 })).toEqual({ fontSize: 20 });
  });
  it("mobile routes style keys to rsp.mobile, keeps base keys on base", () => {
    const b = block();
    const out = routePatch(b, "mobile", { fontSize: 20, color: "#f00" });
    expect(out.color).toBe("#f00");            // base
    expect(out.fontSize).toBeUndefined();       // not on base
    expect(out.rsp?.mobile?.fontSize).toBe(20); // on layer
  });
  it("merges into existing layer", () => {
    const b: TestBlock = { ...block(), rsp: { mobile: { align: "center" } } };
    const out = routePatch(b, "mobile", { fontSize: 20 });
    expect(out.rsp?.mobile).toEqual({ align: "center", fontSize: 20 });
  });
  it("href/html always edit base even in mobile view", () => {
    const b = block();
    const out = routePatch(b, "mobile", { html: "new" });
    expect(out.html).toBe("new");
    expect(out.rsp).toBeUndefined();
  });
  it("tablet routes style keys to rsp.tablet (editor tablet view)", () => {
    const b = block();
    const out = routePatch(b, "tablet", { fontSize: 18, html: "base" });
    expect(out.rsp?.tablet?.fontSize).toBe(18);
    expect(out.html).toBe("base");
    expect(out.fontSize).toBeUndefined();
  });
  it("letterSpacing is override-eligible (routes to the device layer)", () => {
    const b: TestBlock = { ...block(), type: "heading" };
    const out = routePatch(b, "mobile", { letterSpacing: 1.5 });
    expect(out.rsp?.mobile?.letterSpacing).toBe(1.5);
    const r = resolveForDevice({ ...b, rsp: { mobile: { letterSpacing: 1.5 } } }, "mobile");
    expect(r.letterSpacing).toBe(1.5);
  });
});

describe("hidden + reset", () => {
  it("resolvedHidden reads override", () => {
    const b: TestBlock = { ...block(), rsp: { mobile: { hidden: true } } };
    expect(resolvedHidden(b, "mobile")).toBe(true);
    expect(resolvedHidden(b, "tablet")).toBe(false);
    expect(resolvedHidden(b, "desktop")).toBe(false);
  });
  it("hasDeviceOverride", () => {
    const b: TestBlock = { ...block(), rsp: { mobile: { fontSize: 12 } } };
    expect(hasDeviceOverride(b, "mobile")).toBe(true);
    expect(hasDeviceOverride(b, "tablet")).toBe(false);
  });
  it("clearDeviceOverridePatch drops the layer, nulls rsp when empty", () => {
    const b: TestBlock = { ...block(), rsp: { mobile: { fontSize: 12 } } };
    expect(clearDeviceOverridePatch(b, "mobile")).toEqual({ rsp: undefined });
    const b2: TestBlock = { ...block(), rsp: { tablet: { fontSize: 15 }, mobile: { fontSize: 12 } } };
    const out = clearDeviceOverridePatch(b2, "mobile");
    expect(out.rsp?.mobile).toBeUndefined();
    expect(out.rsp?.tablet).toEqual({ fontSize: 15 });
  });
});
