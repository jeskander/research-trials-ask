"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, SourceReference, Trial } from "@/lib/types";
import { isNavigationChunk } from "@/lib/rag/chunk-utils";
import { ChatPanel } from "@/components/chat-panel";
import { SourcePanel } from "@/components/source-panel";

function pickSourceForPage(
  sources: SourceReference[],
  page: number,
): SourceReference | undefined {
  const matching = sources.filter((s) => s.page === page);
  return matching.find((s) => !isNavigationChunk(s.excerpt)) ?? matching[0];
}

function isMobileSourceDrawer(): boolean {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 1023px)").matches;
  const landscapeShort = window.matchMedia(
    "(orientation: landscape) and (max-height: 500px)",
  ).matches;
  return narrow && !landscapeShort;
}

export function AppShell({ initialTrials }: { initialTrials: Trial[] }) {
  const [trials] = useState<Trial[]>(initialTrials);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messagesByTrial, setMessagesByTrial] = useState<Record<string, ChatMessage[]>>({});
  const [sourcesByTrial, setSourcesByTrial] = useState<Record<string, SourceReference[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const [mobileSourceOpen, setMobileSourceOpen] = useState(false);

  const selectedTrial = trials.find((t) => t.id === selectedId) ?? null;
  const messages = selectedId ? (messagesByTrial[selectedId] ?? []) : [];
  const sources = selectedId ? (sourcesByTrial[selectedId] ?? []) : [];

  const handleSelectTrial = (id: string) => {
    setSelectedId(id);
    setError(null);
    setActivePage(null);
    setActiveChunkId(null);
    setMobileSourceOpen(false);
  };

  const setActiveSource = useCallback((chunkId: string | null, page: number) => {
    setActiveChunkId(chunkId);
    setActivePage(page);
  }, []);

  const handleCitationClick = useCallback(
    (page: number) => {
      const source = pickSourceForPage(sources, page);
      if (source) {
        setActiveSource(source.chunkId, source.page);
      } else {
        setActiveSource(null, page);
      }
      if (isMobileSourceDrawer()) {
        setMobileSourceOpen(true);
      }
    },
    [sources, setActiveSource],
  );

  useEffect(() => {
    if (!isMobileSourceDrawer() && mobileSourceOpen) {
      setMobileSourceOpen(false);
    }
  }, [mobileSourceOpen]);

  // Clear any stale body scroll-lock if the page loads on desktop
  useEffect(() => {
    if (isMobileSourceDrawer()) return;
    const { body, documentElement } = document;
    documentElement.style.overflow = "";
    body.style.overflow = "";
    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";
  }, []);

  useEffect(() => {
    if (!mobileSourceOpen || !isMobileSourceDrawer()) return;

    const scrollY = window.scrollY;
    const { body, documentElement } = document;

    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      documentElement.style.overflow = "";
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [mobileSourceOpen]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!selectedId) return;

      const userMessage: ChatMessage = { role: "user", content };
      const updatedMessages = [...(messagesByTrial[selectedId] ?? []), userMessage];

      setMessagesByTrial((prev) => ({ ...prev, [selectedId]: updatedMessages }));
      setIsLoading(true);
      setError(null);
      setSourcesByTrial((prev) => ({ ...prev, [selectedId]: [] }));
      setActivePage(null);
      setActiveChunkId(null);
      setMobileSourceOpen(false);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trialId: selectedId, messages: updatedMessages }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not retrieve an answer");
        }

        const sourcesHeader = res.headers.get("X-Sources");
        let parsedSources: SourceReference[] = [];
        if (sourcesHeader) {
          parsedSources = JSON.parse(decodeURIComponent(sourcesHeader)) as SourceReference[];
          setSourcesByTrial((prev) => ({ ...prev, [selectedId]: parsedSources }));
          if (parsedSources.length > 0) {
            const first =
              parsedSources.find((s) => !isNavigationChunk(s.excerpt)) ?? parsedSources[0];
            setActiveSource(first.chunkId, first.page);
          }
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let assistantContent = "";

        setMessagesByTrial((prev) => ({
          ...prev,
          [selectedId]: [...updatedMessages, { role: "assistant", content: "" }],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          assistantContent += decoder.decode(value, { stream: true });
          setMessagesByTrial((prev) => ({
            ...prev,
            [selectedId]: [
              ...updatedMessages,
              { role: "assistant", content: assistantContent },
            ],
          }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
        setMessagesByTrial((prev) => ({ ...prev, [selectedId]: updatedMessages }));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedId, messagesByTrial, setActiveSource],
  );

  const showMobileSourceBar =
    isMobileSourceDrawer() &&
    activePage !== null &&
    selectedId !== null &&
    !mobileSourceOpen;

  return (
    <div className="grid h-full min-h-0 flex-1 grid-cols-1 overflow-hidden landscape-short:grid-cols-[minmax(0,1fr)_14rem] lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
      <ChatPanel
        trials={trials}
        selectedId={selectedId}
        onSelectTrial={handleSelectTrial}
        trial={selectedTrial}
        messages={messages}
        isLoading={isLoading}
        error={error}
        activePage={activePage}
        onSend={handleSend}
        onCitationClick={handleCitationClick}
        mobileSourcePage={showMobileSourceBar ? activePage : null}
        onOpenMobileSource={() => setMobileSourceOpen(true)}
        mobileScrollLocked={mobileSourceOpen && isMobileSourceDrawer()}
      />

      {/* Laptop / landscape phone: source column beside chat */}
      <div className="hidden h-full min-h-0 overflow-hidden landscape-short:block lg:block">
          <SourcePanel
            trialId={selectedId}
            activePage={activePage}
            activeChunkId={activeChunkId}
            sources={sources}
            onSelectSource={setActiveSource}
          />
      </div>

      {/* Phone portrait: bottom sheet for protocol source */}
      {mobileSourceOpen && activePage !== null && selectedId !== null && (
        <>
          <button
            type="button"
            aria-label="Close protocol source"
            className="fixed inset-0 z-40 touch-none bg-black/35 landscape-short:hidden lg:hidden"
            onClick={() => setMobileSourceOpen(false)}
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(72dvh,28rem)] flex-col overflow-hidden rounded-t-2xl shadow-[0_-8px_32px_rgba(0,0,0,0.12)] landscape-short:hidden lg:hidden"
            style={{ background: "var(--paper)" }}
          >
            <SourcePanel
              trialId={selectedId}
              activePage={activePage}
              activeChunkId={activeChunkId}
              sources={sources}
              onSelectSource={setActiveSource}
              variant="drawer"
              onClose={() => setMobileSourceOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}
