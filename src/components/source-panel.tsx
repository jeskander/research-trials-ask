"use client";

import { useEffect, useState } from "react";
import type { SourceReference } from "@/lib/types";
import { ProtocolExcerpt } from "@/components/protocol-excerpt";

interface SourcePanelProps {
  trialId: string | null;
  activePage: number | null;
  activeChunkId: string | null;
  sources: SourceReference[];
  onSelectSource: (chunkId: string, page: number) => void;
  variant?: "sidebar" | "drawer";
  onClose?: () => void;
}

export function SourcePanel({
  trialId,
  activePage,
  activeChunkId,
  sources,
  onSelectSource,
  variant = "sidebar",
  onClose,
}: SourcePanelProps) {
  const [fullPage, setFullPage] = useState<string | null>(null);
  const [loadingFullPage, setLoadingFullPage] = useState(false);
  const [showFullPage, setShowFullPage] = useState(false);

  const activeSource =
    (activeChunkId ? sources.find((s) => s.chunkId === activeChunkId) : null) ??
    sources.find((s) => s.page === activePage) ??
    null;
  const isDrawer = variant === "drawer";

  useEffect(() => {
    setShowFullPage(false);
    setFullPage(null);
  }, [activeChunkId, activePage, trialId]);

  const loadFullPage = () => {
    if (!trialId || activePage === null || fullPage) {
      setShowFullPage(true);
      return;
    }

    setLoadingFullPage(true);
    fetch(`/api/trials/${trialId}/excerpt?page=${activePage}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Excerpt unavailable");
        const data = await res.json();
        setFullPage(data.excerpt);
        setShowFullPage(true);
      })
      .catch(() => {
        setShowFullPage(false);
      })
      .finally(() => setLoadingFullPage(false));
  };

  return (
    <aside
      className={`grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden ${
        isDrawer ? "border-t" : "border-l"
      }`}
      style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
    >
      <div className="min-h-0 shrink-0">
        <div
          className="flex items-start justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
        >
          <div className="min-w-0">
            <p
              className="text-[11px] font-medium uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Protocol source
            </p>
            {activePage !== null && (
              <p
                className="mt-1 text-sm font-medium"
                style={{ fontFamily: "var(--font-display)", color: "var(--research)" }}
              >
                Page {activePage}
              </p>
            )}
          </div>
          {isDrawer && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close source panel"
              className="shrink-0 rounded px-2 py-1 text-[13px] font-medium"
              style={{ color: "var(--ink-muted)" }}
            >
              Close
            </button>
          )}
        </div>

        {isDrawer && (
          <div
            className="mx-auto my-1 h-1 w-10 rounded-full"
            style={{ background: "var(--rule-strong)" }}
            aria-hidden
          />
        )}
      </div>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden">
        <div className="min-h-0 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {!trialId ? (
            <div
              className="px-4 py-8 text-center text-xs leading-relaxed"
              style={{ color: "var(--ink-muted)" }}
            >
              Select a trial to view protocol excerpts alongside your questions.
            </div>
          ) : activePage === null ? (
            <div
              className="px-4 py-8 text-center text-xs leading-relaxed"
              style={{ color: "var(--ink-muted)" }}
            >
              Click a page reference in an answer to read the original protocol text here.
            </div>
          ) : (
            <div className="px-4 py-4 pb-6">
              {activeSource?.section && (
                <p
                  className="mb-3 text-[11px] font-medium uppercase tracking-wide"
                  style={{ color: "var(--ink-faint)" }}
                >
                  {activeSource.section}
                </p>
              )}
              {activeSource ? (
                <>
                  <div
                    className="rounded border px-3 py-3"
                    style={{
                      borderColor: "var(--rule)",
                      background: "var(--surface)",
                    }}
                  >
                    <ProtocolExcerpt
                      text={showFullPage && fullPage ? fullPage : activeSource.excerpt}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={loadFullPage}
                    disabled={loadingFullPage}
                    className="mt-3 text-[11px] font-medium underline-offset-2 hover:underline"
                    style={{ color: "var(--citation)" }}
                  >
                    {loadingFullPage
                      ? "Loading full page…"
                      : showFullPage
                        ? "Showing full page"
                        : "View full page"}
                  </button>
                </>
              ) : (
                <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
                  No matching excerpt for this page.
                </p>
              )}
            </div>
          )}
        </div>

        {sources.length > 0 && (
          <div
            className="max-h-36 shrink-0 overflow-y-auto border-t px-4 py-3"
            style={{ borderColor: "var(--rule)" }}
          >
            <p
              className="mb-2 text-[10px] font-medium uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Retrieved sections
            </p>
            <ul className="space-y-1">
              {sources.map((src) => {
                const selected = activeChunkId === src.chunkId;
                return (
                  <li key={src.chunkId}>
                    <button
                      type="button"
                      onClick={() => onSelectSource(src.chunkId, src.page)}
                      className="w-full rounded px-2 py-2 text-left text-[11px] transition-colors sm:py-1.5"
                      style={{
                        background: selected ? "var(--citation-soft)" : "transparent",
                        color: selected ? "var(--research)" : "var(--ink-muted)",
                      }}
                    >
                      <span style={{ fontFamily: "var(--font-mono)" }}>p.{src.page}</span>
                      <span style={{ color: "var(--ink-faint)" }}> · {src.section}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
