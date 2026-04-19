export function calculateStablefordPointsForHole(
  score: number,
  par: number,
  handicapStrokes: number = 0
): number | null {
  if (score === 0) {
    return null;
  }

  if (score === -1) {
    return 0;
  }

  if (score < 0) {
    return null;
  }

  return Math.max(0, 2 + par + handicapStrokes - score);
}
