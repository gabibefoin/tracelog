import { createClient } from "@supabase/supabase-js";
import type { Note } from "@/types";

interface NoteLink { source_note_id: string; target_note_id: string; }
type Topic = string;

export type Database = {
  public: {
    Tables: {
      notes: {
        Row: Note;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          topic: Topic;
          tags: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          content?: string;
          topic?: Topic;
          tags?: string[];
          updated_at?: string;
        };
      };
      links: {
        Row: NoteLink;
        Insert: NoteLink;
        Update: Partial<NoteLink>;
      };
    };
    Functions: {
      search_notes: {
        Args: { query: string; uid: string };
        Returns: Array<{
          id: string;
          title: string;
          topic: string;
          tags: string[];
          snippet: string;
          rank: number;
        }>;
      };
    };
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
