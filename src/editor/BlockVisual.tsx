/* ============================================================
   @begraffic/email/editor · BlockVisual.tsx
   Visual renderer for a single block (shared by canvas + preview).
   ============================================================ */
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { C, SOCIAL_META } from "./constants";
import { UI } from "./theme";
import { Icon, SocialGlyph } from "./Icon";
import { fontStack } from "./fonts";
import { textImageUrl } from "./imageFonts";
import { borderCss, imageWidthCss, offsetStyle, padCss } from "./generators";
import { hexToRgba, videoThumbUrl } from "./videoThumb";
import { sanitizeHtmlBlock } from "../render/model/sanitizeHtml";
import type { Block } from "./types";

/* Quita font-size / font-family de los estilos inline (y el atributo size de
   <font>) para que el tamaño y la fuente del BLOQUE siempre manden — si no, un
   texto pegado con estilos inline ignora los controles del panel. */
function stripFontInline(html: string): string {
  return html
    .replace(/style="([^"]*)"/gi, (_m, css: string) => {
      const cleaned = css
        .replace(/(?:^|;)\s*font-(?:size|family)\s*:[^;]*/gi, "")
        .replace(/^;+|;+$/g, "")
        .trim();
      return cleaned ? `style="${cleaned}"` : "";
    })
    .replace(/(<font[^>]*?)\s+size="[^"]*"/gi, "$1");
}

/* Robust contentEditable: syncs DOM innerHTML from `html` only when it
   actually differs (so typing never resets the caret), and focuses when
   editing begins. Al pegar inserta TEXTO PLANO (sin estilos inline) y al salir
   limpia font-size/family residuales, para que los controles del bloque manden. */
