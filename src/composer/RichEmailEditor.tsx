/* ============================================================
   @begraffic/email/composer · RichEmailEditor.tsx
   Barra de herramientas + `RichTextEditor`. Portado de BeCRM sin Tailwind, sin
   `cn` y sin `@/components/ui`: los primitivos salen de `../editor/controls`
   (`Btn`, `TextInput`, `Field`, `IconBtn`), la paleta de `../editor/theme`
   (`UI`) y el shell de modal de `./ui`.

   La subida de imágenes ya no habla con Firebase Storage: la inyecta el
   anfitrión con `uploadImage`. Sin esa prop el botón de imagen no se pinta —
   el compositor nunca incrusta binarios en el HTML del correo ni deja un
   control que falle al pulsarlo.
   ============================================================ */
"use client";

import * as React from "react";
import {
  Bold,
  Code,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Underline,
  Upload,
} from "lucide-react";
import { Btn, Field, IconBtn, TextInput } from "../editor/controls";
import { UI } from "../editor/theme";
import { Modal, ModalBody, ModalFooter, ModalHeader, Textarea } from "./ui";
import { RichTextEditor, type RichTextEditorHandle } from "./RichTextEditor";

const escapeHtmlAttr = (input: string) =>
  input.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeHtmlText = (input: string) =>
  input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Tamaños de texto. El valor corresponde al atributo `size` de execCommand
// "fontSize" (1–7), consistente con el resto de comandos del editor.
const FONT_SIZES: { label: string; value: string }[] = [
  { label: "Pequeño", value: "2" },
  { label: "Normal", value: "3" },
  { label: "Mediano", value: "4" },
  { label: "Grande", value: "5" },
  { label: "Muy grande", value: "6" },
];

/* En BeCRM el giro del spinner venía de `animate-spin` (Tailwind). Aquí lo
   trae el propio paquete, con nombre propio para no pisar keyframes ajenos. */
const SPIN_CSS = "@keyframes bge-spin{to{transform:rotate(360deg)}}";
const SPIN = { animation: "bge-spin 1s linear infinite" } as const;

const MONO = "'JetBrains Mono',monospace";

type ToolbarButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

/* No se reutiliza `IconBtn` aquí: esta barra necesita `onMouseDown`
   `preventDefault` para no robarle la selección al editor antes de aplicar el
   formato, y `IconBtn` no lo hace (ni debe: en el editor visual no aplica). */
function ToolbarButton({ label, icon, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // Evita robar el foco/selección del editor antes de aplicar el formato.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      // El `hover:bg-bg-subtle` del original coincide con el fondo de la propia
      // barra, así que nunca llegaba a verse: lo visible es el cambio de color.
      onMouseEnter={(event) => (event.currentTarget.style.color = UI.text)}
      onMouseLeave={(event) => (event.currentTarget.style.color = UI.textSubtle)}
      style={{
        display: "inline-flex",
        width: 28,
        height: 28,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
        border: "none",
        padding: 0,
        background: "transparent",
        color: UI.textSubtle,
        cursor: "pointer",
        transition: "color 150ms",
      }}
    >
      {icon}
    </button>
  );
}

/** Cabecera de modal con título, descripción opcional y cierre. */
function Header({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  return (
    <ModalHeader>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 16, lineHeight: 1.25 }}>{title}</div>
          {description && (
            <div
              style={{
                marginTop: 2,
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1.5,
                color: UI.textSubtle,
              }}
            >
              {description}
            </div>
          )}
        </div>
        <IconBtn name="x" title="Cerrar" onClick={onClose} size={16} style={{ flexShrink: 0 }} />
      </div>
    </ModalHeader>
  );
}

export type RichEmailEditorHandle = {
  focus: () => void;
};

export type RichEmailEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Altura mínima en estado normal, como longitud CSS. */
  minHeight?: string;
  /** Altura mínima cuando el usuario expande el editor, como longitud CSS. */
  expandedHeight?: string;
  /** Estilo del contenedor. Sustituye al antiguo `className`. */
  style?: React.CSSProperties;
  /** Sube una imagen y devuelve su URL pública. Si falta, el botón de imagen
   *  se oculta: el composer nunca incrusta binarios en el HTML del correo. */
  uploadImage?: (file: File) => Promise<string>;
};

/**
 * Editor de cuerpo de correo con texto enriquecido (negrita, cursiva, listas,
 * enlaces) + botón para expandir el área de escritura. Compartido por el modal
 * de redacción y el cuadro de respuesta de la bandeja.
 */
