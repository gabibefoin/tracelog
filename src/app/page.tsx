"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { NoteList } from "@/components/NoteList";
import { NoteEditor } from "@/components/NoteEditor";
import { AIPanel } from "@/components/AIPanel";
import * as storage from "@/lib/storage";
import type { Note } from "@/types";

export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [aiOpen, setAiOpen] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [layoutMode, setLayoutMode] = useState<"list" | "grid">("list");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = storage.getAllNotes();
    setNotes(all);
    if (all.length > 0) setActiveNote(all[0]);
    setHydrated(true);
  }, []);

  // Sync .dark class on <html> so globals.css dark tokens + Excalidraw dark theme work
  useEffect(() => {
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  // ⌘K → focus search, ⌘J → toggle AI
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        (document.querySelector('input[placeholder*="find"]') as HTMLInputElement | null)?.focus();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setAiOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function selectNote(id: string) {
    const n = notes.find((n) => n.id === id) ?? storage.getNoteById(id);
    if (n) setActiveNote(n);
  }

  function createNote() {
    const note = storage.createNote("vault");
    const all = storage.getAllNotes();
    setNotes(all);
    setActiveNote(note);
  }

  function updateNote(updates: Partial<Pick<Note, "title" | "content" | "body" | "tags" | "folder" | "excerpt" | "canvas_data">>) {
    if (!activeNote) return;
    const updated = storage.updateNote(activeNote.id, updates);
    if (!updated) return;
    setActiveNote(updated);
    setNotes(storage.getAllNotes());
  }

  function deleteNote() {
    if (!activeNote) return;
    if (!confirm("Delete this note?")) return;
    storage.deleteNote(activeNote.id);
    const all = storage.getAllNotes();
    setNotes(all);
    setActiveNote(all[0] ?? null);
  }

  function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setNotes(storage.getAllNotes());
    } else {
      setNotes(storage.searchNotes(q));
    }
  }

  function handleLinkNavigate(title: string) {
    const target = storage.getAllNotes().find(
      (n) => n.title.toLowerCase() === title.toLowerCase()
    );
    if (target) selectNote(target.id);
  }

  if (!hydrated) return null;

  const LIGHT_BG = "#F4F1E8";
  const DARK_BG  = "#1F1D1A";

  return (
    <div style={{
      width: "100vw",
      height: "100vh",
      display: "grid",
      gridTemplateColumns: aiOpen ? "260px 320px 1fr 340px" : "260px 320px 1fr",
      background: mode === "dark" ? DARK_BG : LIGHT_BG,
      overflow: "hidden",
    }}>
      <Sidebar
        notes={notes}
        activeNoteId={activeNote?.id ?? null}
        onSelectNote={selectNote}
        onNewNote={createNote}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        mode={mode}
        layoutMode={layoutMode}
        onToggleLayout={() => setLayoutMode((m) => (m === "list" ? "grid" : "list"))}
      />

      <NoteList
        notes={notes}
        activeNoteId={activeNote?.id ?? null}
        onSelectNote={selectNote}
        filter={filter}
        setFilter={setFilter}
        mode={mode}
        layoutMode={layoutMode}
      />

      {activeNote ? (
        <NoteEditor
          note={activeNote}
          notes={notes}
          mode={mode}
          onUpdate={updateNote}
          onDelete={deleteNote}
          onLinkNavigate={handleLinkNavigate}
          onOpenAI={() => setAiOpen(true)}
          onToggleTheme={() => setMode((m) => m === "light" ? "dark" : "light")}
          onSelectNote={selectNote}
          onFilterByFolder={(folder) => handleSearch(folder)}
        />
      ) : (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          background: mode === "dark" ? "#1F1D1A" : "#F4F1E8",
          color: mode === "dark" ? "#6E6A60" : "#8B8678",
          fontFamily: '"IBM Plex Sans", -apple-system, sans-serif',
          fontSize: 14,
        }}>
          select a note
        </div>
      )}

      {aiOpen && activeNote && (
        <AIPanel note={activeNote} mode={mode} onClose={() => setAiOpen(false)} />
      )}
    </div>
  );
}
