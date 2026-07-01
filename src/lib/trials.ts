import { readFileSync } from "fs";
import { join } from "path";
import type { Trial, TrialIndex } from "./types";

const DATA_DIR = join(process.cwd(), "data");

export function getTrials(): Trial[] {
  const raw = readFileSync(join(DATA_DIR, "trials.json"), "utf-8");
  return JSON.parse(raw) as Trial[];
}

export function getTrialById(id: string): Trial | undefined {
  return getTrials().find((trial) => trial.id === id);
}

let indexCache: Map<string, TrialIndex> | null = null;

export function getTrialIndex(trialId: string): TrialIndex | null {
  if (!indexCache) {
    indexCache = new Map();
    for (const trial of getTrials()) {
      try {
        const raw = readFileSync(join(DATA_DIR, "index", `${trial.id}.json`), "utf-8");
        indexCache.set(trial.id, JSON.parse(raw) as TrialIndex);
      } catch {
        // Index not generated yet
      }
    }
  }
  return indexCache.get(trialId) ?? null;
}

export function getPageExcerpt(trialId: string, page: number): string | null {
  const index = getTrialIndex(trialId);
  if (!index) return null;
  return index.pages[String(page)] ?? null;
}
