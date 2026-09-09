/* ============================================================
   @begraffic/email/editor · Icon.tsx
   lucide-react wrapper with a static name→component map
   (kept explicit so only the icons we use are bundled)
   ============================================================ */
import type { CSSProperties } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight,
  ArrowLeft, ArrowRight, ArrowUpToLine, ArrowDownToLine, ArrowLeftToLine, ArrowRightToLine,
  Atom, Bold, Braces, Check, CheckCircle, ChevronDown, CircleDot, Code2,
  Columns2, Columns3, CornerDownRight, Copy, ExternalLink, Eye, FileCode2, Folder, GripVertical,
  Heading, Image as ImageIcon, Info, Italic, LayoutTemplate, Link, List, ListOrdered, Loader, Menu,
  Minus, Monitor, Moon, MousePointerClick, MoveVertical, Palette, Pencil, Play,
  PlayCircle, Plus, PlusSquare, Redo2, Rows3, Save, Search, Send, Shapes, Share2,
  SlidersHorizontal, Smartphone, Strikethrough, Sun, Tablet, Timer, Trash2, Type,
  Underline, Undo2, Unlink, Upload, UploadCloud, X,
  type LucideIcon,
} from "lucide-react";
import { SOCIAL_SVG } from "./constants";

const MAP: Record<string, LucideIcon> = {
  "align-center": AlignCenter,
  "align-justify": AlignJustify,
  "align-left": AlignLeft,
  "align-right": AlignRight,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up-to-line": ArrowUpToLine,
  "arrow-down-to-line": ArrowDownToLine,
  "arrow-left-to-line": ArrowLeftToLine,
  "arrow-right-to-line": ArrowRightToLine,
  atom: Atom,
  bold: Bold,
  braces: Braces,
  check: Check,
  "check-circle": CheckCircle,
  "chevron-down": ChevronDown,
  "circle-dot": CircleDot,
  "code-2": Code2,
  "columns-2": Columns2,
  "columns-3": Columns3,
  "corner-down-right": CornerDownRight,
  copy: Copy,
  "external-link": ExternalLink,
  eye: Eye,
  "file-code-2": FileCode2,
  folder: Folder,
  "grip-vertical": GripVertical,
  heading: Heading,
  image: ImageIcon,
  info: Info,
  italic: Italic,
  "layout-template": LayoutTemplate,
  link: Link,
  list: List,
  "list-ordered": ListOrdered,
  loader: Loader,
  menu: Menu,
  minus: Minus,
  monitor: Monitor,
  moon: Moon,
  "mouse-pointer-click": MousePointerClick,
  "move-vertical": MoveVertical,
  palette: Palette,
  pencil: Pencil,
  play: Play,
  "play-circle": PlayCircle,
  plus: Plus,
  "plus-square": PlusSquare,
  "redo-2": Redo2,
  "rows-3": Rows3,
  save: Save,
  search: Search,
  send: Send,
  shapes: Shapes,
  "share-2": Share2,
  "sliders-horizontal": SlidersHorizontal,
  smartphone: Smartphone,
  strikethrough: Strikethrough,
  tablet: Tablet,
  sun: Sun,
  timer: Timer,
  "trash-2": Trash2,
  type: Type,
  underline: Underline,
  "undo-2": Undo2,
  unlink: Unlink,
  upload: Upload,
  "upload-cloud": UploadCloud,
  x: X,
};

export type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: CSSProperties;
};

export function Icon({ name, size = 16, color = "currentColor", style }: IconProps) {
  const Cmp = MAP[name];
  if (!Cmp) {
    return (
      <span
        aria-hidden
        style={{ display: "inline-block", width: size, height: size, ...style }}
      />
    );
  }
  return (
    <Cmp
      aria-hidden
      size={size}
      color={color}
      strokeWidth={2}
      style={{ flexShrink: 0, display: "block", ...style }}
    />
  );
}

export function SocialGlyph({
  net,
  size = 18,
  color = "#fff",
}: {
  net: string;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      style={{ display: "block" }}
      aria-hidden
    >
      <path d={SOCIAL_SVG[net] || ""} />
    </svg>
  );
}

/** Logomark de Be Graffic (disponible para el chrome del anfitrión). */
export function LogoMark({ size = 22, color = "white" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 413 221.5" width={size} height={size * 0.536} style={{ display: "block" }}>
      <rect y="0" width="139.1" height="80.4" fill={color} />
      <rect y="115" width="193.2" height="106.5" fill={color} />
      <rect x="237.4" y="88.7" width="175.6" height="44.4" fill={color} />
      <rect x="237.4" y="0.3" width="175.6" height="44.4" fill={color} />
      <rect x="237.4" y="177" width="175.6" height="44.4" fill={color} />
    </svg>
  );
}
