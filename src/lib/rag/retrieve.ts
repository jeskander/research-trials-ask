import type { Chunk, SourceReference } from "../types";
import { cosineSimilarity, embedText } from "./embeddings";
import { inferSectionLabel, isNavigationChunk, keywordBoost } from "./chunk-utils";

const TOP_K = 8;
const CANDIDATE_POOL = 24;

export async function retrieveChunks(
  query: string,
  chunks: Chunk[],
): Promise<{ chunks: Chunk[]; sources: SourceReference[] }> {
  const queryEmbedding = await embedText(query);

  const scored = chunks
    .map((chunk) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      const navigationPenalty = isNavigationChunk(chunk.text) ? -0.2 : 0;
      const boost = keywordBoost(query, chunk.text);
      return {
        chunk,
        score: similarity + navigationPenalty + boost,
      };
    })
    .sort((a, b) => b.score - a.score);

  const substantive = scored.filter((item) => !isNavigationChunk(item.chunk.text));
  const pool = (substantive.length > 0 ? substantive : scored).slice(0, CANDIDATE_POOL);
  const retrieved = pool.slice(0, TOP_K).map((item) => item.chunk);

  const sources: SourceReference[] = retrieved.map((chunk) => ({
    chunkId: chunk.id,
    page: chunk.page,
    section: inferSectionLabel(chunk.text, chunk.section),
    excerpt: chunk.text,
  }));

  return { chunks: retrieved, sources };
}
