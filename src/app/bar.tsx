// Horizontal block bar in the ASCII register. Unlike the fixed-character
// `bar()` string helper, this fills whatever width it's given: the filled and
// empty runs flex to the ratio split, and the repeated glyphs are clipped to
// that split — so the bar always spans the full column regardless of font size
// or how wide the app column is.

const RUN = 96; // enough block glyphs to overflow any column width, then clipped

export function Bar({
  ratio,
  className,
}: {
  ratio: number;
  className?: string;
}) {
  const r = Math.min(1, Math.max(0, ratio));

  return (
    <span
      aria-hidden="true"
      className={`flex w-full overflow-hidden font-mono leading-none ${className ?? ""}`}
    >
      <span
        className="overflow-hidden whitespace-nowrap"
        style={{ flexGrow: r, flexBasis: 0 }}
      >
        {"█".repeat(RUN)}
      </span>
      <span
        className="overflow-hidden whitespace-nowrap text-foreground/25"
        style={{ flexGrow: 1 - r, flexBasis: 0 }}
      >
        {"░".repeat(RUN)}
      </span>
    </span>
  );
}
