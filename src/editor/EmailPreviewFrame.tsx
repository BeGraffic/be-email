"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * When the editor is open on a LOCAL origin (dev / next start / LAN IP), rewrite
 * any production app-URL in the rendered HTML to the current origin so hosted
 * images (title-image, countdown, social icons, video poster) load in the
 * preview. No-op in production (the canonical URL is correct there).
 *
 * `appUrl` is the host's own canonical URL — injected, never guessed from an
 * env-var convention (the render engine already requires the same `baseUrl`
 * explicitly; this mirrors that). When the host doesn't pass it, the rewrite
 * is skipped: the preview keeps loading the production image URLs baked into
 * the HTML (still visible, just not swapped to localhost) instead of pretending
 * to know a URL nobody gave it.
 */
function rewriteLocalImageBase(html: string, appUrl: string | undefined): string {
  if (typeof window === "undefined") return html;
  const origin = window.location.origin;
  const isLocal = /^(https?:\/\/)(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[a-z0-9-]+\.local)/i.test(origin);
  if (!isLocal) return html;
  const prod = (appUrl || "").trim().replace(/\/$/, "");
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
  /**
   * URL canónica del anfitrión (p. ej. `https://app.ejemplo.com`), la misma
   * que se le pasó al motor de render como `baseUrl`. Se usa SOLO para
   * reescribir, en local, las imágenes de producción a `window.location.origin`
   * (ver `rewriteLocalImageBase`). Si no se pasa, ese reescrito se omite sin
   * más: la preview sigue mostrando las imágenes con su URL de producción, en
   * vez de inventar un origen.
   */
  appUrl?: string;
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
  appUrl,
}: EmailPreviewFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const innerObserverRef = useRef<ResizeObserver | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [content, setContent] = useState<{ width: number; height: number } | null>(null);
  const safeHtml = useMemo(() => rewriteLocalImageBase(html, appUrl), [html, appUrl]);

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
