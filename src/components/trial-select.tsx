"use client";

import type { Trial } from "@/lib/types";

interface TrialSelectProps {
  trials: Trial[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TrialSelect({ trials, selectedId, onSelect }: TrialSelectProps) {
  if (trials.length === 0) {
    return (
      <div
        className="rounded border border-dashed px-3 py-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--rule-strong)", color: "var(--ink-muted)" }}
      >
        No trials loaded. Add PDFs to{" "}
        <code className="text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
          data/pdfs/
        </code>
        , update{" "}
        <code className="text-[10px]" style={{ fontFamily: "var(--font-mono)" }}>
          trials.json
        </code>
        , then run ingest.
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <label
        htmlFor="trial-select"
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest"
        style={{ color: "var(--ink-faint)" }}
      >
        Registered trial
      </label>
      <div className="relative">
        <select
          id="trial-select"
          value={selectedId ?? ""}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
          className="trial-select w-full min-h-11 appearance-none rounded border py-2.5 pl-3 pr-10 text-[14px] outline-none sm:text-[13px]"
          style={{
            borderColor: "var(--rule)",
            background: "var(--paper)",
            color: selectedId ? "var(--ink)" : "var(--ink-muted)",
          }}
        >
          <option value="" disabled>
            Select a trial…
          </option>
          {trials.map((trial) => (
            <option key={trial.id} value={trial.id}>
              {trial.title} · {trial.condition} · Phase {trial.phase}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px]"
          style={{ color: "var(--ink-faint)" }}
          aria-hidden
        >
          ▾
        </span>
      </div>
    </div>
  );
}
