#!/usr/bin/env tsx
/**
 * Pre-push safety check: fail if secrets or sensitive files are staged/tracked.
 * Run: npm run check-secrets
 */
import { execSync } from "child_process";
import { existsSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors: string[] = [];

function run(cmd: string): string {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

function isGitRepo(): boolean {
  return existsSync(join(ROOT, ".git"));
}

// Block tracked env files
if (isGitRepo()) {
  const tracked = run("git ls-files");
  const blockedPatterns = [
    /^\.env\.local$/,
    /^\.env$/,
    /^\.env\.development/,
    /^\.env\.production/,
  ];
  for (const file of tracked.split("\n").filter(Boolean)) {
    if (blockedPatterns.some((p) => p.test(file))) {
      errors.push(`Tracked secret file: ${file} — remove with: git rm --cached ${file}`);
    }
  }
}

// Scan staged + tracked text files for OpenAI key patterns
const keyPattern = /sk-(proj-)?[A-Za-z0-9_-]{20,}/g;
const scanPaths: string[] = [];

if (isGitRepo()) {
  scanPaths.push(...run("git diff --cached --name-only").split("\n").filter(Boolean));
  scanPaths.push(...run("git ls-files").split("\n").filter(Boolean));
} else {
  // Not a git repo yet — scan project source only
  scanPaths.push(
    ...readdirSync(ROOT, { withFileTypes: true })
      .filter((e) => e.isFile() && !e.name.startsWith("."))
      .map((e) => e.name),
  );
}

const uniquePaths = [...new Set(scanPaths)].filter(
  (p) =>
    p &&
    !p.startsWith("node_modules/") &&
    !p.startsWith(".next/") &&
    !p.endsWith(".json") &&
    !p.endsWith(".lock") &&
    p !== ".env.example",
);

for (const rel of uniquePaths) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) continue;
  try {
    const content = readFileSync(full, "utf-8");
    const matches = content.match(keyPattern);
    if (matches) {
      errors.push(`Possible API key found in ${rel} — remove before pushing`);
    }
  } catch {
    // binary or unreadable — skip
  }
}

// Warn if .env.local exists (expected locally, must stay untracked)
if (existsSync(join(ROOT, ".env.local")) && isGitRepo()) {
  const tracked = run("git ls-files .env.local");
  if (tracked) {
    errors.push(".env.local is tracked by git — it must only exist locally");
  }
}

if (errors.length > 0) {
  console.error("\n❌ Secret check failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nEnsure API keys live only in .env.local (gitignored).\n");
  process.exit(1);
}

console.log("✓ Secret check passed — no API keys or .env files tracked for commit.");
