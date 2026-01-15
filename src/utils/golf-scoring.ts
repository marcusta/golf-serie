/**
 * Golf Score Calculation Utilities
 *
 * Centralized functions for calculating golf scores, holes played,
 * and relative to par calculations. Use these instead of duplicating
 * the logic across services.
 *
 * @see docs/backend/SQL_REFACTORING_STRATEGY.md for context
 */

import { GOLF } from "../constants/golf";

/**
 * Calculate how many holes have been played.
 * A hole is considered "played" if it has a score > 0 or UNREPORTED_HOLE (-1).
 *
 * @param scores - Array of scores (18 elements, one per hole)
 * @returns Number of holes played
 */
export function calculateHolesPlayed(scores: number[]): number {
  return scores.filter((s) => s > 0 || s === GOLF.UNREPORTED_HOLE).length;
}

/**
 * Calculate gross score (sum of all positive scores).
 *
 * @param scores - Array of scores (18 elements, one per hole)
 * @returns Total gross score
 */
export function calculateGrossScore(scores: number[]): number {
  return scores.reduce((sum, s) => sum + (s > 0 ? s : 0), 0);
}

/**
 * Calculate score relative to par for played holes.
 *
 * @param scores - Array of scores (18 elements, one per hole)
 * @param pars - Array of par values (18 elements, one per hole)
 * @returns Score relative to par (positive = over par, negative = under par)
 */
export function calculateRelativeToPar(scores: number[], pars: number[]): number {
  let relativeToPar = 0;
  for (let i = 0; i < scores.length && i < pars.length; i++) {
    if (scores[i] > 0) {
      relativeToPar += scores[i] - pars[i];
    }
  }
  return relativeToPar;
}

/**
 * Check if any hole has an invalid/unreported score (gave up on hole).
 *
 * @param scores - Array of scores (18 elements, one per hole)
 * @returns true if any hole has UNREPORTED_HOLE marker
 */
export function hasInvalidHole(scores: number[]): boolean {
  return scores.includes(GOLF.UNREPORTED_HOLE);
}

/**
 * All score metrics calculated at once for efficiency.
 */
export interface ScoreMetrics {
  holesPlayed: number;
  grossScore: number;
  relativeToPar: number;
  hasInvalidHole: boolean;
}

/**
 * Calculate all score metrics at once.
 * Use this when you need multiple metrics to avoid redundant iterations.
 *
 * @param scores - Array of scores (18 elements, one per hole)
 * @param pars - Array of par values (18 elements, one per hole)
 * @returns Object containing all score metrics
 */
export function calculateScoreMetrics(scores: number[], pars: number[]): ScoreMetrics {
  return {
    holesPlayed: calculateHolesPlayed(scores),
    grossScore: calculateGrossScore(scores),
    relativeToPar: calculateRelativeToPar(scores, pars),
    hasInvalidHole: hasInvalidHole(scores),
  };
}
