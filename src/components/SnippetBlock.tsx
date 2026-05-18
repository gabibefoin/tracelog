"use client";

import { useState, useEffect, useRef } from "react";
import { IconCopy, IconCheck, IconX, IconCode } from "@/components/icons/PixelIcons";

interface SnippetBlockProps {
  code: string;
  language: string;
  onUpdate: (code: string, language: string) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

const LANGUAGES = [
  "bash", "python", "javascript", "typescript", "go", "rust",
  "c", "cpp", "java", "sql", "html", "css", "json", "yaml",
  "php", "ruby", "powershell", "http", "text",
];

export function SnippetBlock({
  code,
  language,
  onUpdate,
  onDelete,
  readOnly = false,
}: SnippetBlockProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(code === "");
  const [localCode, setLocalCode] = useState(code);
  const [localLang, setLocalLang] = useState(language || "bash");
  const [highlighted, setHighlighted] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function highlight() {
      if (!localCode.trim()) {
        setHighlighted("");
        return;
      }
      try {
        const hljs = (await import("highlight.js")).default;
        const lang = hljs.getLanguage(localLang) ? localLang : "plaintext";
        const result = hljs.highlight(localCode, { language: lang });
        if (!cancelled) setHighlighted(result.value);
      } catch {
        if (!cancelled) setHighlighted(localCode);
      }
    }
    highlight();
    return () => { cancelled = true; };
  }, [localCode, localLang]);

  function handleCopy() {
    navigator.clipboard.writeText(localCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleBlur() {
    setEditing(false);
    onUpdate(localCode, localLang);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newVal = localCode.substring(0, start) + "  " + localCode.substring(end);
      setLocalCode(newVal);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    if (e.key === "Escape") {
      handleBlur();
    }
  }

  return (
    <div className="my-3 rounded border border-text-dim bg-bg-base group overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border-b border-text-dim">
        <IconCode size={12} color="#C0392B" />
        <select
          value={localLang}
          onChange={(e) => {
            setLocalLang(e.target.value);
            onUpdate(localCode, e.target.value);
          }}
          className="bg-transparent text-text-secondary text-2xs font-mono focus:outline-none cursor-pointer hover:text-text-primary transition-colors"
          disabled={readOnly}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l} className="bg-bg-elevated">
              {l}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-2xs font-mono text-text-secondary hover:text-red-hover transition-colors"
          >
            {copied ? (
              <>
                <IconCheck size={12} color="#98c379" />
                <span className="text-green-400">copied</span>
              </>
            ) : (
              <>
                <IconCopy size={12} color="currentColor" />
                <span>copy</span>
              </>
            )}
          </button>
          {!readOnly && (
            <button
              onClick={onDelete}
              className="text-text-muted hover:text-red-hover transition-colors opacity-0 group-hover:opacity-100"
            >
              <IconX size={12} color="currentColor" />
            </button>
          )}
        </div>
      </div>

      {/* Code area */}
      <div
        className="relative cursor-text"
        onClick={() => !readOnly && setEditing(true)}
      >
        {editing && !readOnly ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-text-primary text-xs font-mono p-3 resize-none focus:outline-none min-h-[60px]"
            style={{ lineHeight: "1.6", tabSize: 2 }}
            rows={Math.max(3, localCode.split("\n").length)}
            spellCheck={false}
          />
        ) : (
          <pre className="p-3 text-xs font-mono overflow-x-auto min-h-[40px]">
            {highlighted ? (
              <code
                className="hljs"
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            ) : (
              <code className="text-text-muted italic">
                {localCode || "// click to edit"}
              </code>
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
