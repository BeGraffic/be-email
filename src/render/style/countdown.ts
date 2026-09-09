/* ============================================================
   BeCRM — Email Builder · style/countdown.ts
   URL helper for the countdown image. Pure (client + server safe). The renderer
   uses this for the live-endpoint fallback; the asset key is derived from it.
   ============================================================ */
export type CountdownParams = {
  target?: string;
  color?: string;
  boxBg?: string;
  labelColor?: string;
  showLabels?: boolean;
};

export function countdownUrl(b: CountdownParams, base = ""): string {
  const p = new URLSearchParams({
    target: b.target ?? "",
    color: b.color ?? "#0F2542",
    boxBg: b.boxBg ?? "#F4F6FA",
    labelColor: b.labelColor ?? "#737373",
    labels: b.showLabels === false ? "0" : "1",
  });
  return `${base}/api/email/countdown?${p.toString()}`;
}
