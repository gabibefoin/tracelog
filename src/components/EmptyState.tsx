"use client";

import Image from "next/image";
import type { Topic } from "@/types";
import { TOPICS } from "@/types";

interface EmptyStateProps {
  onNewNote: (topic: Topic) => void;
}

export function EmptyState({ onNewNote }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      background: "transparent",
      padding: 48,
      textAlign: "center",
    }}>
      <Image
        src="/tracecube.png"
        alt="tracelog"
        width={110}
        height={110}
        className="pixel-crisp"
        style={{ margin: "0 auto 24px", display: "block" }}
      />

      <p style={{
        fontFamily: "var(--font-serif)",
        fontSize: 26,
        fontWeight: 500,
        letterSpacing: "-0.02em",
        color: "var(--ink)",
        marginBottom: 10,
        lineHeight: 1.2,
      }}>
        nothing to trace yet
      </p>
      <p style={{
        fontSize: 13,
        color: "var(--ink-dim)",
        fontFamily: "var(--font-sans)",
        marginBottom: 32,
        maxWidth: 280,
        lineHeight: 1.6,
      }}>
        Comece uma nova nota ou selecione uma existente na barra lateral.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => onNewNote("Web")}
          style={{
            background: "var(--brand)",
            color: "#FFFCF4",
            border: "none",
            borderRadius: "var(--r-md)",
            padding: "9px 16px",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-ink)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand)")}
        >
          + nova nota
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 6,
        width: "100%",
        maxWidth: 300,
        marginTop: 28,
      }}>
        {TOPICS.map((topic) => (
          <button
            key={topic}
            onClick={() => onNewNote(topic)}
            style={{
              padding: "8px 6px",
              borderRadius: "var(--r-md)",
              border: "1px solid var(--rule)",
              fontSize: 11,
              color: "var(--ink-dim)",
              background: "transparent",
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              transition: "all 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--brand-border)";
              e.currentTarget.style.color = "var(--brand)";
              e.currentTarget.style.background = "var(--brand-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--rule)";
              e.currentTarget.style.color = "var(--ink-dim)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
