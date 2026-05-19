"use client";

import { useState, useRef, useEffect } from "react";
import type { Note, Block, TagEntry, TagVariant } from "@/types";
import { PixelIcon } from "@/components/icons/PixelIcons";
import * as storage from "@/lib/storage";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ExcalidrawCanvas = dynamic(
  () => import("@/components/canvas/ExcalidrawCanvas"),
  { ssr: false, loading: () => (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#111111", color: "#555", fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13 }}>
      carregando canvas…
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
  onSelectNote?: (id: string) => void;
  onFilterByFolder?: (folder: string) => void;
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

// DS-compliant tag styles — no teal/purple (scope: warm sage, recon: warm stone)
const TAG_STYLES: Record<string, { bg: string; fg: string; bd: string }> = {
  scope:   { bg: "#DDE4D8", fg: "#5A7A5C", bd: "#5A7A5C" },
  recon:   { bg: "#E8E1D4", fg: "#7A6B50", bd: "#A29B8C" },
  patched: { bg: "#DFE5D8", fg: "#6E8462", bd: "#6E8462" },
  signal:  { bg: SIGNAL_TINT, fg: SIGNAL, bd: SIGNAL },
  vuln:    { bg: RED, fg: "#FFFCF4", bd: RED },
  neutral: { bg: "transparent", fg: "#5C564B", bd: "#E3DECF" },
};

// ── Slash commands ───────────────────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: "h1",        label: "Cabeçalho 1",        desc: "Título grande",            icon: "note" },
  { cmd: "h2",        label: "Cabeçalho 2",         desc: "Título médio",             icon: "note" },
  { cmd: "h3",        label: "Cabeçalho 3",         desc: "Título pequeno",           icon: "note" },
  { cmd: "code",      label: "Código",              desc: "Bloco de código",          icon: "terminal" },
  { cmd: "codeblock", label: "Código + linguagem",  desc: "Com seletor de linguagem", icon: "terminal" },
  { cmd: "bullet",    label: "Lista",               desc: "Lista com marcadores",     icon: "outline" },
  { cmd: "numbered",  label: "Numerada",            desc: "Lista numerada",           icon: "outline" },
  { cmd: "quote",     label: "Citação",             desc: "Bloco de citação",         icon: "bookmark" },
  { cmd: "divider",   label: "Divisor",             desc: "Linha horizontal",         icon: "arrowRight" },
  { cmd: "link",      label: "Link",                desc: "Inserir hiperlink",        icon: "link" },
  { cmd: "note",      label: "Link de nota",        desc: "[[link para nota]]",       icon: "note" },
] as const;
type SlashCmd = typeof SLASH_COMMANDS[number];

// ── Slash menu ────────────────────────────────────────────────────────
function SlashMenu({
  commands, selectedIndex, onSelect, pos, mode,
}: {
  commands: readonly SlashCmd[];
  selectedIndex: number;
  onSelect: (cmd: string) => void;
  pos: { top: number; left: number };
  mode: "light" | "dark";
}) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  if (commands.length === 0) return null;
  return (
    <div style={{
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: 272,
      maxHeight: 320,
      overflow: "hidden",   // clip for border-radius
      overflowY: "auto",    // must come AFTER overflow so it wins
      background: mode === "dark" ? "#26241F" : "#FBF8EF",
      border: `1px solid ${c.rule}`,
      borderRadius: 10,
      boxShadow: mode === "dark"
        ? "0 8px 32px rgba(0,0,0,0.5)"
        : "0 4px 20px rgba(26,24,20,0.12)",
      zIndex: 9999,
    }}>
      <div style={{
        padding: "5px 12px",
        borderBottom: `1px solid ${c.rule}`,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9, color: c.inkFaint,
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        inserir bloco
      </div>
      {commands.map((item, i) => (
        <button
          key={item.cmd}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item.cmd); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px",
            background: i === selectedIndex
              ? (mode === "dark" ? "#2E2B25" : "#F4F1E8")
              : "transparent",
            border: "none",
            borderBottom: i < commands.length - 1 ? `1px solid ${c.ruleSoft}` : "none",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <div style={{
            width: 28, height: 28, flexShrink: 0, borderRadius: 6,
            background: mode === "dark" ? "#2E2B25" : "#F4F1E8",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PixelIcon name={item.icon} size={13} color={RED} />
          </div>
          <div>
            <div style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 13, fontWeight: 500, color: c.ink, lineHeight: 1.3,
            }}>
              {item.label}
            </div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10, color: c.inkFaint, marginTop: 1,
            }}>
              /{item.cmd}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Wikilink picker ───────────────────────────────────────────────────
function WikilinkMenu({
  notes, query, selectedIndex, onSelect, pos, mode,
}: {
  notes: Note[];
  query: string;
  selectedIndex: number;
  onSelect: (title: string) => void;
  pos: { top: number; left: number };
  mode: "light" | "dark";
}) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  const filtered = notes
    .filter(n => n.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8);
  if (filtered.length === 0) return null;
  return (
    <div style={{
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: 240,
      maxHeight: 280,
      overflow: "hidden",
      overflowY: "auto",
      background: mode === "dark" ? "#26241F" : "#FBF8EF",
      border: `1px solid ${c.rule}`,
      borderRadius: 10,
      boxShadow: mode === "dark"
        ? "0 8px 32px rgba(0,0,0,0.5)"
        : "0 4px 20px rgba(26,24,20,0.12)",
      zIndex: 9999,
    }}>
      <div style={{
        padding: "5px 12px",
        borderBottom: `1px solid ${c.rule}`,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 9, color: c.inkFaint,
        letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        linkar nota
      </div>
      {filtered.map((note, i) => (
        <button
          key={note.id}
          onMouseDown={(e) => { e.preventDefault(); onSelect(note.title); }}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px",
            background: i === selectedIndex
              ? (mode === "dark" ? "#2E2B25" : "#F4F1E8")
              : "transparent",
            border: "none",
            borderBottom: i < filtered.length - 1 ? `1px solid ${c.ruleSoft}` : "none",
            cursor: "pointer", textAlign: "left",
          }}
        >
          <PixelIcon name="note" size={13} color={RED} />
          <span style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 13, fontWeight: 500, color: c.ink,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {note.title || "Untitled"}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Settings modal ────────────────────────────────────────────────────
function SettingsModal({ mode, onClose }: { mode: "light" | "dark"; onClose: () => void }) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  function handleClearData() {
    if (confirm("Apagar todos os dados? Essa ação não pode ser desfeita.")) {
      localStorage.removeItem("tracelog_notes");
      window.location.reload();
    }
  }
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: mode === "dark" ? "#26241F" : "#FBF8EF",
          border: `1px solid ${c.rule}`,
          borderRadius: 16, padding: 28, width: 380,
          boxShadow: mode === "dark"
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 12px 40px rgba(26,24,20,0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 22, fontWeight: 500, color: c.ink, marginBottom: 20,
        }}>
          Configurações
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 11, fontWeight: 600, color: c.inkFaint,
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10,
            }}>
              Armazenamento
            </div>
            <p style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 13, color: c.inkDim, lineHeight: 1.5, margin: "0 0 12px",
            }}>
              Todas as notas são salvas localmente no seu navegador via localStorage.
            </p>
            <button
              onClick={handleClearData}
              style={{
                padding: "8px 16px", borderRadius: 8,
                background: "transparent", border: `1px solid ${RED}`,
                color: RED, cursor: "pointer",
                fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13,
              }}
            >
              Apagar todos os dados
            </button>
          </div>

          <div>
            <div style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 11, fontWeight: 600, color: c.inkFaint,
              letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10,
            }}>
              IA
            </div>
            <p style={{
              fontFamily: '"IBM Plex Sans", sans-serif',
              fontSize: 13, color: c.inkDim, lineHeight: 1.5, margin: 0,
            }}>
              Configure <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>ANTHROPIC_API_KEY</code> no arquivo <code style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 12 }}>.env.local</code> para ativar o painel de IA.
            </p>
          </div>
        </div>

        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: RED, border: "none",
              color: "#FFFCF4", cursor: "pointer",
              fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, fontWeight: 500,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Help modal ────────────────────────────────────────────────────────
