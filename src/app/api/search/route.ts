import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);

  // Try Postgres full-text search stored function
  const { data: ftsData, error: ftsError } = await supabase.rpc(
    "search_notes",
    { query: q, uid: user.id }
  );

  if (!ftsError && ftsData) {
    return NextResponse.json(ftsData);
  }

  // Fallback: simple ilike on title
  const { data: fallback } = await supabase
    .from("notes")
    .select("id, title, topic, tags, updated_at")
    .eq("user_id", user.id)
    .ilike("title", `%${q}%`)
    .limit(20);

  return NextResponse.json(fallback ?? []);
}
