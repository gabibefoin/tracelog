"use client";

import { useState, useRef, useEffect } from "react";
import type { Note } from "@/types";
import { PixelIcon } from "@/components/icons/PixelIcons";

interface AIPanelProps {
  note: Note;
  mode: "light" | "dark";
  onClose: () => void;
}

interface Message { role: "user" | "assistant"; content: string; }

const LIGHT = {
  canvas: "#F4F1E8", surface: "#FBF8EF", raised: "#FFFCF4",
  ink: "#1A1814", inkDim: "#5C564B", inkFaint: "#8B8678",
  rule: "#E3DECF",
};
const DARK = {
  canvas: "#1F1D1A", surface: "#26241F", raised: "#2E2B25",
  ink: "#ECE7D9", inkDim: "#A29B8C", inkFaint: "#6E6A60",
  rule: "#3A3631",
};
const RED = "#DB4842";

export function AIPanel({ note, mode, onClose }: AIPanelProps) {
  const c = mode === "dark" ? DARK : LIGHT;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteTitle: note.title,
          noteContent: note.content || note.excerpt,
          noteTopic: note.topic,
          messages: [...messages, userMsg],
        }),
      });
      const data = await res.json() as { content?: string; error?: string };
      setMessages((prev) => [...prev, { role: "assistant", content: res.ok ? (data.content ?? "") : `Error: ${data.error}` }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Unknown"}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: 340,
      display: "flex",
      flexDirection: "column",
      background: c.surface,
      borderLeft: `1px solid ${c.rule}`,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "14px 18px",
        borderBottom: `1px solid ${c.rule}`,
        flexShrink: 0,
      }}>
        <PixelIcon name="sparkle" size={14} color={RED} />
        <span style={{
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: 17, color: c.ink, flex: 1, letterSpacing: "-0.02em",
        }}>
          ask
        </span>
        <button
          onClick={onClose}
          style={{
            width: 26, height: 26,
            background: "transparent", border: "none", cursor: "pointer",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            borderRadius: 6, color: c.inkDim,
          }}
        >
          <PixelIcon name="x" size={14} color={c.inkDim} />
        </button>
      </div>

      {/* Context bar */}
      <div style={{
        padding: "8px 18px",
        borderBottom: `1px solid ${c.rule}`,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 10, color: c.inkFaint, letterSpacing: "0.08em",
        display: "flex", alignItems: "center", gap: 6,
        flexShrink: 0,
      }}>
        <PixelIcon name="link" size={14} color={c.inkFaint} />
        context · &ldquo;{note.title || "untitled"}&rdquo; + linked
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 8px" }}>
        {messages.length === 0 && (
          <div>
            {/* Mock AI response card */}
            <div style={{
              background: c.raised,
              border: `1px solid ${c.rule}`,
              borderRadius: 10, padding: 14, marginBottom: 14,
            }}>
              <div style={{
                fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                fontSize: 13, color: c.ink, lineHeight: 1.6,
              }}>
                you&apos;ve got an open redirect + a fetch endpoint that accepts URLs. classic SSRF setup — try internal IP ranges first, then file:// for local reads.
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  onClick={() => setInput("insert snippet")}
                  style={{
                    background: "transparent", border: `1px solid ${c.rule}`,
                    borderRadius: 999, color: c.ink,
                    padding: "4px 10px",
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, cursor: "pointer",
                  }}
                >
                  insert snippet
                </button>
                <button
                  onClick={() => setInput("open cheatsheet")}
                  style={{
                    background: "transparent", border: `1px solid ${c.rule}`,
                    borderRadius: 999, color: c.ink,
                    padding: "4px 10px",
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace', fontSize: 10.5, cursor: "pointer",
                  }}
                >
                  open cheatsheet
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div style={{
                  paddingLeft: 10,
                  borderLeft: `2px solid ${RED}`,
                }}>
                  <div style={{
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: 9, letterSpacing: "0.1em", color: c.inkFaint, marginBottom: 4,
                  }}>
                    YOU
                  </div>
                  <div style={{
                    fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                    fontSize: 13, color: c.ink,
                  }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div style={{
                  background: c.raised,
                  border: `1px solid ${c.rule}`,
                  borderRadius: 10, padding: 14,
                }}>
                  <div style={{
                    fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
                    fontSize: 13, color: c.ink, lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{
              background: c.raised, border: `1px solid ${c.rule}`,
              borderRadius: 10, padding: 14,
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 13, color: c.inkFaint, letterSpacing: "0.2em",
            }}>
              ···
            </div>
          )}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Input footer */}
      <div style={{ padding: 14, borderTop: `1px solid ${c.rule}`, flexShrink: 0 }}>
        <div style={{
          background: c.raised,
          border: `1px solid ${c.rule}`,
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <PixelIcon name="sparkle" size={14} color={c.inkDim} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="ask about this note…"
            style={{
              flex: 1, border: "none", outline: "none",
              background: "transparent",
              color: c.ink,
              fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
              fontSize: 13, minWidth: 0,
              caretColor: RED,
            }}
          />
          <span style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9.5, color: c.inkFaint,
          }}>
            ⌘↵
          </span>
        </div>
      </div>
    </div>
  );
}
