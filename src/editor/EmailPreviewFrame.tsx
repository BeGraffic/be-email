"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** `process` solo existe si el anfitrión es un bundler que lo define (Next lo
 *  hace, e inlinea `process.env.NEXT_PUBLIC_*` en tiempo de build). Se declara
 *  a nivel de módulo para no arrastrar `@types/node` al paquete. */
declare const process: { env: Record<string, string | undefined> } | undefined;

/** URL canónica del anfitrión, si la publica. Fuera de un bundler que defina
 *  `process` (p. ej. un host que no sea Next) devuelve "" y el reescrito se
 *  omite: es una comodidad de desarrollo, no un requisito del editor.
 *  La expresión `process.env.NEXT_PUBLIC_APP_URL` se escribe literal a
 *  propósito — Next la sustituye por texto y cualquier variante (opcional,
 *  desestructurada) rompería esa sustitución. */
function hostAppUrl(): string {
  if (typeof process === "undefined" || !process.env) return "";
  return (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
}

/** When the editor is open on a LOCAL origin (dev / next start / LAN IP), rewrite
 *  any production app-URL in the rendered HTML to the current origin so hosted
 *  images (title-image, countdown, social icons, video poster) load in the
 *  preview. No-op in production (the canonical URL is correct there). */
function rewriteLocalImageBase(html: string): string {
  if (typeof window === "undefined") return html;
  const origin = window.location.origin;
  const isLocal = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[a-z0-9-]+\.local)/i.test(origin);
  if (!isLocal) return html;
  const prod = hostAppUrl();
  if (!prod || prod === origin) return html;
  return html.split(prod).join(origin);
}

type EmailPreviewFrameProps = {
  /** Send-safe email HTML (rendered from the design). */
  html: string;
  /** Accessible iframe title. */
  title: string;
  /**
   * Viewport width (px) the email is rendered at. This sets the responsive
   * breakpoint: 375 makes responsive emails reflow to their mobile layout,
   * ~680 shows the desktop layout. The content is then measured and scaled so
   * it always fits the available width with no horizontal scroll — including
   * fixed-width (non-responsive) emails that cannot reflow.
   */
  renderWidth?: number;
  /** Height (px) shown before the content is measured. */
  minHeight?: number;
  /** Classes for the outer wrapper (it owns the visible box). */
  className?: string;
};

/**
 * Renders an email and scales it down to fit the available width. We render at
 * `renderWidth` (the emulated viewport), measure the real content size, then
 * apply a uniform scale so nothing overflows — the email is shown whole, like a
 * faithful thumbnail, regardless of how its internal tables are sized.
 */
export function EmailPreviewFrame({
  html,
  title,
  renderWidth = 375,
  minHeight = 200,
  className,
}: EmailPreviewFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const innerObserverRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [content, setContent] = useState<{ width: number; height: number } | null>(null);
  const safeHtml = useMemo(() => rewriteLocalImageBase(html), [html]);

  // Track the width the section actually gives us.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset measurements when the emulated viewport changes so we re-measure at
  // the new breakpoint instead of reusing a stale (e.g. desktop) size.
  useEffect(() => {
    setContent(null);
  }, [renderWidth, html]);

  const measure = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const win = iframeRef.current?.contentWindow as (Window & typeof globalThis) | null;
    if (!doc || !win) return;
    const compute = () => {
      const body = doc.body;
      const root = doc.documentElement;
      if (!body || !root) return;
      // Real content size. Width is at least renderWidth; for fixed-width emails
      // it will be larger (the part that would otherwise overflow).
      const width = Math.max(body.scrollWidth, root.scrollWidth, renderWidth);
      const height = Math.max(body.scrollHeight, root.scrollHeight);
      if (width > 0 && height > 0) {
        setContent((prev) =>
          prev && prev.width === width && prev.height === height ? prev : { width, height },
        );
      }
    };
    compute();
    // Re-measure as images, fonts and other async content settle the layout.
    innerObserverRef.current?.disconnect();
    try {
      const ro = new win.ResizeObserver(compute);
      if (doc.body) ro.observe(doc.body);
      innerObserverRef.current = ro;
    } catch {
      // ResizeObserver unavailable in the frame — a single measure is enough.
    }
  }, [renderWidth]);

  useEffect(() => () => innerObserverRef.current?.disconnect(), []);

  const naturalWidth = content?.width ?? renderWidth;
  const naturalHeight = content?.height ?? minHeight;
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / naturalWidth) : 1;

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ height: naturalHeight * scale, overflow: "hidden" }}
    >
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={safeHtml}
        // allow-same-origin is needed so the parent can measure contentDocument;
        // allow-scripts is intentionally absent (email HTML never needs JS and the
        // content is attacker-influenceable). No popup grants: a preview must not
        // be able to spawn an un-sandboxed window via a link/meta-refresh.
        sandbox="allow-same-origin"
        scrolling="no"
        onLoad={measure}
        style={{
          width: naturalWidth,
          height: naturalHeight,
          border: 0,
          display: "block",
          background: "#ffffff",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}
