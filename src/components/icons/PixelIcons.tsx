"use client";

// Icon library — Lucide React (thin-line SVG).
// Same interface as before: PixelIcon + named exports.
// Nothing else in the codebase needs to change.

import {
  FileText, Terminal, Link, GitBranch, Hash, Bug, Shield,
  Search, Bookmark, Sparkles, Lock, Eye, Folder, Plus,
  Check, X, ArrowRight, Settings, Pencil, List, Columns2,
  ChevronsUpDown, HelpCircle, Network, Copy, Send, Code,
  Globe, Flag, Image, Upload, ChevronRight, Tag, BookOpen,
} from "lucide-react";
import type { LucideProps } from "lucide-react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// Map icon names → Lucide components
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  note:          FileText,
  terminal:      Terminal,
  link:          Link,
  graph:         Network,
  tag:           Hash,
  bug:           Bug,
  shield:        Shield,
  search:        Search,
  bookmark:      Bookmark,
  sparkle:       Sparkles,
  lock:          Lock,
  eye:           Eye,
  folder:        Folder,
  plus:          Plus,
  check:         Check,
  x:             X,
  arrowRight:    ArrowRight,
  cog:           Settings,
  pencil:        Pencil,
  outline:       List,
  columns:       Columns2,
  chevronUpDown: ChevronsUpDown,
  help:          HelpCircle,
};

export function PixelIcon({
  name,
  size = 16,
  color = "currentColor",
  className,
}: {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const Icon = ICON_MAP[name];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={1.5}
      className={className}
      style={{ display: "block", flexShrink: 0 }}
    />
  );
}

// ── Named exports (used throughout existing codebase) ──────────────────

function makeIcon(Icon: React.ComponentType<LucideProps>) {
  return function NamedIcon({ size = 16, color = "currentColor", className }: IconProps) {
    return (
      <Icon
        size={size}
        color={color}
        strokeWidth={1.5}
        className={className}
        style={{ display: "block", flexShrink: 0 }}
      />
    );
  };
}

export const IconSearch        = makeIcon(Search);
export const IconPlus          = makeIcon(Plus);
export const IconFile          = makeIcon(FileText);
export const IconFolder        = makeIcon(Folder);
export const IconCheck         = makeIcon(Check);
export const IconX             = makeIcon(X);
export const IconSparkle       = makeIcon(Sparkles);
export const IconAI            = makeIcon(Sparkles);
export const IconSettings      = makeIcon(Settings);
export const IconPencil        = makeIcon(Pencil);
export const IconOutline       = makeIcon(List);
export const IconColumns       = makeIcon(Columns2);
export const IconChevronUpDown = makeIcon(ChevronsUpDown);
export const IconHelp          = makeIcon(HelpCircle);
export const IconChevronDown   = makeIcon(ChevronsUpDown);
export const IconChevronRight  = makeIcon(ChevronRight);
export const IconLink          = makeIcon(Link);
export const IconBug           = makeIcon(Bug);
export const IconTag           = makeIcon(Tag);
export const IconShield        = makeIcon(Shield);
export const IconEye           = makeIcon(Eye);
export const IconTerminal      = makeIcon(Terminal);
export const IconGraph         = makeIcon(Network);
export const IconBookmark      = makeIcon(Bookmark);
export const IconLock          = makeIcon(Lock);
export const IconArrowRight    = makeIcon(ArrowRight);
export const IconCopy          = makeIcon(Copy);
export const IconSend          = makeIcon(Send);
export const IconCode          = makeIcon(Code);
export const IconGlobe         = makeIcon(Globe);
export const IconFlag          = makeIcon(Flag);
export const IconNetwork       = makeIcon(Network);
export const IconImage         = makeIcon(Image);
export const IconUpload        = makeIcon(Upload);
export const IconBookOpen      = makeIcon(BookOpen);
export const IconGitBranch     = makeIcon(GitBranch);