function HelpModal({ mode, onClose }: { mode: "light" | "dark"; onClose: () => void }) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  const shortcuts = [
    { key: "⌘K", desc: "Buscar notas" },
    { key: "⌘J", desc: "Abrir painel AI" },
    { key: "/", desc: "Inserir bloco (no editor)" },
    { key: "[[", desc: "Linkar nota (no editor)" },
    { key: "↑ ↓", desc: "Navegar no menu" },
    { key: "Enter", desc: "Confirmar seleção" },
    { key: "Esc", desc: "Cancelar / fechar" },
  ];
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: mode === "dark" ? "#26241F" : "#FBF8EF",
          border: `1px solid ${c.rule}`,
          borderRadius: 16, padding: 28, width: 400,
          boxShadow: mode === "dark"
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 12px 40px rgba(26,24,20,0.15)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 22, fontWeight: 500, color: c.ink, marginBottom: 20,
        }}>
          Ajuda
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontFamily: '"IBM Plex Sans", sans-serif',
            fontSize: 11, fontWeight: 600, color: c.inkFaint,
            letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12,
          }}>
            Atalhos de teclado
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {shortcuts.map(({ key, desc }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, color: c.ink }}>
                  {desc}
                </span>
                <span style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11, color: c.inkFaint,
                  background: c.raised, border: `1px solid ${c.rule}`,
                  padding: "2px 7px", borderRadius: 5,
                }}>
                  {key}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: "12px 0",
          borderTop: `1px solid ${c.rule}`,
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10.5, color: c.inkFaint,
          display: "flex", justifyContent: "space-between",
        }}>
          <span>tracelog v0.1.0</span>
          <span>notas pra offsec</span>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px", borderRadius: 8,
              background: RED, border: "none",
              color: "#FFFCF4", cursor: "pointer",
              fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 13, fontWeight: 500,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Markdown code block (used by MarkdownRenderer) ───────────────────