// Tope para imágenes embebidas (similar al de adjuntos).
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const RichEmailEditor = React.forwardRef<RichEmailEditorHandle, RichEmailEditorProps>(
  function RichEmailEditor(
    { value, onChange, placeholder, minHeight = "160px", expandedHeight = "60vh", style, uploadImage },
    ref,
  ) {
    const editorRef = React.useRef<RichTextEditorHandle | null>(null);
    React.useImperativeHandle(ref, () => ({ focus: () => editorRef.current?.focus() }), []);
    const savedRangeRef = React.useRef<Range | null>(null);
    const [expanded, setExpanded] = React.useState(false);
    const [linkModalOpen, setLinkModalOpen] = React.useState(false);
    const [linkUrl, setLinkUrl] = React.useState("");
    const [linkText, setLinkText] = React.useState("");
    const [htmlModalOpen, setHtmlModalOpen] = React.useState(false);
    const [htmlDraft, setHtmlDraft] = React.useState("");
    const [imageModalOpen, setImageModalOpen] = React.useState(false);
    const [imageUrl, setImageUrl] = React.useState("");
    const [imageAlt, setImageAlt] = React.useState("");
    const [imageUploading, setImageUploading] = React.useState(false);
    const [imageError, setImageError] = React.useState<string | null>(null);
    const [isDraggingImage, setIsDraggingImage] = React.useState(false);
    const imageFileInputRef = React.useRef<HTMLInputElement | null>(null);
    // dragenter/leave puede dispararse para cada hijo: contamos para no parpadear.
    const dragCounterRef = React.useRef(0);

    // El <select> de tamaño pierde la selección del editor al abrirse; guardamos
    // el rango en mousedown y lo restauramos antes de aplicar el comando.
    const rememberSelection = () => {
      savedRangeRef.current = editorRef.current?.saveSelection() ?? null;
    };

    const applyFontSize = (size: string) => {
      const editor = editorRef.current;
      if (!editor || !size) return;
      editor.restoreSelection(savedRangeRef.current);
      editor.exec("fontSize", size);
      savedRangeRef.current = null;
    };

    const openHtmlModal = () => {
      setHtmlDraft(editorRef.current?.getHTML() ?? value);
      setHtmlModalOpen(true);
    };

    const applyHtml = () => {
      editorRef.current?.setHTML(htmlDraft);
      setHtmlModalOpen(false);
    };

    const openImageModal = () => {
      // Igual que el modal de enlace: guardamos selección para reinsertar
      // en el lugar correcto al confirmar.
      savedRangeRef.current = editorRef.current?.saveSelection() ?? null;
      setImageUrl("");
      setImageAlt("");
      setImageError(null);
      setImageModalOpen(true);
    };

    const closeImageModal = () => {
      setImageModalOpen(false);
      setImageUrl("");
      setImageAlt("");
      setImageError(null);
      setImageUploading(false);
      setIsDraggingImage(false);
      dragCounterRef.current = 0;
    };

    const onImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDraggingImage(false);
      dragCounterRef.current = 0;
      const file = event.dataTransfer?.files?.[0];
      if (file) void handleImageFile(file);
    };

    const handleImageFile = async (file: File) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setImageError("El archivo debe ser una imagen.");
        return;
      }
      if (file.size > IMAGE_MAX_BYTES) {
        setImageError("La imagen supera los 10 MB.");
        return;
      }
      if (!uploadImage) {
        setImageError("Subida no disponible: usa una URL pública.");
        return;
      }
      setImageError(null);
      setImageUploading(true);
      try {
        const url = await uploadImage(file);
        setImageUrl(url);
        if (!imageAlt) setImageAlt(file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        setImageError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
      } finally {
        setImageUploading(false);
      }
    };

    const confirmImage = () => {
      const editor = editorRef.current;
      const cleanUrl = imageUrl.trim();
      if (!editor || !cleanUrl) return;
      editor.restoreSelection(savedRangeRef.current);
      const altAttr = escapeHtmlAttr(imageAlt.trim() || "imagen");
      const snippet = `<img src="${escapeHtmlAttr(cleanUrl)}" alt="${altAttr}" style="max-width:100%;height:auto;" />`;
      editor.insertHTML(snippet);
      savedRangeRef.current = null;
      closeImageModal();
    };

    const openLinkModal = () => {
      const editor = editorRef.current;
      if (!editor) return;
      // Guardamos la selección porque abrir el modal le quita el foco al editor.
      savedRangeRef.current = editor.saveSelection();
      setLinkText(editor.getSelectedText());
      setLinkUrl("");
      setLinkModalOpen(true);
    };

    const closeLinkModal = () => {
      setLinkModalOpen(false);
      setLinkUrl("");
      setLinkText("");
    };

    const confirmLink = () => {
      const editor = editorRef.current;
      const cleanUrl = linkUrl.trim();
      if (!editor || !cleanUrl) return;
      editor.restoreSelection(savedRangeRef.current);
      const labelText = linkText.trim() || cleanUrl;
      const snippet = `<a href="${escapeHtmlAttr(cleanUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtmlText(labelText)}</a>`;
      editor.insertHTML(snippet);
      savedRangeRef.current = null;
      closeLinkModal();
    };

    const divider = (
      <span
        aria-hidden
        style={{ margin: "0 4px", height: 16, width: 1, background: UI.border, flexShrink: 0 }}
      />
    );

    return (
      <>
        <style>{SPIN_CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderRadius: 6,
              border: `1px solid ${UI.border}`,
              background: UI.sidebar,
              padding: 4,
            }}
          >
            <ToolbarButton
              label="Negrita"
              icon={<Bold size={14} />}
              onClick={() => editorRef.current?.exec("bold")}
            />
            <ToolbarButton
              label="Cursiva"
              icon={<Italic size={14} />}
              onClick={() => editorRef.current?.exec("italic")}
            />
            <ToolbarButton
              label="Subrayar"
              icon={<Underline size={14} />}
              onClick={() => editorRef.current?.exec("underline")}
            />
            {divider}
            <select
              aria-label="Tamaño de texto"
              title="Tamaño de texto"
              defaultValue=""
              onMouseDown={rememberSelection}
              onChange={(event) => {
                applyFontSize(event.target.value);
                event.target.selectedIndex = 0;
              }}
              onMouseEnter={(event) => (event.currentTarget.style.color = UI.text)}
              onMouseLeave={(event) => (event.currentTarget.style.color = UI.textMuted)}
              style={{
                height: 28,
                borderRadius: 4,
                border: "1px solid transparent",
                background: "transparent",
                padding: "0 4px",
                fontFamily: "inherit",
                fontSize: 11,
                color: UI.textMuted,
                cursor: "pointer",
                transition: "color 150ms",
              }}
            >
              <option value="" disabled>
                Tamaño
              </option>
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
            {divider}
            <ToolbarButton
              label="Lista con viñetas"
              icon={<List size={14} />}
              onClick={() => editorRef.current?.exec("insertUnorderedList")}
            />
            <ToolbarButton
              label="Lista numerada"
              icon={<ListOrdered size={14} />}
              onClick={() => editorRef.current?.exec("insertOrderedList")}
            />
            <ToolbarButton label="Enlace" icon={<LinkIcon size={14} />} onClick={openLinkModal} />
            {uploadImage && (
              <ToolbarButton
                label="Insertar imagen"
                icon={<ImagePlus size={14} />}
                onClick={openImageModal}
              />
            )}
            <ToolbarButton label="Editar HTML" icon={<Code size={14} />} onClick={openHtmlModal} />
            <span style={{ marginLeft: "auto" }} />
            <ToolbarButton
              label={expanded ? "Reducir área" : "Expandir área"}
              icon={expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              onClick={() => setExpanded((prev) => !prev)}
            />
          </div>
          <RichTextEditor
            ref={editorRef}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight={expanded ? expandedHeight : minHeight}
          />
        </div>

        {linkModalOpen && (
          <Modal onClose={closeLinkModal} maxWidth={440}>
            <Header title="Insertar enlace" onClose={closeLinkModal} />
            <ModalBody>
              <Field label="URL" htmlFor="rich-link-url" style={{ marginBottom: 0 }}>
                <TextInput
                  id="rich-link-url"
                  type="url"
                  value={linkUrl}
                  onChange={setLinkUrl}
                  placeholder="https://ejemplo.com"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmLink();
                    }
                  }}
                />
              </Field>
              <Field label="Texto a mostrar" htmlFor="rich-link-text" style={{ marginBottom: 0 }}>
                <TextInput
                  id="rich-link-text"
                  value={linkText}
                  onChange={setLinkText}
                  placeholder="Texto del enlace (opcional)"
                />
              </Field>
            </ModalBody>
            <ModalFooter>
              <Btn variant="ghost" size="sm" onClick={closeLinkModal}>
                Cancelar
              </Btn>
              <Btn variant="primary" size="sm" onClick={confirmLink} disabled={!linkUrl.trim()}>
                Insertar enlace
              </Btn>
            </ModalFooter>
          </Modal>
        )}

        {imageModalOpen && uploadImage && (
          <Modal onClose={closeImageModal} maxWidth={440}>
            <Header
              title="Insertar imagen"
              description="Sube una imagen o pega una URL pública."
              onClose={closeImageModal}
            />
            <ModalBody>
              <Field label="URL de la imagen" htmlFor="rich-image-url" style={{ marginBottom: 0 }}>
                <TextInput
                  id="rich-image-url"
                  type="url"
                  value={imageUrl}
                  onChange={setImageUrl}
                  placeholder="https://ejemplo.com/imagen.jpg"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmImage();
                    }
                  }}
                />
              </Field>
              <Field
                label="Texto alternativo (alt)"
                htmlFor="rich-image-alt"
                style={{ marginBottom: 0 }}
              >
                <TextInput
                  id="rich-image-alt"
                  value={imageAlt}
                  onChange={setImageAlt}
                  placeholder="Describe la imagen (opcional)"
                />
              </Field>
              <div
                role="button"
                tabIndex={0}
                aria-label="Subir imagen: arrastra un archivo o haz clic"
                onClick={() => {
                  if (!imageUploading) imageFileInputRef.current?.click();
                }}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !imageUploading) {
                    event.preventDefault();
                    imageFileInputRef.current?.click();
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault();
                  dragCounterRef.current += 1;
                  setIsDraggingImage(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  // Hint visual al SO de que aceptamos copia.
                  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
                  if (dragCounterRef.current === 0) setIsDraggingImage(false);
                }}
                onDrop={onImageDrop}
                onMouseEnter={(event) => {
                  if (!isDraggingImage) event.currentTarget.style.background = UI.surfaceAlt;
                }}
                onMouseLeave={(event) => {
                  if (!isDraggingImage) event.currentTarget.style.background = UI.sidebar;
                }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  padding: "20px 12px",
                  textAlign: "center",
                  cursor: imageUploading ? "not-allowed" : "pointer",
                  opacity: imageUploading ? 0.6 : 1,
                  transition: "background 150ms, border-color 150ms, color 150ms",
                  borderColor: isDraggingImage ? UI.accent : UI.border,
                  background: isDraggingImage ? UI.accentSoft : UI.sidebar,
                  color: isDraggingImage ? UI.accent : UI.textMuted,
                }}
              >
                {imageUploading ? (
                  <Loader2 size={20} color={UI.textSubtle} style={SPIN} aria-hidden />
                ) : (
                  <Upload size={20} color={UI.textSubtle} aria-hidden />
                )}
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: UI.text }}>
                  {imageUploading
                    ? "Subiendo imagen…"
                    : isDraggingImage
                      ? "Suelta para subir"
                      : "Arrastra una imagen o haz clic para seleccionar"}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: UI.textSubtle }}>
                  Máx 10 MB · JPG, PNG, GIF, WEBP
                </p>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void handleImageFile(file);
                  }}
                />
              </div>
              {imageError && <p style={{ margin: 0, fontSize: 11, color: UI.red }}>{imageError}</p>}
            </ModalBody>
            <ModalFooter>
              <Btn variant="ghost" size="sm" onClick={closeImageModal}>
                Cancelar
              </Btn>
              <Btn
                variant="primary"
                size="sm"
                onClick={confirmImage}
                disabled={imageUploading || !imageUrl.trim()}
              >
                Insertar imagen
              </Btn>
            </ModalFooter>
          </Modal>
        )}

        {htmlModalOpen && (
          <Modal onClose={() => setHtmlModalOpen(false)} maxWidth={640}>
            <Header
              title="Editar HTML"
              description="Pega o edita el código HTML del mensaje."
              onClose={() => setHtmlModalOpen(false)}
            />
            <ModalBody>
              <Textarea
                value={htmlDraft}
                onChange={(event) => setHtmlDraft(event.target.value)}
                placeholder="<p>Tu HTML aquí…</p>"
                spellCheck={false}
                style={{ minHeight: 280, fontFamily: MONO, fontSize: 11 }}
              />
            </ModalBody>
            <ModalFooter>
              <Btn variant="ghost" size="sm" onClick={() => setHtmlModalOpen(false)}>
                Cancelar
              </Btn>
              <Btn variant="primary" size="sm" onClick={applyHtml}>
                Aplicar HTML
              </Btn>
            </ModalFooter>
          </Modal>
        )}
      </>
    );
  },
);

RichEmailEditor.displayName = "RichEmailEditor";
