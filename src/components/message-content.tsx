"use client";

interface MessageContentProps {
  content: string;
  activePage: number | null;
  onCitationClick: (page: number) => void;
}

function renderWithCitations(
  text: string,
  activePage: number | null,
  onCitationClick: (page: number) => void,
): React.ReactNode[] {
  const parts = text.split(/(\[p\.\d+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^\[p\.(\d+)\]$/);
    if (match) {
      const page = parseInt(match[1], 10);
      const isActive = activePage === page;
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCitationClick(page)}
          className="mx-0.5 inline-flex min-h-[1.75rem] min-w-[1.75rem] items-center justify-center align-super px-1 text-[11px] font-medium underline-offset-2 transition-colors hover:underline sm:min-h-0 sm:min-w-0 sm:text-[10px]"
          style={{
            fontFamily: "var(--font-mono)",
            color: isActive ? "var(--research)" : "var(--citation)",
            background: isActive ? "var(--citation-soft)" : "transparent",
            textDecoration: isActive ? "underline" : "none",
          }}
          title={`View page ${page} in protocol source`}
        >
          p.{page}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageContent({
  content,
  activePage,
  onCitationClick,
}: MessageContentProps) {
  const lines = content.split("\n");

  return (
    <div className="text-[14px] leading-relaxed" style={{ color: "var(--ink)" }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2 py-0.5 pl-1">
              <span style={{ color: "var(--ink-faint)" }} aria-hidden>
                —
              </span>
              <span className="flex-1">
                {renderWithCitations(line.slice(2), activePage, onCitationClick)}
              </span>
            </div>
          );
        }

        if (trimmed === "") return <div key={i} className="h-2" />;

        const isHeading =
          /^#{1,3}\s/.test(trimmed) ||
          /^(inclusion|exclusion|primary|secondary)\s/i.test(trimmed);

        if (isHeading) {
          const text = trimmed.replace(/^#{1,3}\s/, "");
          return (
            <p
              key={i}
              className="mb-1 mt-3 text-[11px] font-semibold uppercase tracking-widest first:mt-0"
              style={{ color: "var(--ink-muted)" }}
            >
              {text}
            </p>
          );
        }

        return (
          <p key={i} className="py-0.5">
            {renderWithCitations(line, activePage, onCitationClick)}
          </p>
        );
      })}
    </div>
  );
}