function Editable({
  html,
  editing,
  onInput,
  style,
}: {
  html: string;
  editing: boolean;
  onInput?: (html: string) => void;
  style: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
    }
  }, [editing]);
  return (
    <div
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      onInput={(e) => onInput?.(e.currentTarget.innerHTML)}
      onPaste={(e) => {
        if (!editing) return;
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
      onBlur={(e) => onInput?.(stripFontInline(e.currentTarget.innerHTML))}
      style={style}
    />
  );
}

/* Live countdown for the Timer block. */
function TimerVisual({ b }: { b: Extract<Block, { type: "timer" }> }) {
  const calc = () => {
    const diff = Math.max(0, new Date(b.target).getTime() - Date.now());
    const s = Math.floor(diff / 1000);
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.target]);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const units = [
    { v: t.d, l: "Días" },
    { v: t.h, l: "Horas" },
    { v: t.m, l: "Min" },
    { v: t.s, l: "Seg" },
  ];
  // Geometría espejo del GIF horneado (imageGen.ts, mostrado a 292px CSS en el
  // correo): cajas 64×56, gap 12, dígitos 30, labels 11/700 con gap 6.
  return (
    <div style={{ display: "inline-flex", gap: 12 }}>
      {units.map((u, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 64,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: b.boxBg,
              color: b.color,
              borderRadius: 10,
              fontSize: 30,
              fontWeight: 700,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {pad2(u.v)}
          </div>
          {b.showLabels && (
            <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1, color: b.labelColor }}>
              {u.l}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function BlockVisual({
  b,
  raw,
  editing = false,
  onInput,
  onUpdate,
}: {
  b: Block;
  /** Bloque CRUDO (sin resolver overrides): titleImage genera su PNG siempre
      desde la base, igual que el render de envío (evita corromper imgW). */
  raw?: Block;
  editing?: boolean;
  onInput?: (html: string) => void;
  onUpdate?: (patch: Partial<Block>) => void;
}) {
  const pad = "padding" in b && b.padding ? padCss(b.padding) : 0;

  switch (b.type) {
    case "heading":
    case "text":
      return (
        <Editable
          html={b.html}
          editing={editing}
          onInput={onInput}
          style={{
            padding: pad,
            fontSize: b.fontSize,
            lineHeight: b.lineHeight,
            // Solo heading tiene letterSpacing; ≠0 para no emitir "0px" (paridad
            // con el render de envío, que también lo omite cuando es 0).
            letterSpacing: b.type === "heading" && b.letterSpacing ? `${b.letterSpacing}px` : undefined,
            fontFamily: b.font ? fontStack(b.font) : undefined,
            fontWeight: b.type === "heading" ? b.weight || 700 : "inherit",
            textAlign: b.align,
            color: b.color,
            outline: editing ? "2px solid " + C.navy500 : "none",
            borderRadius: editing ? 4 : 0,
            cursor: editing ? "text" : "inherit",
            minHeight: editing ? 24 : 0,
          }}
        />
      );
    case "image":
      return (
        <div style={{ padding: pad, textAlign: b.align, ...offsetStyle(b.offset) }}>
          {b.src ? (
            <img
              src={b.src}
              alt={b.alt}
              style={{
                width: imageWidthCss(b),
                maxWidth: "100%",
                borderRadius: b.radius,
                display: "inline-block",
                verticalAlign: "middle",
              }}
            />
          ) : (
            <div
              style={{
                position: "relative",
                width: imageWidthCss(b),
                maxWidth: "100%",
                height: 160,
                background: `repeating-linear-gradient(135deg,${UI.borderSubtle} 0 12px,${UI.surfaceAlt} 12px 24px)`,
                border: "1px dashed " + UI.borderStrong,
                borderRadius: b.radius,
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: UI.textSubtle,
              }}
            >
              {/* Aviso suave (chrome solo-editor): el bloque aún no tiene imagen. */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: C.amber100,
                  color: C.amber700,
                  border: "1px solid " + C.amber400,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 999,
                  fontFamily: "'Google Sans', system-ui, -apple-system, sans-serif",
                  pointerEvents: "none",
                }}
              >
                <Icon name="info" size={11} color={C.amber700} />
                Sin imagen
              </span>
              <Icon name="image" size={28} color={UI.textSubtle} />
              <span style={{ fontSize: 12, fontWeight: 600 }}>Imagen</span>
            </div>
          )}
        </div>
      );
    case "button":
      return (
        <div style={{ padding: pad, textAlign: b.align }}>
          <span
            style={{
              display: b.fullWidth ? "block" : "inline-block",
              boxSizing: "border-box",
              background: b.bg,
              color: b.color,
              fontSize: b.fontSize,
              fontWeight: b.weight,
              borderRadius: b.radius,
              border: borderCss(b.border),
              padding: `${b.padV}px ${b.padH}px`,
              textAlign: "center",
            }}
          >
            {b.text}
          </span>
        </div>
      );
    case "divider":
      return (
        <div style={{ padding: pad, textAlign: b.align }}>
          <div
            style={{
              display: "inline-block",
              width: b.width + "%",
              borderTop: `${b.thickness}px ${b.style} ${b.color}`,
            }}
          />
        </div>
      );
    case "spacer":
      return (
        <div
          style={{
            height: b.height,
            position: "relative",
            background: editing
              ? "transparent"
              : `repeating-linear-gradient(45deg,${UI.accentSoft} 0 6px,transparent 6px 12px)`,
          }}
        >
          {/* Etiqueta de altura (chrome solo-editor, no se envía en el correo). */}
          {!editing && (
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 600,
                lineHeight: 1,
                color: UI.textSubtle,
                fontFamily: "'Google Sans', system-ui, -apple-system, sans-serif",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {b.height}px
            </span>
          )}
        </div>
      );
    case "social":
      return (
        <div style={{ padding: pad, textAlign: b.align }}>
          {b.networks.map((n) => {
            const m = SOCIAL_META[n.net] || { color: C.navy700 };
            const mono = b.style.includes("mono");
            return (
              <span
                key={n.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: b.size,
                  height: b.size,
                  margin: `0 ${b.gap / 2}px`,
                  background: mono ? C.navy900 : m.color || C.navy700,
                  color: "#fff",
                  borderRadius: b.style.includes("rounded") ? "50%" : 6,
                }}
              >
                <SocialGlyph net={n.net} size={b.size * 0.56} />
              </span>
            );
          })}
        </div>
      );
    case "video": {
      const videoThumb = videoThumbUrl(b.href, b.thumb);
      const radius = b.radius ?? 8;
      const fullWidth = b.fullWidth !== false;
      const showPlay = b.showPlay !== false;
      const playSize = b.playSize ?? 64;
      const playColor = b.playColor || "#FFFFFF";
      const playAccent = b.playAccent || "#0F2542";
      const playBg = hexToRgba(playColor, b.playOpacity ?? 95);
      const hasOverlay = Boolean(b.overlayText || b.overlaySubtext);
      const overlayJustify =
        b.overlayPosition === "bottom" ? "flex-end" : b.overlayPosition === "center" ? "center" : "flex-start";
      return (
        <div style={{ padding: pad, textAlign: b.align || "center" }}>
          <div
            style={{
              position: "relative",
              display: "inline-block",
              width: fullWidth ? "100%" : undefined,
              maxWidth: fullWidth ? "100%" : (b.width ?? 600),
              borderRadius: radius,
              overflow: "hidden",
              lineHeight: 0,
            }}
          >
            {videoThumb ? (
              <img src={videoThumb} alt="" style={{ width: "100%", display: "block" }} />
            ) : (
              // Misma proporción que el póster generado sin thumbnail (16:9).
              <div style={{ width: "100%", aspectRatio: "16 / 9", background: C.navy900 }} />
            )}
            {/* Scrim (debajo del botón) para legibilidad del texto */}
            {hasOverlay && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: hexToRgba(b.overlayBg || "#0F2542", b.overlayOpacity ?? 35),
                }}
              />
            )}
            {/* Botón de play (capa intermedia) */}
            {showPlay && (
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: "auto",
                  width: playSize,
                  height: playSize,
                  background: playBg,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(0,0,0,.3)",
                }}
              >
                <Icon name="play" size={Math.round(playSize * 0.4)} color={playAccent} />
              </span>
            )}
            {/* Texto (capa superior, siempre por encima del botón) */}
            {hasOverlay && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: overlayJustify,
                  alignItems: "center",
                  textAlign: "center",
                  padding: "18px 20px",
                  gap: 4,
                  lineHeight: 1.25,
                  // El póster del correo siempre se hornea en Geist (imageGen):
                  // el overlay del lienzo no debe heredar la fuente global g.font.
                  fontFamily: "'Geist', system-ui, -apple-system, sans-serif",
                  color: b.overlayColor || "#FFFFFF",
                  pointerEvents: "none",
                }}
              >
                {b.overlayText && <div style={{ fontSize: 20, fontWeight: 700 }}>{b.overlayText}</div>}
                {b.overlaySubtext && <div style={{ fontSize: 13, opacity: 0.9 }}>{b.overlaySubtext}</div>}
              </div>
            )}
          </div>
        </div>
      );
    }
    case "menu":
      return (
        <div style={{ padding: pad, textAlign: b.align }}>
          {b.items.map((i, ix) => (
            <span key={i.id}>
              {ix > 0 && <span style={{ color: C.n300, fontSize: b.fontSize, margin: `0 ${b.gap / 2}px` }}>|</span>}
              <span style={{ color: b.color, fontSize: b.fontSize }}>{i.label}</span>
            </span>
          ))}
        </div>
      );
    case "html":
      // Contain imported HTML to the column: a fixed-width table or wide image
      // scrolls inside the block instead of stretching the whole email body.
      // (`ee-html-block` scopes a child `img{max-width:100%}` rule below.)
      // sanitizeHtmlBlock: mismo strip de etiquetas de tabla que aplica el
      // render de envío (EmailDocument), para que el lienzo muestre lo que
      // realmente llegará al correo.
      return (
        <div
          className="ee-html-block"
          style={{
            maxWidth: "100%",
            overflowX: "auto",
            boxSizing: "border-box",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlBlock(b.code) }}
        />
      );
    case "timer":
      return (
        <div style={{ padding: pad, textAlign: b.align }}>
          <TimerVisual b={b} />
        </div>
      );
    case "titleImage": {
      // El PNG se genera SIEMPRE desde el bloque BASE (raw), igual que el render
      // de envío: los overrides por dispositivo (p.ej. fontSize móvil) no deben
      // regenerar la imagen ni re-medir imgW (corrompería el ancho base). El
      // wrapper sí usa padding/align resueltos (eff), como el @media del correo.
      const src0 = (raw?.type === "titleImage" ? raw : b) as Extract<Block, { type: "titleImage" }>;
      return (
        <div style={{ padding: pad, textAlign: b.align }}>
          {src0.text.trim() ? (
            // Renderiza a 2× y se muestra a 1× (imgW medido) para nitidez retina.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={textImageUrl(src0)}
              alt={src0.text}
              onLoad={(e) => {
                const w = Math.round(e.currentTarget.naturalWidth / 2);
                if (w && w !== src0.imgW) onUpdate?.({ imgW: w } as Partial<Block>);
              }}
              style={{ display: "inline-block", width: src0.imgW || "auto", maxWidth: "100%", height: "auto", verticalAlign: "middle" }}
            />
          ) : (
            <span style={{ color: UI.textSubtle, fontSize: 13 }}>Escribe el título en el panel de la derecha…</span>
          )}
        </div>
      );
    }
    case "columns":
      // En el lienzo, el bloque "columns" SIEMPRE se renderiza interactivo vía
      // `renderNested` (Canvas). La vista de solo lectura que vivía aquí quedó
      // sin consumidores (el preview usa el HTML real de envío) y se eliminó
      // para no mantener un render desincronizado.
      return null;
    default: {
      const _never: never = b;
      return _never;
    }
  }
}
