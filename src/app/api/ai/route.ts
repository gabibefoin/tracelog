import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RequestBody {
  noteTitle: string;
  noteContent: string;
  noteTopic: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as RequestBody;
  const { noteTitle, noteContent, noteTopic, messages } = body;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const systemPrompt = `You are a cybersecurity expert assistant embedded in Tracelog, a study notes app for security professionals.

The user is currently viewing a note:
- Title: "${noteTitle}"
- Topic: ${noteTopic}
- Content:
---
${noteContent.slice(0, 4000)}
---

Answer questions about this note's content: explain concepts, provide examples, suggest tools, write payloads for CTF/lab contexts, expand on techniques. Be direct and technical. Use code blocks when relevant. Keep answers concise but complete.`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return NextResponse.json({ content: content.text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
