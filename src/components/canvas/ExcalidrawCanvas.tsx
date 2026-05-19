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
      carregando canvas…
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
      {state === "saving" ? "salvando…" : "salvo"}
    </div>
  );
}

function ImportToast({
  state, mode,
}: { state: "idle" | "importing" | "success" | "error"; mode: "light" | "dark" }) {
  if (state === "idle") return null;
  const t = DS[mode];
  const dotColor = state === "importing" ? "#BC8438" : state === "success" ? "#6E8462" : "#DB4842";
  const label = state === "importing" ? "importando…"
    : state === "success" ? "arquivo importado"
    : "formato não suportado";
  return (
    <div style={{
      position: "fixed",
      bottom: 24, left: "50%",
      transform: "translateX(-50%)",
      background: t.surface,
      border: `1px solid ${t.rule}`,
      borderRadius: 8,
      padding: "8px 16px",
      fontFamily: '"IBM Plex Sans", sans-serif',
      fontSize: 12, color: t.ink,
      boxShadow: mode === "dark"
        ? "0 4px 16px rgba(0,0,0,0.4)"
        : "0 4px 16px rgba(26,24,20,0.1)",
      zIndex: 100,
      display: "flex", alignItems: "center", gap: 8,
      pointerEvents: "none",
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
        background: dotColor,
        animation: state === "importing" ? "tl-pulse 1s ease-in-out infinite" : "none",
      }} />
      {label}
    </div>
  );
}

export default function ExcalidrawCanvas({
  noteId, noteTitle, initialData, onSave, onBack, mode,
}: ExcalidrawCanvasProps) {
  const apiRef = useRef<AnyAPI>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [importState, setImportState] = useState<"idle" | "importing" | "success" | "error">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);
  const savedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Import handler — supports .excalidraw (merge) and images (insert at viewport center)
  const handleImport = useCallback(async (file: File) => {
    if (!apiRef.current) return;
    setImportState("importing");

    const finish = (s: "success" | "error") => {
      setImportState(s);
      setTimeout(() => setImportState("idle"), 2000);
    };

    try {
      if (file.name.endsWith(".excalidraw")) {
        // Dynamic import avoids loading Excalidraw utils during SSR
        const { loadFromBlob } = await import("@excalidraw/excalidraw");
        const blob = new Blob([await file.text()], { type: "application/json" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scene = await (loadFromBlob as any)(blob, null, null);
        const current = apiRef.current.getSceneElements();
        apiRef.current.updateScene({
          elements: [...current, ...(scene.elements ?? [])],
        });
        if (scene.files && Object.keys(scene.files).length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          apiRef.current.addFiles(Object.values(scene.files) as any[]);
        }
        finish("success");

      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const api = apiRef.current;
          if (!api || !e.target?.result) { finish("error"); return; }

          const dataURL = e.target.result as string;
          const fileId = Math.random().toString(36).slice(2, 12);

          // Measure natural image dimensions for correct aspect ratio
          const img = new Image();
          img.onload = () => {
            const MAX_W = 600;
            const natW = img.naturalWidth || 400;
            const natH = img.naturalHeight || 300;
            const w = Math.min(natW, MAX_W);
            const h = natH * (w / natW);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            api.addFiles([{ id: fileId, dataURL, mimeType: file.type, created: Date.now() } as any]);

            const appState = api.getAppState();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const zv: number = (appState.zoom as any)?.value ?? 1;
            const cx = -appState.scrollX + (window.innerWidth / 2 - w / 2) / zv;
            const cy = -appState.scrollY + (window.innerHeight / 2 - h / 2) / zv;

            api.updateScene({
              elements: [
                ...api.getSceneElements(),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {
                  type: "image", id: Math.random().toString(36).slice(2, 12),
                  x: cx, y: cy, width: w, height: h,
                  angle: 0, strokeColor: "transparent", backgroundColor: "transparent",
                  fillStyle: "hachure", strokeWidth: 1, strokeStyle: "solid",
                  roughness: 1, opacity: 100, groupIds: [], frameId: null,
                  roundness: null,
                  seed: Math.floor(Math.random() * 1e6),
                  version: 1, versionNonce: Math.floor(Math.random() * 1e6),
                  isDeleted: false, boundElements: null, updated: Date.now(),
                  link: null, locked: false, status: "saved",
                  fileId, scale: [1, 1] as [number, number],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
              ],
            });
            finish("success");
          };
          img.onerror = () => finish("error");
          img.src = dataURL;
        };
        reader.onerror = () => finish("error");
        reader.readAsDataURL(file);

      } else {
        finish("error");
      }
    } catch {
      finish("error");
    }
  }, []);

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

        {/* Back */}
        <Button variant="secondary" mode={mode} mini onClick={onBack}>
          <span style={{ display: "inline-block", transform: "rotate(180deg)", lineHeight: 0 }}>
            <PixelIcon name="arrowRight" size={14} color="currentColor" />
          </span>
          voltar à nota
        </Button>

        {/* Note name */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <span style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontSize: 16, letterSpacing: "-0.01em", color: t.ink,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {noteTitle || "Sem título"}
          </span>
          <Badge variant="neutral" mode={mode}>canvas</Badge>
        </div>

        {/* Save indicator */}
        <SaveIndicator state={saveState} />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".excalidraw,.png,.jpg,.jpeg,.svg"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = ""; // reset so the same file can be re-imported
          }}
        />

        {/* Import button */}
        <Button
          variant="secondary"
          mode={mode}
          mini
          icon="upload"
          disabled={importState === "importing"}
          onClick={() => fileInputRef.current?.click()}
        >
          importar
        </Button>

        {/* Save now */}
        <Button variant="primary" mode={mode} mini icon="check" onClick={handleSaveNow}>
          salvar
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

      {/* Import toast */}
      <ImportToast state={importState} mode={mode} />

    </div>
  );
}
