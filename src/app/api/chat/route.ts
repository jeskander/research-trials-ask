import OpenAI from "openai";
import { NextRequest } from "next/server";
import { getTrialById, getTrialIndex } from "@/lib/trials";
import { retrieveChunks } from "@/lib/rag/retrieve";
import { buildSystemPrompt } from "@/lib/rag/prompt";
import { resolveSourceExcerpt } from "@/lib/rag/format-protocol";
import type { ChatMessage, Chunk, SourceReference } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { trialId, messages } = body as {
      trialId: string;
      messages: ChatMessage[];
    };

    if (!trialId || !messages?.length) {
      return Response.json({ error: "trialId and messages are required" }, { status: 400 });
    }

    const trial = getTrialById(trialId);
    if (!trial) {
      return Response.json({ error: "Trial not found" }, { status: 404 });
    }

    const index = getTrialIndex(trialId);
    if (!index) {
      return Response.json(
        {
          error:
            "Trial index not found. Run `npm run ingest` with your OPENAI_API_KEY to generate embeddings.",
        },
        { status: 503 },
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return Response.json({ error: "No user message found" }, { status: 400 });
    }

    const { chunks, sources } = await retrieveChunks(lastUserMessage.content, index.chunks);
    const query = lastUserMessage.content;

    const enrichChunk = (chunk: Chunk) => ({
      ...chunk,
      text: resolveSourceExcerpt(
        index.pages[String(chunk.page)],
        chunk.text,
        chunk.section,
        query,
      ),
    });

    const enrichedChunks = chunks.map(enrichChunk);

    const enrichedSources: SourceReference[] = [];
    const seen = new Set<string>();
    for (const source of sources) {
      const chunk = index.chunks.find((c) => c.id === source.chunkId);
      const excerpt = resolveSourceExcerpt(
        index.pages[String(source.page)],
        chunk?.text ?? source.excerpt,
        source.section,
        query,
      );
      const key = `${source.page}:${source.section}:${excerpt.slice(0, 100)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      enrichedSources.push({ ...source, excerpt });
    }

    const systemPrompt = buildSystemPrompt(trial.title, enrichedChunks);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Sources": encodeURIComponent(JSON.stringify(enrichedSources)),
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
