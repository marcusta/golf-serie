/**
 * Format a number with one decimal and a leading "+" when positive.
 * Used for doped handicap values: 5.2 -> "+5.2", -1.4 -> "-1.4", 0 -> "0.0".
 */
export function formatSignedDecimal(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
}
