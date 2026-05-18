export type TagVariant = "scope" | "recon" | "patched" | "signal" | "vuln" | "neutral";
export type TagEntry = [TagVariant, string];

export type BlockType = "p" | "h2" | "ol" | "ul" | "code" | "callout" | "links";

export interface Block {
  type: BlockType;
  v: string | string[];
  lang?: string;
  tone?: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;     // kept for search + AI context
  topic: string;
  tags: TagEntry[];
  folder: string;
  dot: string;         // "red" | "signal" | "recon" | "scope" | "patched" | "neutral"
  excerpt: string;
  body: Block[];
  canvas_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const TOPICS = ["Redes", "Web", "Malware", "CTF", "OSINT", "Reversing"] as const;
export type Topic = (typeof TOPICS)[number];