function MarkdownCodeBlock({ lang, children }: { lang: string; children: string }) {
  return (
    <div style={{
      background: DARK_CODE.canvas, border: `1px solid ${DARK_CODE.rule}`,
      borderRadius: 10, overflow: "hidden", margin: "12px 0",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "7px 12px", borderBottom: `1px solid ${DARK_CODE.rule}`,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10, color: DARK_CODE.inkDim, letterSpacing: "0.06em",
      }}>
        <PixelIcon name="terminal" size={14} color={RED} />
        <span style={{ flex: 1 }}>{lang || "txt"}</span>
        <button
          onClick={() => navigator.clipboard.writeText(children)}
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
        fontSize: 13, lineHeight: 1.7, color: DARK_CODE.ink, whiteSpace: "pre-wrap",
      }}>
        {children}
      </pre>
    </div>
  );
}

// ── Markdown renderer (reading mode) ─────────────────────────────────
function MarkdownRenderer({ content, mode, onLink }: { content: string; mode: "light" | "dark"; onLink: (title: string) => void }) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  // Convert [[title]] → custom URL scheme readable by react-markdown
  const processed = content.replace(/\[\[([^\]]+)\]\]/g, (_, t) => `[${t}](tracelog://${encodeURIComponent(t)})`);
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 34, fontWeight: 500, letterSpacing: "-0.03em", color: c.ink, margin: "20px 0 10px" }}>{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em", color: c.ink, margin: "18px 0 8px" }}>{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 20, fontWeight: 500, color: c.ink, margin: "14px 0 6px" }}>{children}</h3>
        ),
        p: ({ children }) => (
          <p style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 16, lineHeight: 1.65, color: c.ink, margin: "0 0 14px" }}>{children}</p>
        ),
        strong: ({ children }) => <strong style={{ fontWeight: 600, color: c.ink }}>{children}</strong>,
        em: ({ children }) => <em style={{ fontStyle: "italic", color: c.inkDim }}>{children}</em>,
        ul: ({ children }) => (
          <ul style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 15, lineHeight: 1.65, color: c.ink, paddingLeft: 24, margin: "0 0 14px" }}>{children}</ul>
        ),
        ol: ({ children }) => (
          <ol style={{ fontFamily: '"Newsreader", Georgia, serif', fontSize: 15, lineHeight: 1.65, color: c.ink, paddingLeft: 24, margin: "0 0 14px" }}>{children}</ol>
        ),
        li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: `3px solid ${c.rule}`, paddingLeft: 16,
            color: c.inkDim, margin: "14px 0", fontStyle: "italic",
            fontFamily: '"Newsreader", Georgia, serif', fontSize: 16,
          }}>{children}</blockquote>
        ),
        hr: () => <hr style={{ border: "none", borderTop: `1px solid ${c.rule}`, margin: "24px 0" }} />,
        pre: ({ children }) => <>{children}</>, // let code handle the block
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        code: ({ className, children }: any) => {
          const lang = /language-(\w+)/.exec(className ?? "")?.[1] ?? "";
          if (lang || (className ?? "").startsWith("language-")) {
            return (
              <MarkdownCodeBlock lang={lang || "txt"}>
                {String(children).replace(/\n$/, "")}
              </MarkdownCodeBlock>
            );
          }
          return (
            <code style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 13,
              background: mode === "light" ? RED_SOFT : RED_SOFT_DARK,
              color: RED, padding: "1px 6px", borderRadius: 4,
            }}>{children}</code>
          );
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        a: ({ href, children }: any) => {
          if (href?.startsWith("tracelog://")) {
            const title = decodeURIComponent(href.replace("tracelog://", ""));
            return (
              <span
                onClick={() => onLink(title)}
                style={{ color: RED, borderBottom: `1px dotted ${RED}`, cursor: "pointer" }}
              >
                [[{children}]]
              </span>
            );
          }
          return (
            <a href={href} target="_blank" rel="noopener noreferrer"
              style={{ color: RED, textDecoration: "underline" }}>
              {children}
            </a>
          );
        },
      }}
    >
      {processed}
    </ReactMarkdown>
  );
}

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
  red: RED, signal: SIGNAL, recon: "#6E8462", scope: "#5A7A5C", patched: "#6E8462",
};
function dotColor(dot: string, inkFaint: string) { return DOT_COLORS[dot] ?? inkFaint; }

