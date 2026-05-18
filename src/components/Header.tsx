"use client";

import Image from "next/image";
import type { Topic } from "@/types";

interface HeaderProps {
  onNewNote: (topic: Topic) => void;
}

export function Header({ onNewNote }: HeaderProps) {
  return (
    <header
      className="h-12 flex items-center px-5 shrink-0"
      style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-2.5">
        <Image
          src="/tracecube.png"
          alt="tracelog"
          width={20}
          height={20}
          className="pixel-crisp"
          priority
        />
        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: "15px", color: "var(--brand)", letterSpacing: "-0.01em" }}>
          tracelog
        </span>
      </div>

      <div className="ml-auto">
        <button
          onClick={() => onNewNote("Web")}
          style={{
            background: "var(--brand)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--brand-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--brand)")}
        >
          + Nova nota
        </button>
      </div>
    </header>
  );
}
