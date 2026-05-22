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

// Delta vs. handicap baseline (2 net pts per hole). Negative = better.
export function calculateStablefordDelta(
  netStablefordPoints: number | undefined,
  holesPlayed: number
): number | null {
  if (netStablefordPoints === undefined || holesPlayed <= 0) {
    return null;
  }
  return holesPlayed * 2 - netStablefordPoints;
}
