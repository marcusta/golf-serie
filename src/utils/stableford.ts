import { GOLF } from "../constants/golf";

export interface StablefordResult {
  pointsPerHole: number[];
  totalPoints: number;
}

/**
 * Calculate stableford points for a single hole.
 *
 * Standard stableford awards:
 * - Net double bogey or worse: 0
 * - Net bogey: 1
 * - Net par: 2
 * - Net birdie: 3
 * - Net eagle: 4
 */
export function calculateStablefordPointsForHole(
  score: number,
  par: number,
  handicapStrokes: number = 0
): number | undefined {
  if (score === 0) {
    return undefined;
  }

  if (score === GOLF.UNREPORTED_HOLE) {
    return 0;
  }

  if (score < 0) {
    return undefined;
  }

  return Math.max(0, 2 + par + handicapStrokes - score);
}

export function calculateStablefordPoints(
  scores: number[],
  pars: number[],
  handicapStrokesPerHole?: number[]
): StablefordResult {
  const pointsPerHole = scores.map((score, index) => {
    const par = pars[index] || 0;
    const handicapStrokes = handicapStrokesPerHole?.[index] || 0;
    return calculateStablefordPointsForHole(score, par, handicapStrokes) ?? 0;
  });

  const totalPoints = pointsPerHole.reduce((sum, points) => sum + points, 0);

  return {
    pointsPerHole,
    totalPoints,
  };
}
