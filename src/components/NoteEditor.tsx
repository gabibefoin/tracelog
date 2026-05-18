"use client";

import { useState, useRef, useEffect } from "react";
import type { Note, Block, TagEntry } from "@/types";
import { PixelIcon } from "@/components/icons/PixelIcons";
import dynamic from "next/dynamic";

const ExcalidrawCanvas = dynamic(
  () => import("@/components/canvas/ExcalidrawCanvas"),
  { ssr: false, loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#111111", color: "#555", fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13 }}>
      loading canvas…
    </div>
  )}
);

interface NoteEditorProps {
  note: Note;
  notes: Note[];
  mode: "light" | "dark";
  onUpdate: (updates: Partial<Pick<Note, "title" | "content" | "body" | "tags" | "folder" | "excerpt" | "canvas_data">>) => void;
  onDelete: () => void;
  onLinkNavigate: (title: string) => void;
  onOpenAI: () => void;
  onToggleTheme: () => void;
}

const LIGHT = {
  canvas: "#F4F1E8", surface: "#FBF8EF", raised: "#FFFCF4",
  ink: "#1A1814", inkDim: "#5C564B", inkFaint: "#8B8678",
  rule: "#E3DECF", ruleSoft: "#EBE6D8",
};
const DARK_TOKENS = {
  canvas: "#1F1D1A", surface: "#26241F", raised: "#2E2B25",
  ink: "#ECE7D9", inkDim: "#A29B8C", inkFaint: "#6E6A60",
  rule: "#3A3631", ruleSoft: "#322F2A",
};
const DARK_CODE = { canvas: "#1F1D1A", rule: "#3A3631", ink: "#ECE7D9", inkDim: "#A29B8C" };
const RED = "#DB4842";
const RED_SOFT = "#F4D8D6";
const RED_SOFT_DARK = "#3A2220";
const SIGNAL_TINT = "#F1E1C8";
const SIGNAL = "#BC8438";
const TAG_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  scope:   { bg: "#DCE7E8", fg: "#4D7C84", bd: "#4D7C84" },
  recon:   { bg: "#E4E1EC", fg: "#6E6B96", bd: "#6E6B96" },
  patched: { bg: "#DFE5D8", fg: "#6E8462", bd: "#6E8462" },
  signal:  { bg: SIGNAL_TINT, fg: SIGNAL, bd: SIGNAL },
  vuln:    { bg: RED, fg: "#FFFCF4", bd: RED },
  neutral: { bg: "transparent", fg: "#5C564B", bd: "#E3DECF" },
};

