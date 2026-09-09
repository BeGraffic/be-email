/* ============================================================
   @begraffic/email/composer · ui.tsx
   Los dos primitivos que `../editor/controls` no cubre: el shell de modal y el
   textarea. Todo en estilos inline, sin Tailwind ni design system del anfitrión.
   ============================================================ */
"use client";

import { useEffect, type CSSProperties, type ReactNode, type TextareaHTMLAttributes } from "react";
import { UI } from "../editor/theme";
import { focusOff, focusOn, inputBase } from "../editor/controls";

export function Modal({
  onClose,
  maxWidth = 460,
  children,
}: {
  onClose: () => void;
  /** Ancho máximo del panel. En BeCRM el modal tenía tallas (sm=440, lg=640);
   *  aquí se pasa el número directamente. */
  maxWidth?: number;
  children: ReactNode;
}) {
  // El modal de BeCRM (headlessui) cerraba con Escape; sin headlessui hay que
  // escuchar la tecla a mano o se pierde esa salida.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0,0,0,0.45)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: 12,
          background: UI.surface,
          border: `1px solid ${UI.border}`,
          boxShadow: "0 12px 40px rgba(0,0,0,0.24)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const row: CSSProperties = { padding: "14px 16px" };

export function ModalHeader({ children }: { children: ReactNode }) {
  return (
    <div style={{ ...row, borderBottom: `1px solid ${UI.borderSubtle}`, fontWeight: 600, color: UI.text }}>
      {children}
    </div>
  );
}

export function ModalBody({ children }: { children: ReactNode }) {
  return <div style={{ ...row, display: "grid", gap: 12 }}>{children}</div>;
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        ...row,
        borderTop: `1px solid ${UI.borderSubtle}`,
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      onFocus={focusOn}
      onBlur={focusOff}
      style={{ ...inputBase, minHeight: 88, resize: "vertical", ...props.style }}
    />
  );
}
