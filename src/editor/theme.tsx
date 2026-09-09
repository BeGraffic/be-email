/* ============================================================
   @begraffic/email/editor · theme.tsx
   Paleta del CHROME del editor. Cada color es una var CSS CON FALLBACK: si el
   proyecto anfitrión define sus tokens, manda el suyo; si no, se usa el literal.
   El CONTENIDO del email conserva sus propios colores de diseño — `UI.*` es solo
   para el chrome que rodea al lienzo.
   ============================================================ */
"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { C } from "./constants";

export type ThemePreference = "light" | "dark" | "system";

/** El anfitrión controla el tema. Si no se pasa, el editor no muestra el
 *  selector y hereda lo que haya en el documento. */
export type ThemeController = {
  preference: ThemePreference;
  onChange: (preference: ThemePreference) => void;
};

export const UI = {
  surface: "var(--bg-card, #ffffff)",
  surfaceAlt: "var(--bg-muted, #f5f5f5)",
  workspace: "var(--ee-workspace, #f4f6fa)",
  sidebar: "var(--bg-sidebar, #fafafa)",
  border: "var(--border, #e5e5e5)",
  borderStrong: "var(--border-strong, #d4d4d4)",
  borderSubtle: "var(--border-subtle, #efefef)",
  text: "var(--text-primary, #171717)",
  textMuted: "var(--text-secondary, #525252)",
  textSubtle: "var(--text-tertiary, #737373)",
  accent: "var(--ee-accent, #1e4876)",
  accentText: "#ffffff",
  accentSoft: "var(--ee-accent-soft, #f2f7fc)",
  amber: C.amber500,
  green: C.green500,
  red: C.red500,
} as const;

const OPTIONS: { pref: ThemePreference; Icon: typeof Sun; label: string }[] = [
  { pref: "light", Icon: Sun, label: "Claro" },
  { pref: "dark", Icon: Moon, label: "Oscuro" },
  { pref: "system", Icon: Monitor, label: "Sistema" },
];

/** Selector Claro / Oscuro / Sistema. Controlado por el anfitrión. */
export function EditorThemeToggle({ theme }: { theme: ThemeController }) {
  return (
    <div
      role="group"
      aria-label="Tema del editor"
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 2,
        borderRadius: 8,
        background: UI.surfaceAlt,
        border: `1px solid ${UI.border}`,
      }}
    >
      {OPTIONS.map(({ pref: option, Icon, label }) => {
        const active = theme.preference === option;
        return (
          <button
            key={option}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onClick={() => theme.onChange(option)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 24,
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              background: active ? UI.surface : "transparent",
              color: active ? UI.text : UI.textSubtle,
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.16)" : "none",
              transition: "background 0.12s, color 0.12s",
            }}
          >
            <Icon size={14} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
