import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import OpenAI from "openai";
import {
  loadProtocolPages,
  chunkPage,
} from "./lib/parse-protocol.js";

config({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local") });

const EMBEDDING_MODEL = "text-embedding-3-small";

interface TrialMeta {
  id: string;
  title: string;
  protocolFile: string;
}

async function embedBatch(openai: OpenAI, texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function ingestTrial(
  openai: OpenAI,
  trial: TrialMeta,
  pdfsDir: string,
  protocolsDir: string,
  indexDir: string,
) {
  const pages = await loadProtocolPages(pdfsDir, protocolsDir, trial.protocolFile);

  if (pages.length === 0) {
    throw new Error(`No text extracted from ${trial.protocolFile}`);
  }

  const pagesMap: Record<string, string> = {};
  for (const page of pages) {
    pagesMap[String(page.page)] = page.text;
  }

  let chunkIndex = 0;
  const rawChunks: Array<{ id: string; text: string; page: number; section: string }> = [];
  for (const page of pages) {
    const pageChunks = chunkPage(page, trial.id, chunkIndex);
    rawChunks.push(...pageChunks);
    chunkIndex += pageChunks.length;
  }

  console.log(`  ${pages.length} pages → ${rawChunks.length} chunks`);
  console.log(`  Embedding...`);

  const batchSize = 20;
  const embeddings: number[][] = [];
  for (let i = 0; i < rawChunks.length; i += batchSize) {
    const batch = rawChunks.slice(i, i + batchSize).map((c) => c.text);
    const batchEmbeddings = await embedBatch(openai, batch);
    embeddings.push(...batchEmbeddings);
  }

  const chunks = rawChunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  const index = { trialId: trial.id, chunks, pages: pagesMap };
  writeFileSync(join(indexDir, `${trial.id}.json`), JSON.stringify(index));
  console.log(`  ✓ Wrote data/index/${trial.id}.json`);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Error: OPENAI_API_KEY is not set.");
    console.error("Create .env.local from .env.example and add your key, then run: npm run ingest");
    process.exit(1);
  }

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const trialsPath = join(root, "data", "trials.json");
  const pdfsDir = join(root, "data", "pdfs");
  const protocolsDir = join(root, "data", "protocols");
  const indexDir = join(root, "data", "index");

  if (!existsSync(pdfsDir)) mkdirSync(pdfsDir, { recursive: true });
  if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true });

  const trials = JSON.parse(readFileSync(trialsPath, "utf-8")) as TrialMeta[];

  if (trials.length === 0) {
    console.error("No trials defined in data/trials.json.");
    console.error("Add your PDFs to data/pdfs/ and register them in data/trials.json");
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });
  const onlyTrial = process.argv[2];

  const toIngest = onlyTrial ? trials.filter((t) => t.id === onlyTrial) : trials;
  if (onlyTrial && toIngest.length === 0) {
    console.error(`Trial not found: ${onlyTrial}`);
    process.exit(1);
  }

  console.log(`Ingesting ${toIngest.length} trial protocol(s)...\n`);

  for (const trial of toIngest) {
    console.log(`${trial.id}: ${trial.title}`);
    console.log(`  Source: ${trial.protocolFile}`);
    await ingestTrial(openai, trial, pdfsDir, protocolsDir, indexDir);
    console.log();
  }

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
