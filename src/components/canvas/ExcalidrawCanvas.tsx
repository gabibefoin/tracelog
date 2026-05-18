"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { PixelIcon } from "@/components/icons/PixelIcons";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// Excalidraw must be dynamically imported (no SSR)
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  { ssr: false, loading: () => <CanvasLoading /> }
);

interface ExcalidrawCanvasProps {
  noteId: string;
  noteTitle: string;
  initialData: Record<string, unknown> | null;
  onSave: (data: Record<string, unknown>) => void;
  onBack: () => void;
  mode: "light" | "dark";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAPI = any;

const DS = {
  dark: {
    canvas:   "#1F1D1A",
    surface:  "#26241F",
    raised:   "#2E2B25",
    rule:     "#3A3631",
    ink:      "#ECE7D9",
    inkFaint: "#6E6A60",
    bg:       "#26241F",
  },
  light: {
    canvas:   "#F4F1E8",
    surface:  "#FBF8EF",
    raised:   "#FFFCF4",
    rule:     "#E3DECF",
    ink:      "#1A1814",
    inkFaint: "#888678",
    bg:       "#F4F1E8",
  },
};

function CanvasLoading({ mode = "dark" }: { mode?: "light" | "dark" }) {
  const t = DS[mode];
  return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      background: t.canvas, color: t.inkFaint,
      fontFamily: '"IBM Plex Sans", -apple-system, sans-serif', fontSize: 13,
      gap: 10, height: "100%",
    }}>
      <PixelIcon name="sparkle" size={14} color={t.inkFaint} />
      loading canvas…
    </div>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" }) {
  if (state === "idle") return null;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
      fontSize: 10, letterSpacing: "0.06em",
      color: state === "saving" ? "#BC8438" : "#6E8462",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: state === "saving" ? "#BC8438" : "#6E8462",
        animation: state === "saving" ? "tl-pulse 1s ease-in-out infinite" : "none",
      }} />
      {state === "saving" ? "saving…" : "saved"}
    </div>
  );
}

export default function ExcalidrawCanvas({
  noteId, noteTitle, initialData, onSave, onBack, mode,
}: ExcalidrawCanvasProps) {
  const apiRef = useRef<AnyAPI>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const savedRef = useRef(true);

  const t = DS[mode];

  // Hold onSave in a ref so doSave/scheduleAutoSave/handleChange never need to
  // depend on it — prevents the cascade: new onSave → new doSave → new
  // scheduleAutoSave → new handleChange → Excalidraw sees new onChange → loop.
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  const doSave = useCallback((data: Record<string, unknown>) => {
    setSaveState("saving");
    onSaveRef.current(data);
    pendingRef.current = null;
    savedRef.current = true;
    setTimeout(() => setSaveState("saved"), 500);
    setTimeout(() => setSaveState("idle"), 2500);
  }, []); // empty — stable forever; reads onSave via ref

  const scheduleAutoSave = useCallback((data: Record<string, unknown>) => {
    pendingRef.current = data;
    savedRef.current = false;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (pendingRef.current) doSave(pendingRef.current);
    }, 30000);
  }, [doSave]); // doSave is now stable → scheduleAutoSave is stable

  // Flush unsaved changes on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (!savedRef.current && pendingRef.current) {
        onSaveRef.current(pendingRef.current);
      }
    };
  }, []); // empty — reads onSave via ref at cleanup time

  // Reset dirty state when note switches
  useEffect(() => {
    savedRef.current = true;
    pendingRef.current = null;
  }, [noteId]);

  function handleSaveNow() {
    if (!apiRef.current) return;
    doSave({
      elements: apiRef.current.getSceneElements(),
      appState: apiRef.current.getAppState(),
      files: apiRef.current.getFiles(),
    });
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
  }

  // useCallback prevents recreation on every render — avoids onChange loops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = useCallback((elements: any, appState: any, files: any) => {
    // Strip collaborators — Map serializes to {} in JSON, breaks UserList on restore
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { collaborators: _c, ...safeAppState } = appState;
    scheduleAutoSave({ elements, appState: safeAppState, files });
  }, [scheduleAutoSave]);

  // Stable callback ref — inline arrow recreates on every render → loop
  const setExcalidrawAPI = useCallback((api: AnyAPI) => {
    apiRef.current = api;
  }, []);

  // useMemo stabilizes initialData object. New Map() on every render causes
  // Excalidraw to detect prop changes → re-initialize → onChange → loop.
  //
  // viewBackgroundColor is always 'transparent' — the wrapper div's background
  // provides the actual canvas background color via CSS. This sidesteps
  // Excalidraw's internal theme engine resetting viewBackgroundColor on every
  // render when the theme prop changes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const excalidrawInitialData: any = useMemo(() => {
    const collaborators = new Map();
    const theme = mode === "dark" ? "dark" : "light";
    return initialData
      ? {
          elements: initialData.elements ?? [],
          appState: {
            ...(initialData.appState as object ?? {}),
            theme,
            viewBackgroundColor: "transparent",
            collaborators,
          },
          files: initialData.files ?? {},
        }
      : { appState: { theme, viewBackgroundColor: "transparent", collaborators } };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]); // omit mode — background is CSS-driven, not initialData-driven

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ── Custom toolbar ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "0 16px", height: 44,
        background: t.canvas, borderBottom: `1px solid ${t.rule}`,
        flexShrink: 0, zIndex: 10,
      }}>

        {/* Back — icon rotated manually */}
        <Button variant="secondary" mode={mode} mini onClick={onBack}>
          <span style={{ display: "inline-block", transform: "rotate(180deg)", lineHeight: 0 }}>
            <PixelIcon name="arrowRight" size={14} color="currentColor" />
          </span>
          back to note
        </Button>

        {/* Note name */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <span style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontSize: 16, letterSpacing: "-0.01em", color: t.ink,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {noteTitle || "Untitled"}
          </span>
          <Badge variant="neutral" mode={mode}>canvas</Badge>
        </div>

        {/* Save indicator */}
        <SaveIndicator state={saveState} />

        {/* Save now */}
        <Button variant="primary" mode={mode} mini icon="check" onClick={handleSaveNow}>
          save
        </Button>
      </div>

      {/* ── Excalidraw ─────────────────────────────────────────────── */}
      {/* The wrapper background IS the canvas background — Excalidraw's canvas
          uses viewBackgroundColor:'transparent', so whatever is behind shows through.
          className="dark" propagates .dark selectors into the Excalidraw subtree. */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: t.bg }}
        className={mode === "dark" ? "dark excalidraw-wrapper" : "excalidraw-wrapper"}>
        <Excalidraw
          key={noteId}
          excalidrawAPI={setExcalidrawAPI}
          initialData={excalidrawInitialData}
          theme={mode === "dark" ? "dark" : "light"}
          onChange={handleChange}
          renderTopRightUI={() => null}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              export: false,
              loadScene: false,
              saveToActiveFile: false,
              toggleTheme: false,
              clearCanvas: false,
            },
            tools: { image: false },
          }}
        />
      </div>

    </div>
  );
}
