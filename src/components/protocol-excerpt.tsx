function ExcerptLine({ line }: { line: string }) {
  if (line.startsWith("• ")) {
    return (
      <div className="flex gap-2.5 pl-0.5">
        <span className="shrink-0" style={{ color: "var(--research)" }}>
          •
        </span>
        <span>{line.slice(2)}</span>
      </div>
    );
  }

  if (/^\d+(?:\.\d+)+\s/.test(line)) {
    return (
      <p className="mt-3 font-medium first:mt-0" style={{ color: "var(--ink)" }}>
        {line}
      </p>
    );
  }

  if (!line.trim()) return null;

  return <p>{line}</p>;
}

export function ProtocolExcerpt({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-2 text-[13px] leading-relaxed" style={{ color: "var(--ink-muted)" }}>
      {lines.map((line, i) => (
        <ExcerptLine key={i} line={line} />
      ))}
    </div>
  );
}