function GraphView({
  notes, focusId, mode, onSelectNote,
}: {
  notes: Note[];
  focusId: string;
  mode: "light" | "dark";
  onSelectNote?: (id: string) => void;
}) {
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
          <g
            key={i}
            style={{ cursor: (!n.big && onSelectNote) ? "pointer" : "default" }}
            onClick={() => { if (!n.big && onSelectNote) onSelectNote(n.id); }}
          >
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
export function NoteEditor({
  note, notes, mode, onUpdate, onDelete, onLinkNavigate, onOpenAI, onToggleTheme,
  onSelectNote, onFilterByFolder,
}: NoteEditorProps) {
  const c = mode === "dark" ? DARK_TOKENS : LIGHT;
  const [view, setView] = useState<"editor" | "graph" | "canvas">("editor");
  const [editingContent, setEditingContent] = useState(false);
  const [localContent, setLocalContent] = useState(note.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slash command state
  type SlashState = { query: string; start: number; selectedIndex: number } | null;
  const [slashState, setSlashState] = useState<SlashState>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Wikilink picker state
  type WikilinkState = { query: string; start: number; selectedIndex: number } | null;
  const [wikilinkState, setWikilinkState] = useState<WikilinkState>(null);
  const [wikilinkPos, setWikilinkPos] = useState({ top: 0, left: 0 });

  // Tag input state
  const [addingTag, setAddingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagVariant, setNewTagVariant] = useState<TagVariant>("neutral");

  // Modal state
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const noteId = note.id;
  useEffect(() => {
    setLocalContent(note.content);
    setEditingContent(false);
    setSlashState(null);
    setWikilinkState(null);
  }, [noteId]); // eslint-disable-line

  function scheduleSync(content: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => onUpdate({ content }), 500);
  }

  function calcMenuPos(ta: HTMLTextAreaElement, content: string, slashStart: number) {
    const textBefore = content.slice(0, slashStart);
    const lineCount = textBefore.split("\n").length;
    const lineH = 16 * 1.65;
    const rect = ta.getBoundingClientRect();
    let top = rect.top + lineCount * lineH - ta.scrollTop + lineH;
    if (top + 340 > window.innerHeight) top -= 340 + lineH;
    return { top, left: rect.left };
  }

  function insertSlashCommand(cmd: string) {
    setSlashState(null);
    if (!textareaRef.current || slashState === null) return;
    const ta = textareaRef.current;
    const cursor = ta.selectionStart ?? 0;
    const before = localContent.slice(0, slashState.start);
    const after = localContent.slice(cursor);

    let insert = "";
    let delta = 0;
    switch (cmd) {
      case "h1":        insert = "# ";              delta = 2; break;
      case "h2":        insert = "## ";             delta = 3; break;
      case "h3":        insert = "### ";            delta = 4; break;
      case "code":      insert = "```\n\n```";      delta = 4; break;
      case "codeblock": insert = "```bash\n\n```";  delta = 9; break;
      case "bullet":    insert = "- ";              delta = 2; break;
      case "numbered":  insert = "1. ";             delta = 3; break;
      case "quote":     insert = "> ";              delta = 2; break;
      case "divider":   insert = "\n---\n";         delta = 5; break;
      case "link":      insert = "[](url)";         delta = 1; break;
      case "note":      insert = "[[]]";            delta = 2; break;
      default: return;
    }

    const next = before + insert + after;
    setLocalContent(next);
    scheduleSync(next);
    requestAnimationFrame(() => {
      const pos = slashState.start + delta;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  function insertWikilink(noteTitle: string) {
    setWikilinkState(null);
    if (!textareaRef.current || wikilinkState === null) return;
    const ta = textareaRef.current;
    const cursor = ta.selectionStart ?? 0;
    const before = localContent.slice(0, wikilinkState.start);
    const after = localContent.slice(cursor);
    const insert = `[[${noteTitle}]]`;
    const next = before + insert + after;
    setLocalContent(next);
    scheduleSync(next);
    requestAnimationFrame(() => {
      const pos = wikilinkState.start + insert.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  const hasBlocks = note.body && note.body.length > 0;

  // Canvas mode takes over the full column
  // BUG 1 fix: canvas onSave re-reads from storage to prevent any stale state from erasing tags
  if (view === "canvas") {
    return (
      <section style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <ExcalidrawCanvas
          noteId={note.id}
          noteTitle={note.title}
          initialData={note.canvas_data}
          mode={mode}
          onSave={(data) => {
            // Read fresh from storage to guarantee tags/other fields are never lost
            const fresh = storage.getNoteById(note.id);
            if (fresh && JSON.stringify(fresh.tags) !== JSON.stringify(note.tags)) {
              onUpdate({ canvas_data: data, tags: fresh.tags });
            } else {
              onUpdate({ canvas_data: data });
            }
          }}
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
        {/* Breadcrumb — folder part clickable */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10.5, color: c.inkFaint, letterSpacing: "0.06em",
          flex: 1, minWidth: 0,
        }}>
          <PixelIcon name="folder" size={14} color={c.inkFaint} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span
              onClick={() => onFilterByFolder && onFilterByFolder(note.folder)}
              style={{
                cursor: onFilterByFolder ? "pointer" : "default",
                borderBottom: onFilterByFolder ? `1px dotted ${c.inkFaint}` : "none",
              }}
            >
              {note.folder}
            </span>
            {" / "}
            <span>{note.title.toLowerCase().replace(/\s+/g, "-") || "untitled"}</span>
          </span>
        </div>

        {/* View tabs */}
        <div style={{
          display: "flex", gap: 2,
          background: c.surface,
          border: `1px solid ${c.rule}`,
          borderRadius: 8, padding: 2,
        }}>
          {([["pencil", "editor", "editor"], ["graph", "graph", "grafo"], ["columns", "canvas", "canvas"]] as [string, "editor" | "graph" | "canvas", string][]).map(([icon, v, label]) => (
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
              <span>{label}</span>
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

        {/* Help */}
        <button
          onClick={() => setShowHelp(true)}
          title="ajuda"
          style={{
            width: 30, height: 30,
            background: "transparent",
            border: `1px solid ${c.rule}`,
            borderRadius: 6, cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <PixelIcon name="help" size={14} color={c.ink} />
        </button>

        {/* Settings */}
        <button
          onClick={() => setShowSettings(true)}
          title="configurações"
          style={{
            width: 30, height: 30,
            background: "transparent",
            border: `1px solid ${c.rule}`,
            borderRadius: 6, cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <PixelIcon name="cog" size={14} color={c.ink} />
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
          perguntar
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
              placeholder="Sem título"
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

              {/* Add tag UI */}
              {addingTag ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <select
                    value={newTagVariant}
                    onChange={(e) => setNewTagVariant(e.target.value as TagVariant)}
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10.5, border: `1px solid ${c.rule}`,
                      background: c.surface, color: c.ink,
                      borderRadius: 6, padding: "2px 4px", outline: "none",
                    }}
                  >
                    {(["neutral", "scope", "recon", "vuln", "patched", "signal"] as TagVariant[]).map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <input
                    autoFocus
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newTagLabel.trim()) {
                        onUpdate({ tags: [...note.tags, [newTagVariant, newTagLabel.trim()]] });
                        setNewTagLabel("");
                        setAddingTag(false);
                      }
                      if (e.key === "Escape") {
                        setNewTagLabel("");
                        setAddingTag(false);
                      }
                    }}
                    onBlur={() => {
                      if (newTagLabel.trim()) {
                        onUpdate({ tags: [...note.tags, [newTagVariant, newTagLabel.trim()]] });
                      }
                      setNewTagLabel("");
                      setAddingTag(false);
                    }}
                    placeholder="nome da tag"
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10.5, border: `1px solid ${c.rule}`,
                      background: "transparent", color: c.ink,
                      borderRadius: 6, padding: "2px 8px",
                      outline: "none", width: 120,
                    }}
                  />
                </div>
              ) : (
                <button
                  onClick={() => { setAddingTag(true); setNewTagVariant("neutral"); }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "transparent", border: `1px solid ${c.rule}`,
                    borderRadius: 999, padding: "2px 8px",
                    cursor: "pointer", color: c.inkFaint,
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
                  }}
                >
                  <PixelIcon name="plus" size={10} color={c.inkFaint} />
                  tag
                </button>
              )}

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
                  excluir
                </button>
              </span>
            </div>

            {/* Content: Block renderer if body[], otherwise editable textarea */}
            {hasBlocks ? (
              <>
                <Body blocks={note.body} mode={mode} onLink={onLinkNavigate} />
                <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${c.ruleSoft}` }}>
                  <button
                    onClick={() => setEditingContent(true)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      background: "transparent", border: `1px solid ${c.rule}`,
                      borderRadius: 6, padding: "4px 12px",
                      cursor: "pointer", color: c.inkFaint,
                      fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 12,
                    }}
                  >
                    <PixelIcon name="pencil" size={12} color={c.inkFaint} />
                    editar texto
                  </button>
                </div>
                {editingContent && (
                  <>
                    <textarea
                      ref={textareaRef}
                      value={localContent}
                      onChange={(e) => {
                        const value = e.target.value;
                        const cursor = e.target.selectionStart ?? 0;
                        setLocalContent(value);
                        scheduleSync(value);
                        handleInlineDetection(value, cursor);
                      }}
                      onKeyDown={handleKeyDown}
                      onBlur={() => {
                        setTimeout(() => { setSlashState(null); setWikilinkState(null); }, 150);
                        setEditingContent(false);
                        onUpdate({ content: localContent });
                      }}
                      style={{
                        width: "100%", minHeight: "30vh", marginTop: 12,
                        background: c.surface, border: `1px solid ${c.rule}`,
                        borderRadius: 8, outline: "none", resize: "none",
                        fontFamily: '"Newsreader", Georgia, serif',
                        fontSize: 16, lineHeight: 1.65, color: c.ink,
                        caretColor: RED, padding: "12px 14px",
                      }}
                      placeholder="Notas adicionais (Markdown)…"
                      spellCheck={false}
                      autoFocus
                    />
                    {renderFloatingMenus()}
                  </>
                )}
              </>
            ) : editingContent ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={localContent}
                  onChange={(e) => {
                    const value = e.target.value;
                    const cursor = e.target.selectionStart ?? 0;
                    setLocalContent(value);
                    scheduleSync(value);
                    handleInlineDetection(value, cursor);
                  }}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    setTimeout(() => { setSlashState(null); setWikilinkState(null); }, 150);
                    setEditingContent(false);
                    onUpdate({ content: localContent });
                  }}
                  style={{
                    width: "100%", minHeight: "60vh",
                    background: "transparent", border: "none", outline: "none", resize: "none",
                    fontFamily: '"Newsreader", Georgia, serif',
                    fontSize: 16, lineHeight: 1.65, color: c.ink,
                    caretColor: RED,
                  }}
                  placeholder={"Comece a escrever…\n\nDigite / para inserir um bloco. Use [[título]] para linkar notas."}
                  spellCheck={false}
                  autoFocus
                />
                {renderFloatingMenus()}
              </>
            ) : (
              <div
                onClick={() => { setEditingContent(true); requestAnimationFrame(() => textareaRef.current?.focus()); }}
                style={{ minHeight: "60vh", cursor: "text" }}
              >
                {localContent ? (
                  <MarkdownRenderer content={localContent} mode={mode} onLink={onLinkNavigate} />
                ) : (
                  <span style={{
                    color: c.inkFaint, fontStyle: "italic",
                    fontFamily: '"Newsreader", Georgia, serif', fontSize: 16,
                  }}>
                    Clique para começar a escrever…
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {view === "graph" && (
          <GraphView notes={notes} focusId={note.id} mode={mode} onSelectNote={onSelectNote} />
        )}
      </div>

      {/* Modals */}
      {showSettings && <SettingsModal mode={mode} onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpModal mode={mode} onClose={() => setShowHelp(false)} />}
    </section>
  );

  // ── Inline detection helpers (extracted so they're shared between hasBlocks and plain textarea) ──
  function handleInlineDetection(value: string, cursor: number) {
    const before = value.slice(0, cursor);

    // Wikilink detection — takes priority over slash
    const wlMatch = before.match(/\[\[([^\]]*)$/);
    if (wlMatch) {
      const start = before.lastIndexOf("[[");
      const query = wlMatch[1];
      const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(query.toLowerCase()));
      if (filteredNotes.length > 0) {
        setSlashState(null);
        setWikilinkState({ query, start, selectedIndex: 0 });
        if (textareaRef.current) {
          setWikilinkPos(calcMenuPos(textareaRef.current, value, start));
        }
      } else {
        setWikilinkState(null);
      }
      return;
    }
    setWikilinkState(null);

    // Slash detection
    const m = before.match(/(?:^|\s)\/(\w*)$/);
    if (m) {
      const start = before.lastIndexOf("/");
      const query = m[1].toLowerCase();
      const filtered = SLASH_COMMANDS.filter(
        (c) => c.cmd.startsWith(query) || c.label.toLowerCase().includes(query)
      );
      if (filtered.length > 0) {
        setSlashState({ query, start, selectedIndex: 0 });
        if (textareaRef.current) {
          setMenuPos(calcMenuPos(textareaRef.current, value, start));
        }
      } else {
        setSlashState(null);
      }
    } else {
      setSlashState(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Wikilink navigation
    if (wikilinkState !== null) {
      const filteredWl = notes
        .filter(n => n.title.toLowerCase().includes(wikilinkState.query.toLowerCase()))
        .slice(0, 8);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setWikilinkState(s => s ? { ...s, selectedIndex: Math.min(s.selectedIndex + 1, filteredWl.length - 1) } : null);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setWikilinkState(s => s ? { ...s, selectedIndex: Math.max(s.selectedIndex - 1, 0) } : null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const sel = filteredWl[wikilinkState.selectedIndex];
        if (sel) insertWikilink(sel.title);
        return;
      }
      if (e.key === "Escape") {
        setWikilinkState(null);
        return;
      }
    }

    // Slash navigation
    if (slashState !== null) {
      const filtered = SLASH_COMMANDS.filter(
        (c) => c.cmd.startsWith(slashState.query) || c.label.toLowerCase().includes(slashState.query)
      );
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashState((s) => s ? { ...s, selectedIndex: Math.min(s.selectedIndex + 1, filtered.length - 1) } : null);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashState((s) => s ? { ...s, selectedIndex: Math.max(s.selectedIndex - 1, 0) } : null);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const sel = filtered[slashState.selectedIndex];
        if (sel) insertSlashCommand(sel.cmd);
        return;
      }
      if (e.key === "Escape") {
        setSlashState(null);
        return;
      }
    }

    if (e.key === "Escape") {
      setEditingContent(false);
      onUpdate({ content: localContent });
    }
  }

  function renderFloatingMenus() {
    return (
      <>
        {wikilinkState !== null && (
          <WikilinkMenu
            notes={notes}
            query={wikilinkState.query}
            selectedIndex={wikilinkState.selectedIndex}
            onSelect={insertWikilink}
            pos={wikilinkPos}
            mode={mode}
          />
        )}
        {slashState !== null && wikilinkState === null && (() => {
          const filtered = SLASH_COMMANDS.filter(
            (c) => c.cmd.startsWith(slashState.query) || c.label.toLowerCase().includes(slashState.query)
          );
          return filtered.length > 0 ? (
            <SlashMenu
              commands={filtered}
              selectedIndex={slashState.selectedIndex}
              onSelect={insertSlashCommand}
              pos={menuPos}
              mode={mode}
            />
          ) : null;
        })()}
      </>
    );
  }
}
