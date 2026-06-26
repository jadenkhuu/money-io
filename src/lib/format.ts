// Shared formatting for the number / ASCII register. Money and data use mono
// tabular figures; these helpers keep that consistent across screens.

export function amount(n: number): string {
  return Math.abs(n).toLocaleString("en-US");
}

export function signed(n: number): string {
  return `${n < 0 ? "−" : "+"}${amount(n)}`;
}

// Filled/empty block bar. ratio is clamped to 0..1.
export function bar(ratio: number, width = 16): string {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}