// ── Inline parser ────────────────────────────────────────────────────
function renderInline(text: string, mode: "light" | "dark", onLink: (t: string) => void): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0, key = 0;
  const re = /`([^`]+)`|\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) parts.push(text.slice(i, m.index));
    if (m[1] != null) {
      parts.push(
        <span key={key++} style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 13,
          background: mode === "light" ? RED_SOFT : RED_SOFT_DARK,
          color: RED,
          padding: "1px 6px",
          borderRadius: 4,
        }}>
          {m[1]}
        </span>
      );
    } else {
      parts.push(
        <span
          key={key++}
          onClick={() => onLink(m![2])}
          style={{ color: RED, borderBottom: `1px dotted ${RED}`, cursor: "pointer" }}
        >
          [[{m[2]}]]
        </span>
      );
    }
    i = m.index + m[0].length;
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

// ── Body block renderer ──────────────────────────────────────────────
function Body({ blocks, mode, onLink }: { blocks: Block[]; mode: "light" | "dark"; onLink: (t: string) => void }) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {blocks.map((b, i) => {
        if (b.type === "p") {
          return (
            <p key={i} style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontSize: 16, lineHeight: 1.65, color: c.ink, margin: 0,
            }}>
              {renderInline(b.v as string, mode, onLink)}
            </p>
          );
        }
        if (b.type === "h2") {
          return (
            <h2 key={i} style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
              color: c.ink, margin: "8px 0 -4px",
            }}>
              {b.v as string}
            </h2>
          );
        }
        if (b.type === "ol" || b.type === "ul") {
          const Tag = b.type as "ol" | "ul";
          return (
            <Tag key={i} style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontSize: 15, lineHeight: 1.65, color: c.ink, paddingLeft: 24, margin: 0,
            }}>
              {(b.v as string[]).map((item, j) => (
                <li key={j} style={{ marginBottom: 4 }}>
                  {renderInline(item, mode, onLink)}
                </li>
              ))}
            </Tag>
          );
        }
        if (b.type === "code") {
          return (
            <div key={i} style={{
              background: DARK_CODE.canvas,
              border: `1px solid ${DARK_CODE.rule}`,
              borderRadius: 10,
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 12px",
                borderBottom: `1px solid ${DARK_CODE.rule}`,
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10, color: DARK_CODE.inkDim,
                letterSpacing: "0.06em",
              }}>
                <PixelIcon name="terminal" size={14} color={RED} />
                <span style={{ flex: 1 }}>{b.lang ?? "txt"}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(b.v as string)}
                  style={{
                    background: "transparent", color: DARK_CODE.inkDim,
                    border: `1px solid ${DARK_CODE.rule}`, borderRadius: 4,
                    padding: "1px 7px", fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: 9, cursor: "pointer",
                  }}
                >
                  COPY
                </button>
              </div>
              <pre style={{
                margin: 0, padding: "12px 14px",
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 13, lineHeight: 1.7,
                color: DARK_CODE.ink, whiteSpace: "pre-wrap",
              }}>
                {b.v as string}
              </pre>
            </div>
          );
        }
        if (b.type === "callout") {
          const tone = b.tone === "vuln" ? RED : SIGNAL;
          const bg = b.tone === "vuln"
            ? (mode === "light" ? RED_SOFT : RED_SOFT_DARK)
            : (mode === "light" ? SIGNAL_TINT : "rgba(188,132,56,0.12)");
          return (
            <div key={i} style={{
              display: "flex", gap: 12,
              padding: 14, background: bg,
              borderRadius: 10, borderLeft: `3px solid ${tone}`,
            }}>
              <PixelIcon name="bug" size={16} color={tone} />
              <div style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 15, color: c.ink, lineHeight: 1.55,
              }}>
                {b.v as string}
              </div>
            </div>
          );
        }
        if (b.type === "links") {
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(b.v as string[]).map((l, j) => (
                <div
                  key={j}
                  onClick={() => onLink(l)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 12px",
                    border: `1px solid ${c.rule}`,
                    borderRadius: 8,
                    background: c.surface,
                    cursor: "pointer",
                  }}
                >
                  <PixelIcon name="link" size={14} color={RED} />
                  <span style={{
                    fontFamily: '"Newsreader", Georgia, serif',
                    fontSize: 14, color: c.ink, flex: 1,
                  }}>
                    {l}
                  </span>
                  <PixelIcon name="arrowRight" size={14} color={c.inkFaint} />
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ── Graph view ────────────────────────────────────────────────────────
const DOT_COLORS: Record<string, string> = {
  red: RED, signal: SIGNAL, recon: "#6E6B96", scope: "#4D7C84", patched: "#6E8462",
};
function dotColor(dot: string, inkFaint: string) { return DOT_COLORS[dot] ?? inkFaint; }

function GraphView({ notes, focusId, mode }: { notes: Note[]; focusId: string; mode: "light" | "dark" }) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  const cx = 360, cy = 280;
  const focus = notes.findIndex((n) => n.id === focusId);
  const safeNotes = notes.length > 0 ? notes : [{ id: focusId, title: "", dot: "neutral" } as Note];
  const nodes = safeNotes.map((n, i) => {
    if (i === focus) return { ...n, x: cx, y: cy, r: 12, big: true };
    const k = i < focus ? i : i - 1;
    const total = Math.max(safeNotes.length - 1, 1);
    const ang = (k / total) * Math.PI * 2 - Math.PI / 2;
    const dist = 170 + (k % 2) * 40;
    return { ...n, x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist, r: 7, big: false };
  });
  const edges: [number, number][] = [];
  safeNotes.forEach((_, i) => { if (i !== focus) edges.push([focus, i]); });
  if (safeNotes.length > 2) { edges.push([1, 3 < safeNotes.length ? 3 : 1]); }

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: c.canvas, position: "relative",
    }}>
      <svg viewBox="0 0 720 560" width="100%" height="100%" style={{ maxHeight: 560 }}>
        {edges.map(([a, b], i) => (
          <line key={i}
            x1={nodes[a]?.x ?? cx} y1={nodes[a]?.y ?? cy}
            x2={nodes[b]?.x ?? cx} y2={nodes[b]?.y ?? cy}
            stroke={c.rule} strokeWidth="1"
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            {n.big && (
              <circle cx={n.x} cy={n.y} r={n.r + 12}
                fill="none" stroke={RED} strokeOpacity="0.3" />
            )}
            <circle cx={n.x} cy={n.y} r={n.r} fill={dotColor(n.dot, c.inkFaint)} />
            <text
              x={n.x} y={n.y + n.r + 16}
              textAnchor="middle"
              fill={n.big ? c.ink : c.inkDim}
              fontFamily='"IBM Plex Sans", -apple-system, sans-serif'
              fontSize="11"
              fontWeight={n.big ? 600 : 400}
            >
              {n.title.length > 28 ? n.title.slice(0, 28) + "…" : n.title}
            </text>
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", top: 20, left: 22, display: "flex", gap: 6 }}>
        <span style={{
          background: RED, color: "#FFFCF4",
          padding: "2px 9px", borderRadius: 999,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5,
          display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 999, background: "#FFFCF4" }} />
          {notes.length} notes
        </span>
        <span style={{
          background: "transparent", color: c.inkDim,
          border: `1px solid ${c.rule}`,
          padding: "2px 9px", borderRadius: 999,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5,
        }}>
          depth 2
        </span>
      </div>
    </div>
  );
}

// ── Tag pill ────────────────────────────────────────────────────────
function TagPill({ variant, label, onRemove }: { variant: string; label: string; mode?: "light" | "dark"; onRemove?: () => void }) {
  const s = TAG_STYLES[variant] ?? TAG_STYLES.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: onRemove ? "2px 6px 2px 6px" : "2px 9px 2px 6px",
      border: `1px solid ${s.bd}`,
      background: s.bg,
      color: s.fg,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10.5, letterSpacing: "0.04em", borderRadius: 999,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: variant === "vuln" ? "#FFFCF4" : s.bd, flexShrink: 0 }} />
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: s.fg, padding: "0 0 0 2px", lineHeight: 1, fontSize: 13 }}>×</button>
      )}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export function NoteEditor({ note, notes, mode, onUpdate, onDelete, onLinkNavigate, onOpenAI, onToggleTheme }: NoteEditorProps) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  const [view, setView] = useState<"editor" | "graph" | "canvas">("editor");
  const [editingContent, setEditingContent] = useState(false);
  const [localContent, setLocalContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const noteId = note.id;
  useEffect(() => { setLocalContent(note.content); setEditingContent(false); }, [noteId]); // eslint-disable-line

  function scheduleSync(content: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate({ content }), 500);
  }

  const hasBlocks = note.body && note.body.length > 0;

  // Canvas mode takes over the full column
  if (view === "canvas") {
    return (
      <section style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <ExcalidrawCanvas
          noteId={note.id}
          noteTitle={note.title}
          initialData={note.canvas_data}
          mode={mode}
          onSave={(data) => onUpdate({ canvas_data: data })}
          onBack={() => setView("editor")}
        />
      </section>
    );
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", background: c.canvas, overflow: "hidden", height: "100%" }}>

      {/* ── Top toolbar ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 22px",
        borderBottom: `1px solid ${c.rule}`,
        flexShrink: 0,
      }}>
        {/* Breadcrumb */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10.5, color: c.inkFaint, letterSpacing: "0.06em",
          flex: 1, minWidth: 0,
        }}>
          <PixelIcon name="folder" size={14} color={c.inkFaint} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {note.folder} / {note.title.toLowerCase().replace(/\s+/g, "-") || "untitled"}
          </span>
        </div>

        {/* View tabs */}
        <div style={{
          display: "flex", gap: 2,
          background: c.surface,
          border: `1px solid ${c.rule}`,
          borderRadius: 8, padding: 2,
        }}>
          {([["pencil", "editor"], ["graph", "graph"], ["columns", "canvas"]] as [string, "editor" | "graph" | "canvas"][]).map(([icon, v]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 6,
                background: view === v ? c.raised : "transparent",
                boxShadow: view === v ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                border: "none", cursor: "pointer",
                color: view === v ? c.ink : c.inkDim,
                fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                fontSize: 12, fontWeight: 500,
              }}
            >
              <PixelIcon name={icon} size={14} color={view === v ? RED : c.inkDim} />
              <span>{v}</span>
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          title="toggle theme"
          style={{
            width: 30, height: 30,
            background: "transparent",
            border: `1px solid ${c.rule}`,
            borderRadius: 6, cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <PixelIcon name={mode === "light" ? "eye" : "sparkle"} size={14} color={c.ink} />
        </button>

        {/* Ask button */}
        <button
          onClick={onOpenAI}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8,
            border: "none", cursor: "pointer",
            background: RED, color: "#FFFCF4",
            fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
            fontSize: 12, fontWeight: 500,
          }}
        >
          <PixelIcon name="sparkle" size={14} color="#FFFCF4" />
          ask
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {view === "editor" && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 32px 80px" }}>
            {/* Title */}
            <input
              type="text"
              value={note.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Untitled"
              style={{
                width: "100%",
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 42, fontWeight: 500, letterSpacing: "-0.03em",
                color: c.ink, lineHeight: 1.05,
                background: "transparent", border: "none", outline: "none",
                padding: 0,
              }}
            />

            {/* Tags + timestamp row */}
            <div style={{ display: "flex", gap: 6, marginTop: 14, marginBottom: 24, flexWrap: "wrap", alignItems: "center" }}>
              {(note.tags as TagEntry[]).map(([v, t], j) => (
                <TagPill key={j} variant={v} label={t} mode={mode}
                  onRemove={() => onUpdate({ tags: note.tags.filter((_, k) => k !== j) })} />
              ))}
              <span style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10, color: c.inkFaint, marginLeft: 6,
              }}>
                edited {new Date(note.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </span>
              <span style={{ marginLeft: "auto" }}>
                <button
                  onClick={onDelete}
                  style={{
                    background: "transparent", border: `1px solid ${c.rule}`,
                    borderRadius: 6, padding: "3px 8px", cursor: "pointer",
                    fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                    fontSize: 11, color: c.inkDim,
                  }}
                >
                  delete
                </button>
              </span>
            </div>

            {/* Content: Block renderer if body[], otherwise editable textarea */}
            {hasBlocks ? (
              <Body blocks={note.body} mode={mode} onLink={onLinkNavigate} />
            ) : editingContent ? (
              <textarea
                ref={textareaRef}
                value={localContent}
                onChange={(e) => { setLocalContent(e.target.value); scheduleSync(e.target.value); }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { setEditingContent(false); onUpdate({ content: localContent }); }
                }}
                onBlur={() => { setEditingContent(false); onUpdate({ content: localContent }); }}
                style={{
                  width: "100%", minHeight: "60vh",
                  background: "transparent", border: "none", outline: "none", resize: "none",
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontSize: 16, lineHeight: 1.65, color: c.ink,
                  caretColor: RED,
                }}
                placeholder={"Start writing...\n\nUse [[backlink]] to link notes."}
                spellCheck={false}
                autoFocus
              />
            ) : (
              <div
                onClick={() => { setEditingContent(true); requestAnimationFrame(() => textareaRef.current?.focus()); }}
                style={{
                  minHeight: "60vh", cursor: "text",
                  fontFamily: '"Newsreader", Georgia, serif',
                  fontSize: 16, lineHeight: 1.65, color: c.ink,
                  whiteSpace: "pre-wrap",
                }}
              >
                {localContent || (
                  <span style={{ color: c.inkFaint, fontStyle: "italic" }}>
                    Click to start writing…
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {view === "graph" && <GraphView notes={notes} focusId={note.id} mode={mode} />}
      </div>
    </section>
  );
}
