"use client";

import { useMemo } from "react";
import type { Note, TagEntry } from "@/types";

interface NoteListProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  filter: string;
  setFilter: (f: string) => void;
  mode: "light" | "dark";
  layoutMode: "list" | "grid";
}

const FILTERS = ["all", "vulns", "recon", "snippets", "refs"] as const;

const LIGHT = {
  canvas: "#F4F1E8", surface: "#FBF8EF", raised: "#FFFCF4",
  ink: "#1A1814", inkDim: "#5C564B", inkFaint: "#8B8678",
  rule: "#E3DECF", ruleSoft: "#EBE6D8",
};
const DARK = {
  canvas: "#1F1D1A", surface: "#26241F", raised: "#2E2B25",
  ink: "#ECE7D9", inkDim: "#A29B8C", inkFaint: "#6E6A60",
  rule: "#3A3631", ruleSoft: "#322F2A",
};

const RED = "#DB4842";
const DOT_COLORS: Record<string, string> = {
  red: RED,
  signal: "#BC8438",
  recon: "#6E6B96",
  scope: "#4D7C84",
  patched: "#6E8462",
};

function dotColor(dot: string, inkFaint: string): string {
  return DOT_COLORS[dot] ?? inkFaint;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  if (d < 30) return `${Math.floor(d / 7)}w`;
  return `${Math.floor(d / 30)}mo`;
}

const TAG_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  scope:   { bg: "#DCE7E8", fg: "#4D7C84", bd: "#4D7C84" },
  recon:   { bg: "#E4E1EC", fg: "#6E6B96", bd: "#6E6B96" },
  patched: { bg: "#DFE5D8", fg: "#6E8462", bd: "#6E8462" },
  signal:  { bg: "#F1E1C8", fg: "#BC8438", bd: "#BC8438" },
  vuln:    { bg: RED,       fg: "#FFFCF4", bd: RED },
  neutral: { bg: "transparent", fg: "#5C564B", bd: "#E3DECF" },
};

function Tag({ variant, label, mode }: { variant: string; label: string; mode: "light" | "dark" }) {
  const s = TAG_STYLES[variant] ?? TAG_STYLES.neutral;
  const fg = mode === "dark" && variant === "neutral" ? "#A29B8C" : s.fg;
  const bd = mode === "dark" && variant === "neutral" ? "#3A3631" : s.bd;
  const bg = mode === "dark" && variant !== "vuln"
    ? variant === "neutral" ? "transparent" : "transparent"
    : s.bg;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "2px 9px 2px 6px",
      border: `1px solid ${bd}`,
      background: bg,
      color: fg,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10.5,
      letterSpacing: "0.04em",
      borderRadius: 999,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: variant === "vuln" ? "#FFFCF4" : bd, flexShrink: 0 }} />
      {label}
    </span>
  );
}

export function NoteList({ notes, activeNoteId, onSelectNote, filter, setFilter, mode, layoutMode }: NoteListProps) {
  const c = mode === "dark" ? DARK : LIGHT;

  const filtered = useMemo(() => {
    if (filter === "all") return notes;
    return notes.filter((n) => n.folder.toLowerCase().includes(filter));
  }, [notes, filter]);

  return (
    <section style={{
      display: "flex",
      flexDirection: "column",
      background: c.canvas,
      borderRight: `1px solid ${c.rule}`,
      overflow: "hidden",
      fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 8px", display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h2 style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 22,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          margin: 0,
          color: c.ink,
        }}>
          all notes
        </h2>
        <span style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10,
          color: c.inkFaint,
        }}>
          {filtered.length} items
        </span>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "0 18px 14px", flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              border: `1px solid ${filter === f ? RED : c.rule}`,
              background: filter === f ? RED : "transparent",
              color: filter === f ? "#FFFCF4" : c.inkDim,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 10.5,
              letterSpacing: "0.04em",
              padding: "3px 10px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Note cards */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px" }}>
        {filtered.length === 0 ? (
          <p style={{ color: c.inkFaint, fontSize: 13, padding: "16px 4px", fontStyle: "italic" }}>
            No notes found
          </p>
        ) : layoutMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {filtered.map((note) => {
              const active = note.id === activeNoteId;
              return (
                <button
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    background: active ? c.raised : "transparent",
                    border: `1px solid ${active ? c.rule : "transparent"}`,
                    borderRadius: 10,
                    padding: "10px 10px 10px 14px",
                    position: "relative",
                    display: "block",
                    transition: "background .12s, border-color .12s",
                    fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = mode === "dark" ? "#2E2B25" : "#F4F1E8";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  {/* Left dot rail */}
                  <div style={{
                    position: "absolute",
                    left: 6,
                    top: 14,
                    bottom: 14,
                    width: 3,
                    borderRadius: 999,
                    background: dotColor(note.dot, c.inkFaint),
                  }} />

                  {/* Title */}
                  <div style={{
                    fontFamily: '"Newsreader", Georgia, serif',
                    fontSize: 13,
                    color: c.ink,
                    letterSpacing: "-0.01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginBottom: 6,
                  }}>
                    {note.title || <span style={{ fontStyle: "italic", color: c.inkFaint }}>Untitled</span>}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(note.tags as TagEntry[]).slice(0, 2).map(([v, t], j) => (
                      <Tag key={j} variant={v} label={t} mode={mode} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          filtered.map((note) => {
            const active = note.id === activeNoteId;
            return (
              <button
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  background: active ? c.raised : "transparent",
                  border: `1px solid ${active ? c.rule : "transparent"}`,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 6,
                  position: "relative",
                  display: "block",
                  transition: "background .12s, border-color .12s",
                  fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = mode === "dark" ? "#2E2B25" : "#F4F1E8";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {/* Left dot rail */}
                <div style={{
                  position: "absolute",
                  left: 6,
                  top: 18,
                  bottom: 18,
                  width: 3,
                  borderRadius: 999,
                  background: dotColor(note.dot, c.inkFaint),
                }} />

                <div style={{ paddingLeft: 10 }}>
                  {/* Title + timestamp */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                    <div style={{
                      fontFamily: '"Newsreader", Georgia, serif',
                      fontSize: 15,
                      color: c.ink,
                      flex: 1,
                      letterSpacing: "-0.01em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {note.title || <span style={{ fontStyle: "italic", color: c.inkFaint }}>Untitled</span>}
                    </div>
                    <div style={{
                      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                      fontSize: 10,
                      color: c.inkFaint,
                      flexShrink: 0,
                    }}>
                      {timeAgo(note.updated_at)}
                    </div>
                  </div>

                  {/* Excerpt */}
                  <div style={{
                    fontSize: 12,
                    color: c.inkDim,
                    marginBottom: 8,
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}>
                    {note.excerpt || note.content?.slice(0, 100)}
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {(note.tags as TagEntry[]).slice(0, 3).map(([v, t], j) => (
                      <Tag key={j} variant={v} label={t} mode={mode} />
                    ))}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
