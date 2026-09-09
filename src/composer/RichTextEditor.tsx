/* ============================================================
   @begraffic/email/composer · RichTextEditor.tsx
   `contentEditable` con `document.execCommand`. Portado de BeCRM: mismas
   capacidades y mismo comportamiento, pero sin Tailwind ni `cn` — todo el
   estilo es inline sobre los tokens de `UI`.

   Lo único que NO cabe en `style` son las reglas de descendiente (`strong`,
   `em`, `ul`, `img`, …): son selectores, no propiedades. Van en un <style>
   acotado por `[data-bge-rte]`, siguiendo el mismo patrón que ya usa
   `../editor/Canvas.tsx`. Además de reproducir lo que hacían las variantes
   `[&_x]:…` de Tailwind, restauran los defaults del navegador que el
   preflight de Tailwind anula en los anfitriones que lo usan.
   ============================================================ */
"use client";

import * as React from "react";
import { UI } from "../editor/theme";

export type RichTextEditorHandle = {
  focus: () => void;
  getHTML: () => string;
  setHTML: (html: string) => void;
  exec: (command: string, value?: string) => void;
  insertHTML: (html: string) => void;
  saveSelection: () => Range | null;
  restoreSelection: (range: Range | null) => void;
  getSelectedText: () => string;
};

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Estilo del contenedor. Sustituye al antiguo `className`. */
  style?: React.CSSProperties;
  /** Altura mínima del área editable, como longitud CSS (antes era una clase
   *  de Tailwind: `min-h-24` → `"96px"`). */
  minHeight?: string;
};

const isEmptyHtml = (html: string) => {
  const stripped = html.replace(/\s|&nbsp;/g, "");
  return stripped === "" || stripped === "<br>" || stripped === "<div><br></div>";
};

/* Equivalente inline de las variantes `[&_x]:…` que traía el original. */
const CONTENT_CSS = `
[data-bge-rte] strong,[data-bge-rte] b{font-weight:600}
[data-bge-rte] em,[data-bge-rte] i{font-style:italic}
[data-bge-rte] u{text-decoration-line:underline}
[data-bge-rte] a{color:${UI.accent};text-decoration-line:none;text-underline-offset:2px}
[data-bge-rte] a:hover{text-decoration-line:underline}
[data-bge-rte] ul{list-style-type:disc;padding-left:20px}
[data-bge-rte] ol{list-style-type:decimal;padding-left:20px}
[data-bge-rte] img{margin-top:4px;margin-bottom:4px;max-height:192px;border-radius:6px;border:1px solid ${UI.borderSubtle}}
`;

export const RichTextEditor = React.forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  function RichTextEditor({ value, onChange, placeholder, style, minHeight = "96px" }, ref) {
    const wrapRef = React.useRef<HTMLDivElement | null>(null);
    const divRef = React.useRef<HTMLDivElement | null>(null);
    const lastHtmlRef = React.useRef<string>(value);
    const [isEmpty, setIsEmpty] = React.useState<boolean>(isEmptyHtml(value));

    React.useEffect(() => {
      if (!divRef.current) return;
      // Only stomp the DOM when the parent really pushes a different value
      // than what we last emitted (otherwise we'd kill the caret on every keystroke).
      if (value !== lastHtmlRef.current) {
        divRef.current.innerHTML = value;
        lastHtmlRef.current = value;
        setIsEmpty(isEmptyHtml(value));
      }
    }, [value]);

    const emit = React.useCallback(() => {
      if (!divRef.current) return;
      const html = divRef.current.innerHTML;
      setIsEmpty(isEmptyHtml(html));
      if (html !== lastHtmlRef.current) {
        lastHtmlRef.current = html;
        onChange(html);
      }
    }, [onChange]);

    // `focus-within:` de Tailwind, a mano: el foco lo recibe el editable, pero
    // el borde y el halo los pinta el contenedor.
    const markFocus = (on: boolean) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      wrap.style.borderColor = on ? UI.accent : UI.border;
      wrap.style.boxShadow = on ? `0 0 0 3px ${UI.accentSoft}` : "none";
    };

    React.useImperativeHandle(
      ref,
      () => ({
        focus: () => divRef.current?.focus(),
        getHTML: () => divRef.current?.innerHTML ?? "",
        setHTML: (html: string) => {
          if (!divRef.current) return;
          divRef.current.innerHTML = html;
          lastHtmlRef.current = html;
          setIsEmpty(isEmptyHtml(html));
          onChange(html);
        },
        exec: (command: string, val?: string) => {
          divRef.current?.focus();
          // document.execCommand está deprecada, pero sigue siendo la API más
          // pragmática para formatear contentEditable (no hay reemplazo estándar).
          document.execCommand(command, false, val);
          emit();
        },
        insertHTML: (html: string) => {
          divRef.current?.focus();
          // Ídem: deprecada pero sin reemplazo estándar para insertar HTML.
          document.execCommand("insertHTML", false, html);
          emit();
        },
        saveSelection: () => {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return null;
          const range = sel.getRangeAt(0);
          if (!divRef.current?.contains(range.commonAncestorContainer)) return null;
          return range.cloneRange();
        },
        restoreSelection: (range) => {
          if (!range || !divRef.current) return;
          divRef.current.focus();
          const sel = window.getSelection();
          if (!sel) return;
          sel.removeAllRanges();
          sel.addRange(range);
        },
        getSelectedText: () => {
          const sel = window.getSelection();
          if (!sel || sel.rangeCount === 0) return "";
          const range = sel.getRangeAt(0);
          if (!divRef.current?.contains(range.commonAncestorContainer)) return "";
          return sel.toString();
        },
      }),
      [emit, onChange],
    );

    return (
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 6,
          border: `1px solid ${UI.border}`,
          background: UI.surface,
          transition: "border-color 150ms, box-shadow 150ms",
          ...style,
        }}
      >
        <style>{CONTENT_CSS}</style>
        <div
          ref={divRef}
          data-bge-rte=""
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          onInput={emit}
          onFocus={() => markFocus(true)}
          onBlur={() => {
            markFocus(false);
            emit();
          }}
          style={{
            width: "100%",
            minHeight,
            resize: "vertical",
            overflowY: "auto",
            borderRadius: 6,
            background: "transparent",
            padding: "8px 12px",
            fontFamily: "inherit",
            fontSize: 14,
            color: UI.text,
            outline: "none",
          }}
        />
        {isEmpty && placeholder && (
          <span
            aria-hidden
            style={{
              pointerEvents: "none",
              position: "absolute",
              left: 12,
              top: 8,
              fontSize: 14,
              color: UI.textPlaceholder,
            }}
          >
            {placeholder}
          </span>
        )}
      </div>
    );
  },
);
