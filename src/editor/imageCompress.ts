/* ============================================================
   @begraffic/email/editor · imageCompress.ts
   Optimización de imágenes del lado del cliente (canvas), aplicada a TODA
   imagen antes de subirla: limita el ancho a un máximo apto para correo
   (1600px = 2× retina; el alto escala proporcional, sin tope), re-codifica al
   formato ideal y reduce el peso. El servidor
   (/api/templates/media/upload) hace la optimización final con sharp.
   - GIF: no se toca (la animación se perdería) — el llamador lo gestiona.
   - PNG: se mantiene PNG para conservar la transparencia; si aun así no baja
     del límite, cae a JPEG (aplanado sobre blanco) como último recurso.
   - Resto: JPEG con calidad decreciente hasta entrar bajo el límite.
   La re-codificación descarta los metadatos (EXIF/DPI de impresión), dejando
   las imágenes con resolución de pantalla.
   ============================================================ */
"use client";

export type CompressOpts = {
  /** Techo de peso en bytes (el resultado intenta quedar por debajo). */
  maxBytes: number;
  /** Ancho máximo en px (no agranda imágenes más pequeñas). */
  maxWidth?: number;
  /** Calidad JPEG inicial (0-1). */
  quality?: number;
};

type Decoded = { source: CanvasImageSource; width: number; height: number; cleanup: () => void };

async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, cleanup: () => bmp.close() };
    } catch {
      /* algunos formatos fallan en createImageBitmap → usar <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
      i.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function scaledByWidth(w: number, h: number, maxW: number): { w: number; h: number } {
  // Los correos limitan el ancho; la altura escala proporcional (sin tope) y
  // nunca se agranda una imagen más pequeña que el máximo.
  if (w <= maxW) return { w, h };
  const ratio = maxW / w;
  return { w: maxW, h: Math.max(1, Math.round(h * ratio)) };
}

function renderToBlob(
  source: CanvasImageSource,
  ow: number,
  oh: number,
  maxW: number,
  mime: string,
  quality: number,
): Promise<Blob | null> {
  const { w, h } = scaledByWidth(ow, oh, maxW);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  if (mime === "image/jpeg") {
    // Aplana transparencias sobre blanco (si no, quedan en negro al exportar JPEG).
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(source, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

function blobToFile(blob: Blob, originalName: string, mime: string): File {
  const ext = mime === "image/png" ? "png" : "jpg";
  const base = originalName.replace(/\.[^.]+$/, "").trim() || "imagen";
  return new File([blob], `${base}.${ext}`, { type: mime });
}

/**
 * Optimiza una imagen para correo: limita el ancho a `maxWidth` (800px por
 * defecto), la re-codifica al formato adecuado (PNG si la original es PNG, para
 * conservar transparencia; JPEG en el resto) y reduce el peso por debajo de
 * `maxBytes`. Devuelve un nuevo File (JPEG o PNG) o, si no logra entrar bajo el
 * límite, el mejor resultado posible (el llamador valida el tamaño final).
 * Los GIF se devuelven sin tocar (conservan la animación).
 */
export async function compressImageForEmail(file: File, opts: CompressOpts): Promise<File> {
  if (file.type === "image/gif") return file;

  const maxWidth = opts.maxWidth ?? 1600;
  const { source, width, height, cleanup } = await decode(file);
  try {
    let mime = file.type === "image/png" ? "image/png" : "image/jpeg";
    let quality = opts.quality ?? 0.82;
    let targetWidth = maxWidth;
    let best: Blob | null = null;

    for (let attempt = 0; attempt < 6; attempt++) {
      const blob = await renderToBlob(source, width, height, targetWidth, mime, quality);
      if (blob) best = blob;
      if (blob && blob.size <= opts.maxBytes) {
        return blobToFile(blob, file.name, mime);
      }
      // Aún muy grande: estrategia de reducción progresiva.
      if (mime === "image/png" && attempt >= 1) {
        // Un PNG que no cede: aplanar a JPEG es mucho más liviano.
        mime = "image/jpeg";
        quality = 0.82;
      } else {
        targetWidth = Math.round(targetWidth * 0.85);
        if (mime === "image/jpeg") quality = Math.max(0.5, quality - 0.1);
      }
    }
    return best ? blobToFile(best, file.name, mime) : file;
  } finally {
    cleanup();
  }
}
