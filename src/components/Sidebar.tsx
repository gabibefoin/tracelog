"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import type { Note } from "@/types";
import { PixelIcon } from "@/components/icons/PixelIcons";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  mode: "light" | "dark";
}

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
const RED_SOFT_DARK = "#3A2220";

function IconBtn({
  icon, title, onClick, active, mode, size = 30,
}: {
  icon: string; title?: string; onClick?: () => void; active?: boolean;
  mode: "light" | "dark"; size?: number;
}) {
  const c = mode === "dark" ? DARK : LIGHT;
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active ? (mode === "light" ? "#F4D8D6" : RED_SOFT_DARK) : hover ? (mode === "dark" ? "#2E2B25" : "#EDE8DC") : "transparent",
        border: `1px solid ${active ? RED : hover ? c.rule : "transparent"}`,
        borderRadius: 6,
        cursor: "pointer",
        color: active ? RED : c.inkDim,
        transition: "all 0.1s",
      }}
    >
      <PixelIcon name={icon} size={14} color={active ? RED : c.ink} />
    </button>
  );
}

export function Sidebar({
  notes, activeNoteId, onSelectNote, onNewNote, onSearch, searchQuery, mode,
}: SidebarProps) {
  const c = mode === "dark" ? DARK : LIGHT;

  const folders = useMemo(() => {
    const f: Record<string, Note[]> = {};
    notes.forEach((n) => {
      const root = n.folder ? n.folder.split(" / ")[0] : "vault";
      (f[root] = f[root] ?? []).push(n);
    });
    return f;
  }, [notes]);

  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (key: string) => open[key] !== false; // default open

  const filtered = (ns: Note[]) =>
    searchQuery
      ? ns.filter((n) => n.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : ns;

  return (
    <aside style={{
      display: "flex",
      flexDirection: "column",
      background: c.surface,
      borderRight: `1px solid ${c.rule}`,
      fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
      color: c.ink,
      overflow: "hidden",
    }}>
      {/* Logo lockup */}
      <div style={{ padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <Image
          src="/tracecube.png"
          alt="tracelog"
          width={34}
          height={34}
          style={{ imageRendering: "pixelated" }}
        />
        <span style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 24,
          letterSpacing: "-0.03em",
          color: c.ink,
          lineHeight: 1,
        }}>
          tracelog
        </span>
      </div>

      {/* Search */}
      <div style={{ padding: "0 12px 10px", flexShrink: 0 }}>
        <div style={{
          background: c.raised,
          border: `1px solid ${c.rule}`,
          borderRadius: 8,
          padding: "7px 10px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <PixelIcon name="search" size={14} color={c.inkDim} />
          <input
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="find note or command…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              color: c.ink,
              fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
              fontSize: 13,
              minWidth: 0,
            }}
          />
          <span style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9.5,
            color: c.inkFaint,
            padding: "1px 5px",
            borderRadius: 4,
            border: `1px solid ${c.rule}`,
          }}>
            ⌘K
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "0 12px 10px", display: "flex", gap: 5, flexShrink: 0 }}>
        <IconBtn icon="pencil"       mode={mode} title="compose"  onClick={onNewNote} />
        <IconBtn icon="plus"         mode={mode} title="new note" onClick={onNewNote} />
        <IconBtn icon="outline"      mode={mode} title="outline" />
        <IconBtn icon="columns"      mode={mode} title="layout" />
        <span style={{ flex: 1 }} />
        <IconBtn icon="chevronUpDown" mode={mode} title="sort" />
      </div>

      {/* Vault tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 8px 8px" }}>
        {Object.entries(folders).map(([root, rootNotes]) => {
          const shown = filtered(rootNotes);
          if (searchQuery && shown.length === 0) return null;
          const expanded = isOpen(root);
          return (
            <div key={root} style={{ marginBottom: 4 }}>
              {/* Folder header */}
              <button
                onClick={() => setOpen((o) => ({ ...o, [root]: !isOpen(root) }))}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "5px 8px",
                  borderRadius: 6,
                  color: c.inkDim,
                  fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = mode === "dark" ? "#2E2B25" : "#EDE8DC")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{
                  display: "inline-block",
                  width: 8,
                  transform: expanded ? "rotate(90deg)" : "none",
                  transition: "transform .15s",
                  color: c.inkFaint,
                  fontSize: 9,
                }}>
                  ▸
                </span>
                <PixelIcon name="folder" size={14} color={c.inkFaint} />
                <span style={{ flex: 1 }}>{root}</span>
                <span style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: 10,
                  color: c.inkFaint,
                }}>
                  {rootNotes.length}
                </span>
              </button>

              {/* Notes in folder */}
              {expanded && shown.map((n) => {
                const active = n.id === activeNoteId;
                return (
                  <button
                    key={n.id}
                    onClick={() => onSelectNote(n.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 8px 5px 24px",
                      borderRadius: 6,
                      background: active ? (mode === "light" ? "#EDE6D2" : "#3A352D") : "transparent",
                      color: active ? c.ink : c.inkDim,
                      border: "none",
                      cursor: "pointer",
                      fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                      fontSize: 12.5,
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "background .1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLButtonElement).style.background = mode === "dark" ? "#2E2B25" : "#EDE8DC";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }}
                  >
                    <PixelIcon name="note" size={14} color={active ? c.ink : c.inkFaint} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {n.title || <span style={{ fontStyle: "italic", color: c.inkFaint }}>Untitled</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {notes.length === 0 && (
          <p style={{ fontSize: 12, color: c.inkFaint, padding: "8px 10px", fontStyle: "italic" }}>
            No notes yet
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: `1px solid ${c.ruleSoft}`,
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 4,
        flexShrink: 0,
      }}>
        <button style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "4px 8px",
          borderRadius: 8,
          flex: 1,
          color: c.ink,
          fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
          fontSize: 12,
        }}>
          <PixelIcon name="chevronUpDown" size={14} color={c.inkDim} />
          <span style={{ flex: 1, textAlign: "left" }}>vault · main</span>
        </button>
        <IconBtn icon="help" mode={mode} size={24} title="help" />
        <IconBtn icon="cog"  mode={mode} size={24} title="settings" />
      </div>
    </aside>
  );
}
