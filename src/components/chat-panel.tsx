"use client";

import { useRef, useEffect, useState } from "react";
import type { ChatMessage, Trial } from "@/lib/types";
import { MessageContent } from "./message-content";
import { TrialSelect } from "./trial-select";

const SUGGESTED_QUESTIONS = [
  "What are the inclusion criteria?",
  "What are the exclusion criteria?",
  "What is the primary endpoint?",
  "What medications are prohibited?",
];

interface ChatPanelProps {
  trials: Trial[];
  selectedId: string | null;
  onSelectTrial: (id: string) => void;
  trial: Trial | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  activePage: number | null;
  onSend: (message: string) => void;
  onCitationClick: (page: number) => void;
  mobileSourcePage?: number | null;
  onOpenMobileSource?: () => void;
  mobileScrollLocked?: boolean;
}

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-muted)" }}>
      <span>Reading protocol</span>
      <span className="flex gap-0.5">
        <span className="loading-dot inline-block h-1 w-1 rounded-full" style={{ background: "var(--ink-faint)" }} />
        <span className="loading-dot inline-block h-1 w-1 rounded-full" style={{ background: "var(--ink-faint)" }} />
        <span className="loading-dot inline-block h-1 w-1 rounded-full" style={{ background: "var(--ink-faint)" }} />
      </span>
    </div>
  );
}

export function ChatPanel({
  trials,
  selectedId,
  onSelectTrial,
  trial,
  messages,
  isLoading,
  error,
  activePage,
  onSend,
  onCitationClick,
  mobileSourcePage = null,
  onOpenMobileSource,
  mobileScrollLocked = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !trial || isLoading) return;
    onSend(trimmed);
    setInput("");
  }

  return (
    <main className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ background: "var(--paper)" }}>
      {/* Trial context bar */}
      <div
        className="shrink-0 border-b px-4 py-2.5 sm:px-5 sm:py-3"
        style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
      >
        <TrialSelect trials={trials} selectedId={selectedId} onSelect={onSelectTrial} />
        {trial && (
          <p className="mt-2 text-xs" style={{ color: "var(--ink-muted)" }}>
            {trial.sponsor}
            <span style={{ color: "var(--ink-faint)" }}>
              {" "}
              ·{" "}
              <span style={{ fontFamily: "var(--font-mono)" }}>{trial.id}</span>
            </span>
          </p>
        )}
      </div>

      {/* Conversation */}
      <div
        className={`min-h-0 flex-1 px-4 py-4 sm:px-5 sm:py-5 [-webkit-overflow-scrolling:touch] ${
          mobileScrollLocked ? "overflow-hidden touch-none" : "overflow-y-auto"
        }`}
      >
        {!trial && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <p
              className="max-w-sm text-sm leading-relaxed"
              style={{ fontFamily: "var(--font-display)", color: "var(--ink-muted)" }}
            >
              Ask anything about the protocol — answers are drawn from the source
              document with page references.
            </p>
          </div>
        )}

        {trial && messages.length === 0 && (
          <div className="animate-in mb-6">
            <p
              className="mb-3 text-[11px] font-medium uppercase tracking-widest"
              style={{ color: "var(--ink-faint)" }}
            >
              Common queries
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onSend(q)}
                  disabled={isLoading}
                  className="rounded border px-3 py-2 text-left text-[13px] transition-colors hover:bg-white disabled:opacity-50 sm:py-1.5"
                  style={{ borderColor: "var(--rule)", color: "var(--ink)", background: "var(--surface)" }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className="animate-in">
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div
                    className="max-w-[90%] border-l-2 py-1 pl-3 pr-1 text-[14px]"
                    style={{ borderColor: "var(--rule-strong)", color: "var(--ink-muted)" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div
                  className="rounded border px-4 py-4"
                  style={{
                    borderColor: "var(--rule)",
                    background: "var(--surface)",
                    borderLeftWidth: "3px",
                    borderLeftColor: "var(--research)",
                  }}
                >
                  <p
                    className="mb-3 text-[10px] font-medium uppercase tracking-widest"
                    style={{ color: "var(--ink-faint)" }}
                  >
                    Protocol summary
                  </p>
                  <MessageContent
                    content={msg.content}
                    activePage={activePage}
                    onCitationClick={onCitationClick}
                  />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="animate-in px-1">
              <LoadingIndicator />
            </div>
          )}
        </div>

        {error && (
          <div
            className="mt-4 rounded border px-4 py-3 text-sm"
            style={{
              borderColor: "#f5c6c6",
              background: "var(--error-bg)",
              color: "var(--error-text)",
            }}
          >
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {mobileSourcePage !== null && onOpenMobileSource && (
        <button
          type="button"
          onClick={onOpenMobileSource}
          className="flex w-full shrink-0 items-center justify-between border-t px-4 py-2.5 text-left landscape-short:hidden lg:hidden"
          style={{
            borderColor: "var(--rule)",
            background: "var(--citation-soft)",
            color: "var(--research)",
          }}
        >
          <span className="text-[12px] font-medium">View protocol source</span>
          <span className="text-[11px]" style={{ fontFamily: "var(--font-mono)" }}>
            p.{mobileSourcePage}
          </span>
        </button>
      )}
      <form
        onSubmit={handleSubmit}
        className="safe-bottom shrink-0 border-t px-4 py-3 sm:px-5 sm:py-4"
        style={{ borderColor: "var(--rule)", background: "var(--surface)" }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={trial ? "Ask about this protocol…" : "Select a trial first"}
            disabled={!trial || isLoading}
            enterKeyHint="send"
            autoComplete="off"
            className="min-h-11 flex-1 rounded border px-3 py-2.5 text-[16px] outline-none disabled:opacity-50 sm:text-[14px]"
            style={{
              borderColor: "var(--rule)",
              background: "var(--paper)",
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            disabled={!trial || isLoading || !input.trim()}
            className="min-h-11 min-w-[4.5rem] rounded px-4 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-40"
            style={{ background: "var(--research)", color: "#fff" }}
          >
            Ask
          </button>
        </div>
      </form>
    </main>
  );
}
