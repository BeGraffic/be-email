/* ============================================================
   @begraffic/email/editor · modals.tsx
   Preview (fullscreen) · Code view · Media gallery

   Ninguna capacidad del anfitrión se importa aquí: el render (`renderHtml`) y
   la búsqueda de fotos (`searchPhotos`) llegan como props desde `EmailEditor`.
   ============================================================ */
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { C } from "./constants";
import { UI } from "./theme";
import { Btn, Segmented } from "./controls";
import { compressImageForEmail } from "./imageCompress";
import { Icon } from "./Icon";
import { EmailPreviewFrame } from "./EmailPreviewFrame";
import { buildJSON } from "./generators";
import { serializeDesign } from "./defaults";
// Solo tipos: no crea un ciclo en tiempo de ejecución (se borra al compilar).
import type { StockPhoto } from "./EmailEditor";
import type { Device, EmailDesign, GlobalSettings, Row } from "./types";

/* shared overlay */
function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,37,66,.42)",
        backdropFilter: "blur(2px)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        animation: "fadeIn .15s ease",
      }}
    >
      {children}
    </div>
  );
}

export function PreviewModal({
  rows,
  g,
  renderHtml,
  appUrl,
  onClose,
}: {
  rows: Row[];
  g: GlobalSettings;
  /** Render del anfitrión: el editor no sabe generar el HTML de envío. */
  renderHtml: (design: EmailDesign) => Promise<string>;
  /** URL canónica del anfitrión, reenviada a `EmailPreviewFrame`. Ver su doc. */
  appUrl?: string;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<Device>("desktop");
  const [dark, setDark] = useState(false);
  // Previsualización FIEL: se renderiza el HTML REAL de envío (mismo que recibe el
  // destinatario) y se muestra en un iframe al ancho del dispositivo. El ancho
  // dispara las @media reales del correo → el responsive se ve tal cual se enviará.
  const [html, setHtml] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  // `renderHtml` es una prop del anfitrión, no necesariamente memoizada (el
  // patrón natural es pasarla inline: `renderHtml={(d) => renderViaApi(d)}`,
  // con identidad nueva en cada render del anfitrión). Se guarda en una ref
  // (mismo patrón que `onReadyRef` en EmailEditor.tsx) para que el efecto de
  // abajo dependa del CONTENIDO a previsualizar (`g`, `rows`), no de esa
  // identidad — si no, cualquier re-render del anfitrión con la vista previa
  // abierta borraba el preview a su estado de carga y volvía a pedirle el
  // render al servidor.
  const renderHtmlRef = useRef(renderHtml);
  renderHtmlRef.current = renderHtml;
  useEffect(() => {
    let alive = true;
    setHtml(null);
    setLoadErr(null);
    renderHtmlRef
      .current(serializeDesign(g, rows))
      .then((h) => alive && setHtml(h))
      .catch((e) => alive && setLoadErr(e instanceof Error ? e.message : "No se pudo generar la previsualización."));
    return () => {
      alive = false;
    };
  }, [g, rows]);
  // Escritorio: NUNCA renderizar el preview a ≤600px (= el breakpoint móvil `@media(max-width:600px)`
  // del email). El ancho por defecto del email es 600, así que pasar `g.width` hacía que el iframe
  // quedara a 600 y disparara el apilado MÓVIL en el preview de escritorio (las columnas se veían
  // verticales). Se usa ≥680 igual que el resto de previews (seeTemplate/edit/new). Móvil: 375.
  // Tableta: 768 exactos (= dispara el @media(max-width:768px) de los overrides de tableta).
  const renderWidth = mode === "mobile" ? 375 : mode === "tablet" ? 768 : Math.max(g.width, 680);
  return (
    <div style={{ position: "fixed", inset: 0, background: UI.workspace, zIndex: 200, display: "flex", flexDirection: "column", animation: "fadeIn .15s ease" }}>
      {/* El modo oscuro invierte el contenedor con `invert()` para simular el
          dark mode de los clientes de correo. Las imágenes/videos no deben
          invertirse (se verían en negativo), así que se les aplica el mismo
          filtro para neutralizar la inversión del contenedor. */}
      <style>{`
        .email-dark-preview img,
        .email-dark-preview picture,
        .email-dark-preview video {
          filter: invert(1) hue-rotate(180deg);
        }
      `}</style>
      <header style={{ height: 58, flexShrink: 0, background: UI.surface, borderBottom: "1px solid " + UI.border, display: "flex", alignItems: "center", padding: "0 18px", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Icon name="eye" size={17} color={UI.accent} />
          <span style={{ fontSize: 14, fontWeight: 700, color: UI.text }}>Previsualización</span>
        </div>
        <div style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v as Device)}
            options={[
              { value: "desktop", icon: "monitor", label: "Escritorio" },
              { value: "tablet", icon: "tablet", label: "Tableta" },
              { value: "mobile", icon: "smartphone", label: "Móvil" },
            ]}
          />
          <button
            type="button"
            onClick={() => setDark(!dark)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid " + (dark ? UI.accent : UI.border),
              background: dark ? C.navy900 : UI.surface,
              color: dark ? "#fff" : UI.textMuted,
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon name={dark ? "moon" : "sun"} size={15} /> Modo oscuro
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Salir de previsualización"
          style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid " + UI.border, background: UI.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: UI.textMuted }}
        >
          <Icon name="x" size={18} />
        </button>
      </header>
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 16px", display: "flex", justifyContent: "center", background: dark ? "#0b0f14" : UI.workspace }}>
        {loadErr ? (
          <div style={{ alignSelf: "center", color: C.red500, fontSize: 13, fontWeight: 600, textAlign: "center", maxWidth: 360 }}>
            <Icon name="info" size={20} /> <div style={{ marginTop: 8 }}>{loadErr}</div>
          </div>
        ) : html === null ? (
          <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, color: C.navy400, fontSize: 13, fontWeight: 600 }}>
            <Icon name="loader" size={22} /> Generando previsualización real…
          </div>
        ) : (
          <div
            style={{
              width: Math.min(renderWidth, 900),
              maxWidth: "100%",
              alignSelf: "flex-start",
              boxShadow: "0 16px 50px rgba(15,37,66,.16)",
              borderRadius: mode === "mobile" ? 28 : mode === "tablet" ? 20 : 10,
              overflow: "hidden",
              // Dark mode: filtro de inversión sobre el iframe (aproximación visual).
              filter: dark ? "invert(1) hue-rotate(180deg)" : "none",
              background: g.canvasBg,
              transition: "width 250ms cubic-bezier(.4,0,.2,1)",
            }}
          >
            {/* El HTML es el REAL de envío; el ancho del iframe dispara las @media
                reales (apilado/tipografía móvil) → previsualización fiel. */}
            <EmailPreviewFrame html={html} title={`Previsualización ${mode}`} renderWidth={renderWidth} minHeight={480} appUrl={appUrl} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Code view ── */
export function CodeModal({
  rows,
  g,
  initial = "html",
  renderHtml,
  onClose,
}: {
  rows: Row[];
  g: GlobalSettings;
  initial?: "html" | "json";
  renderHtml: () => Promise<string>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"html" | "json">(initial);
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [loadingHtml, setLoadingHtml] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (mode === "html" && html === null && !loadingHtml) {
      setLoadingHtml(true);
      renderHtml()
        .then((h) => {
          if (!cancelled) setHtml(h);
        })
        .catch(() => {
          if (!cancelled) setHtml("<!-- No se pudo generar el HTML. -->");
        })
        .finally(() => {
          if (!cancelled) setLoadingHtml(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [mode, html, loadingHtml, renderHtml]);

  const code = useMemo(() => {
    if (mode === "json") return buildJSON(rows, g);
    return loadingHtml ? "Generando HTML con React Email…" : html ?? "";
  }, [mode, rows, g, html, loadingHtml]);

  const copy = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const tabs = [
    { id: "html", label: "HTML", icon: "file-code-2" },
    { id: "json", label: "JSON", icon: "braces" },
  ] as const;

  return (
    <Overlay onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(860px,94vw)", height: "min(620px,88vh)", background: UI.surface, borderRadius: 16, boxShadow: "0 30px 80px rgba(15,37,66,.3)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "pop .2s cubic-bezier(.34,1.56,.64,1)" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid " + UI.borderSubtle, gap: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: UI.text, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="code-2" size={17} color={UI.accent} /> Ver código
          </span>
          <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
            {tabs.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setMode(t.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid " + (mode === t.id ? UI.border : "transparent"),
                  background: mode === t.id ? UI.accentSoft : "transparent",
                  color: mode === t.id ? UI.accent : UI.textMuted,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <Icon name={t.icon} size={14} />
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Btn variant="ghost" size="sm" icon={copied ? "check" : "copy"} onClick={copy}>
              {copied ? "Copiado" : "Copiar"}
            </Btn>
            <button
              type="button"
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid " + UI.border, background: UI.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: UI.textMuted }}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        </div>
        <pre style={{ flex: 1, overflow: "auto", margin: 0, padding: "18px 20px", background: "#0F1B2D", color: "#cde3f7", fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, lineHeight: 1.65, whiteSpace: "pre" }}>
          {code}
        </pre>
      </div>
    </Overlay>
  );
}

/* ── Media gallery ── */
/** Máximo peso aceptado al subir una imagen (debe coincidir con el endpoint
 *  /api/templates/media/upload, que lo valida del lado del servidor). */
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
type MediaItem = { name: string; src: string };
// NOTA: la biblioteca ya NO usa localStorage. Antes se guardaba en `becrm_media`, que es GLOBAL
// del navegador (por-origen) y NO distingue workspace → filtraba imágenes de un workspace a otro.
// Ahora se lista la carpeta real del workspace en el servidor (prop `listFiles`).

/** ¿La URL apunta a un GIF (que sigue animado tras la optimización)? */
const isGifSrc = (src: string) => /\.gif(\?|$)/i.test(src) || src.startsWith("data:image/gif");

export function MediaModal({
  onPick,
  onClose,
  uploadFile,
  deleteFile,
  listFiles,
  searchPhotos,
}: {
  onPick: (src: string) => void;
  onClose: () => void;
  uploadFile?: (file: File) => Promise<string>;
  deleteFile?: (urls: string[]) => Promise<void>;
  listFiles?: () => Promise<MediaItem[]>;
  /** Buscador de fotos de stock del anfitrión. Si falta, esa pestaña no existe. */
  searchPhotos?: (query: string) => Promise<StockPhoto[]>;
}) {
  const [tab, setTab] = useState<"lib" | "pexels">("lib");
  const [q, setQ] = useState("");
  const [lib, setLib] = useState<MediaItem[]>([]);
  const [libLoading, setLibLoading] = useState<boolean>(Boolean(listFiles));
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Multi-select + delete confirmation for the library.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirmSrcs, setConfirmSrcs] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toggleSelected = (src: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });

  // Fotos de stock (proveedor del anfitrión)
  const [pq, setPq] = useState("iglesia comunidad");
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [pexelsLoading, setPexelsLoading] = useState(false);
  const [pexelsError, setPexelsError] = useState("");


  // `listFiles` (= `loadLibrary` del anfitrión) sufre el mismo problema de
  // identidad que `renderHtml` (ver EmailEditor.tsx/modals.tsx): si se pasa
  // inline, cambia en cada re-render del anfitrión y, como este modal se queda
  // MONTADO mientras está abierto, cualquier re-render ajeno (p.ej. el de
  // "sin guardar" que dispara `onChange`) volvía a poner la biblioteca en
  // carga y a re-pedirla al servidor. Se guarda en una ref (mismo patrón que
  // `onReadyRef`) y el efecto pasa a depender solo del montaje: carga una vez
  // al abrir el modal, con el `listFiles` vigente en ese momento.
  const listFilesRef = useRef(listFiles);
  listFilesRef.current = listFiles;
  // Carga la biblioteca del WORKSPACE desde el servidor (carpeta templates/<tableId>/...).
  // Reemplaza el caché localStorage global del navegador que filtraba entre workspaces.
  useEffect(() => {
    const fn = listFilesRef.current;
    if (!fn) {
      setLibLoading(false);
      return;
    }
    let cancelled = false;
    setLibLoading(true);
    fn()
      .then((items) => {
        if (!cancelled) setLib(items);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLibLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const list = lib.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const choose = (src: string, item?: MediaItem) => {
    // Picks externos (Pexels) se añaden solo a la lista en memoria de esta sesión; no se
    // guardan en la biblioteca del workspace (esa solo refleja imágenes subidas a Storage).
    if (item) setLib((prev) => (prev.find((m) => m.src === item.src) ? prev : [item, ...prev]));
    onPick(src);
  };

  const confirmDelete = async () => {
    if (!confirmSrcs || confirmSrcs.length === 0 || deleting) return;
    setDeleting(true);
    setError("");
    try {
      if (deleteFile) await deleteFile(confirmSrcs);
      const removed = new Set(confirmSrcs);
      setLib((prev) => prev.filter((m) => !removed.has(m.src)));
      setSelected((prev) => {
        const next = new Set(prev);
        confirmSrcs.forEach((s) => next.delete(s));
        return next;
      });
      setConfirmSrcs(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar la imagen. Intenta nuevamente.");
      setConfirmSrcs(null);
    } finally {
      setDeleting(false);
    }
  };

  const doPexelsSearch = async (term?: string) => {
    if (!searchPhotos) return;
    const query = (term ?? pq).trim() || "comunidad";
    setPexelsLoading(true);
    setPexelsError("");
    try {
      const photos = await searchPhotos(query);
      setResults(photos);
      if (!photos.length) setPexelsError("Sin resultados para esa búsqueda.");
    } catch {
      setPexelsError("No se pudieron cargar las imágenes de Pexels en este momento.");
    } finally {
      setPexelsLoading(false);
    }
  };

  // Auto-cargar resultados la primera vez que se abre el tab de Pexels
  useEffect(() => {
    if (searchPhotos && tab === "pexels" && !results.length && !pexelsLoading && !pexelsError) doPexelsSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, searchPhotos]);

  const resetFileInput = () => {
    // Permite volver a elegir el mismo archivo (re-dispara onChange).
    if (fileRef.current) fileRef.current.value = "";
  };

  const processFile = async (f: File | null | undefined) => {
    if (!f || uploading || compressing) return;
    setError("");
    if (!f.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen (PNG, JPG o GIF).");
      resetFileInput();
      return;
    }

    let file = f;
    if (file.type === "image/gif") {
      // Los GIF no se optimizan en el cliente (se perdería la animación). Solo
      // validamos el tamaño; el servidor conserva el GIF tal cual.
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("El GIF supera el máximo de 5 MB y no se puede comprimir sin perder la animación. Elige uno más liviano.");
        resetFileInput();
        return;
      }
    } else {
      // Optimizamos TODA imagen para correo: ancho máx 800px, formato ideal y
      // menor peso (el servidor hace la optimización final con sharp).
      setCompressing(true);
      try {
        file = await compressImageForEmail(f, { maxBytes: MAX_UPLOAD_BYTES, maxWidth: 1600, quality: 0.82 });
      } catch {
        // Si la optimización falla, intentamos subir el original (el servidor
        // también optimiza), siempre que no supere el límite.
        file = f;
      }
      setCompressing(false);
      if (file.size > MAX_UPLOAD_BYTES) {
        setError("La imagen es demasiado grande y no pudimos optimizarla por debajo de 5 MB. Elige una más liviana.");
        resetFileInput();
        return;
      }
    }

    setUploading(true);
    try {
      let src: string;
      if (uploadFile) {
        src = await uploadFile(file);
      } else {
        src = await new Promise<string>((resolve, reject) => {
          const rd = new FileReader();
          rd.onload = () => resolve(String(rd.result));
          rd.onerror = reject;
          rd.readAsDataURL(file);
        });
      }
      const item = { name: file.name, src };
      setLib((prev) => [item, ...prev.filter((m) => m.src !== item.src)]);
      onPick(src);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen. Intenta nuevamente.");
    } finally {
      setUploading(false);
      resetFileInput();
    }
  };

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    void processFile(e.target.files?.[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    void processFile(e.dataTransfer.files?.[0]);
  };

  const inputStyle: CSSProperties = { width: "100%", border: "1px solid " + UI.border, borderRadius: 8, padding: "8px 10px 8px 34px", fontSize: 13, outline: "none", fontFamily: "inherit" };
  const tileStyle: CSSProperties = { border: "1px solid " + UI.border, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: UI.surface, padding: 0, fontFamily: "inherit", transition: "all 120ms" };
  const onTileEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = C.navy400;
    e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,37,66,.12)";
  };
  const onTileLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = UI.border;
    e.currentTarget.style.boxShadow = "none";
  };

  const tabBtn = (id: "lib" | "pexels", label: string, icon: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", borderRadius: 8, border: "1px solid " + (tab === id ? UI.border : "transparent"), background: tab === id ? UI.accentSoft : "transparent", color: tab === id ? UI.accent : UI.textMuted, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}
    >
      <Icon name={icon} size={14} />
      {label}
    </button>
  );

  return (
   <>
    <Overlay onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        style={{ width: "min(760px,94vw)", height: "min(640px,88vh)", background: UI.surface, borderRadius: 16, boxShadow: "0 30px 80px rgba(15,37,66,.3)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "pop .2s cubic-bezier(.34,1.56,.64,1)" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid " + UI.borderSubtle, gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: UI.text, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="image" size={17} color={UI.accent} /> Imágenes
          </span>
          <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
            {tabBtn("lib", "Biblioteca", "folder")}
            {/* Sin `searchPhotos` el anfitrión no ofrece fotos de stock: la
                pestaña no se pinta (nada visible y roto). */}
            {searchPhotos ? tabBtn("pexels", "Buscar en Pexels", "search") : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ marginLeft: "auto", width: 32, height: 32, borderRadius: 8, border: "1px solid " + UI.border, background: UI.surface, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: UI.textMuted }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {tab === "lib" && (
          <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: "none" }} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                if (!uploading && !compressing && !dragOver) setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={onDrop}
              disabled={uploading || compressing}
              style={{ width: "100%", border: "2px dashed " + (dragOver ? C.navy500 : C.navy200), borderRadius: 12, padding: 24, textAlign: "center", background: dragOver ? C.navy100 : C.navy50 + "80", marginBottom: 16, cursor: "pointer", fontFamily: "inherit", transition: "border-color 120ms, background 120ms" }}
            >
              <Icon name={uploading || compressing ? "loader" : "upload-cloud"} size={28} color={C.navy500} style={{ margin: "0 auto", ...(uploading || compressing ? { animation: "spin 1s linear infinite" } : {}) }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.navy900, marginTop: 8 }}>
                {compressing ? "Optimizando imagen…" : uploading ? "Subiendo…" : dragOver ? "Suelta la imagen para subirla" : "Sube una imagen o elige de tu biblioteca"}
              </div>
              <div style={{ fontSize: 12, color: UI.textMuted, marginTop: 3 }}>PNG, JPG o GIF · se optimizan automáticamente para correo (máx. 1600px de ancho)</div>
            </button>
            {error && <div style={{ fontSize: 12.5, color: C.red700, background: C.red100, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>}
            <div style={{ position: "relative", marginBottom: 14 }}>
              <Icon name="search" size={15} color={UI.textSubtle} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nombre de archivo…"
                style={inputStyle}
              />
            </div>
            {list.length > 0 &&
              (() => {
                const visibleSrcs = list.map((m) => m.src);
                const allVisibleSelected = visibleSrcs.every((s) => selected.has(s));
                const toggleAllVisible = () =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (allVisibleSelected) visibleSrcs.forEach((s) => next.delete(s));
                    else visibleSrcs.forEach((s) => next.add(s));
                    return next;
                  });
                return (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12, minHeight: 30 }}>
                    <button
                      type="button"
                      onClick={toggleAllVisible}
                      style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 8px", borderRadius: 7, border: "1px solid " + UI.border, background: UI.surface, color: UI.textMuted, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}
                    >
                      <span style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid " + (allVisibleSelected ? UI.accent : UI.borderStrong), background: allVisibleSelected ? UI.accent : UI.surface, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        {allVisibleSelected && <Icon name="check" size={11} color="#fff" />}
                      </span>
                      {allVisibleSelected ? "Quitar selección" : "Seleccionar todo"}
                    </button>
                    {selected.size > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 12, color: UI.textMuted, fontWeight: 500 }}>
                          {selected.size} seleccionada{selected.size > 1 ? "s" : ""}
                        </span>
                        <Btn variant="danger" size="sm" icon="trash-2" onClick={() => setConfirmSrcs([...selected])}>
                          Eliminar
                        </Btn>
                      </div>
                    )}
                  </div>
                );
              })()}
            {list.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: UI.textSubtle, fontSize: 13 }}>
                {libLoading
                  ? "Cargando tu biblioteca…"
                  : "Aún no hay imágenes en tu biblioteca. Sube una para empezar."}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {list.map((m) => {
                  const isSelected = selected.has(m.src);
                  return (
                    <div
                      key={m.src}
                      style={{ ...tileStyle, position: "relative", borderColor: isSelected ? C.navy500 : UI.border, boxShadow: isSelected ? "0 0 0 2px " + C.navy200 : "none" }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = C.navy400;
                          e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,37,66,.12)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = isSelected ? C.navy500 : UI.border;
                        e.currentTarget.style.boxShadow = isSelected ? "0 0 0 2px " + C.navy200 : "none";
                      }}
                    >
                      {isGifSrc(m.src) && (
                        <span style={{ position: "absolute", top: 6, left: 6, zIndex: 2, background: C.navy900, color: "#fff", fontSize: 9, fontWeight: 800, letterSpacing: ".06em", padding: "2px 6px", borderRadius: 5, pointerEvents: "none" }}>
                          GIF
                        </span>
                      )}
                      <button type="button" onClick={() => choose(m.src, m)} style={{ all: "unset", display: "block", cursor: "pointer", width: "100%", boxSizing: "border-box" }}>
                        <img src={m.src} alt={m.name} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                        <div style={{ padding: "7px 9px", fontSize: 11, color: UI.textMuted, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>{m.name}</div>
                      </button>
                      <button
                        type="button"
                        title={isSelected ? "Quitar de la selección" : "Seleccionar"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelected(m.src);
                        }}
                        style={{ position: "absolute", top: 7, left: 7, width: 22, height: 22, borderRadius: 6, border: "1.5px solid " + (isSelected ? UI.accent : UI.borderStrong), background: isSelected ? UI.accent : "rgba(255,255,255,.9)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                      >
                        {isSelected && <Icon name="check" size={13} color="#fff" />}
                      </button>
                      <button
                        type="button"
                        title="Eliminar imagen"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmSrcs([m.src]);
                        }}
                        style={{ position: "absolute", top: 7, right: 7, width: 26, height: 26, borderRadius: 7, border: "1px solid " + UI.border, background: "rgba(255,255,255,.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, color: C.red500 }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = C.red500;
                          e.currentTarget.style.color = "#fff";
                          e.currentTarget.style.borderColor = C.red500;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,.92)";
                          e.currentTarget.style.color = C.red500;
                          e.currentTarget.style.borderColor = UI.border;
                        }}
                      >
                        <Icon name="trash-2" size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "pexels" && searchPhotos && (
          <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Icon name="search" size={15} color={UI.textSubtle} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
                <input
                  value={pq}
                  onChange={(e) => setPq(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && doPexelsSearch()}
                  placeholder="Buscar fotos en Pexels…"
                  style={inputStyle}
                />
              </div>
              <Btn variant="primary" size="md" icon="search" onClick={() => doPexelsSearch()} disabled={pexelsLoading}>
                {pexelsLoading ? "Buscando…" : "Buscar"}
              </Btn>
            </div>
            {pexelsError && <div style={{ fontSize: 12.5, color: C.red700, background: C.red100, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{pexelsError}</div>}
            {pexelsLoading && (
              <div style={{ textAlign: "center", padding: 40, color: UI.textSubtle }}>
                <Icon name="loader" size={22} style={{ animation: "spin 1s linear infinite", margin: "0 auto" }} />
              </div>
            )}
            {!pexelsLoading && results.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
                {results.map((p) => {
                  const name = (p.alt || "pexels").slice(0, 28) + ".jpg";
                  return (
                    <button type="button" key={p.id} onClick={() => choose(p.large, { name, src: p.large })} style={tileStyle} onMouseEnter={onTileEnter} onMouseLeave={onTileLeave}>
                      <img src={p.thumb} alt={p.alt} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "7px 9px", fontSize: 11, color: UI.textMuted, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left" }}>© {p.photographer}</div>
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 14, fontSize: 11, color: UI.textSubtle, textAlign: "center" }}>
              Fotos por <strong>Pexels</strong>
            </div>
          </div>
        )}

      </div>
    </Overlay>

    {confirmSrcs && (
      <Overlay onClose={() => !deleting && setConfirmSrcs(null)}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ width: "min(420px,92vw)", background: UI.surface, borderRadius: 14, boxShadow: "0 30px 80px rgba(15,37,66,.3)", padding: 22, animation: "pop .2s cubic-bezier(.34,1.56,.64,1)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
            <span style={{ width: 38, height: 38, borderRadius: 10, background: C.red100, color: C.red500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="trash-2" size={19} />
            </span>
            <span style={{ fontSize: 15.5, fontWeight: 700, color: UI.text }}>
              {confirmSrcs.length > 1 ? `Eliminar ${confirmSrcs.length} imágenes` : "Eliminar imagen"}
            </span>
          </div>
          <p style={{ margin: "0 0 18px", fontSize: 13, lineHeight: 1.55, color: UI.textMuted }}>
            {confirmSrcs.length > 1
              ? `¿Seguro que quieres eliminar estas ${confirmSrcs.length} imágenes de tu biblioteca? Esta acción no se puede deshacer.`
              : "¿Seguro que quieres eliminar esta imagen de tu biblioteca? Esta acción no se puede deshacer."}
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn variant="ghost" size="md" onClick={() => setConfirmSrcs(null)} disabled={deleting}>
              Cancelar
            </Btn>
            <Btn variant="danger" size="md" icon={deleting ? "loader" : "trash-2"} onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Eliminando…" : "Eliminar"}
            </Btn>
          </div>
        </div>
      </Overlay>
    )}
   </>
  );
}

export type { EmailDesign };
