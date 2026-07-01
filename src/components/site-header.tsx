export function SiteHeader() {
  return (
    <header
      className="safe-top flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3"
      style={{ borderColor: "var(--rule)", background: "var(--surface)", minHeight: "var(--header-height)" }}
    >
      <div className="min-w-0">
        <h1
          className="text-lg font-semibold tracking-tight sm:text-xl"
          style={{ fontFamily: "var(--font-display)", color: "var(--research)" }}
        >
          Research Trials Ask
        </h1>
        <p className="text-[11px] sm:text-xs" style={{ color: "var(--ink-muted)" }}>
          Clinical trial protocol lookup
        </p>
      </div>
      <p
        className="hidden max-w-xs text-right text-[11px] leading-snug md:block"
        style={{ color: "var(--demo-text)" }}
      >
        <span
          className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
          style={{ background: "var(--demo-bg)", color: "var(--demo-text)" }}
        >
          Demo
        </span>
        Not for clinical use. For demonstration purposes only.
      </p>
      <span
        className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide md:hidden"
        style={{ background: "var(--demo-bg)", color: "var(--demo-text)" }}
        title="Not for clinical use. For demonstration purposes only."
      >
        Demo only
      </span>
    </header>
  );
}
