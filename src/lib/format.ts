// Shared formatting for the number / ASCII register. Money and data use mono
// tabular figures; these helpers keep that consistent across screens.

export function amount(n: number): string {
  return Math.abs(n).toLocaleString("en-US");
}

export function signed(n: number): string {
  return `${n < 0 ? "−" : "+"}${amount(n)}`;
}
