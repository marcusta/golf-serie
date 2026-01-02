/**
 * Handicap calculation utilities for the frontend
 * These mirror the backend calculations to enable client-side rendering
 */

const HOLES_PER_ROUND = 18;

/**
 * Distribute handicap strokes to holes based on stroke index
 *
 * @param courseHandicap - Calculated course handicap (integer)
 * @param strokeIndex - Array of stroke indices [1-18] (hole difficulty order)
 * @returns Array of strokes per hole (negative for plus handicaps, 0, 1, 2+ for high handicaps)
 *
 * @example
 * // 18 handicap gets 1 stroke per hole
 * distributeHandicapStrokes(18, [5, 13, 1, 9, 17, 3, ...])
 * // Returns [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
 *
 * @example
 * // Plus handicap (-1) gives back stroke on easiest hole (SI 18)
 * distributeHandicapStrokes(-1, [5, 13, 1, 9, 17, 3, 7, 11, 15, 6, 14, 2, 10, 18, 8, 4, 16, 12])
 * // Returns [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0] (hole 14 has SI 18)
 */
export function distributeHandicapStrokes(
  courseHandicap: number,
  strokeIndex: number[]
): number[] {
  if (!strokeIndex || strokeIndex.length === 0) {
    // No stroke index provided, distribute evenly
    const baseStrokes = Math.floor(courseHandicap / HOLES_PER_ROUND);
    const extraStrokes = courseHandicap % HOLES_PER_ROUND;
    return Array(HOLES_PER_ROUND)
      .fill(baseStrokes)
      .map((strokes, i) => (i < extraStrokes ? strokes + 1 : strokes));
  }

  // Validate stroke index has 18 holes
  if (strokeIndex.length !== HOLES_PER_ROUND) {
    console.warn("Invalid stroke index length, expected 18");
    return Array(HOLES_PER_ROUND).fill(0);
  }

  // Initialize strokes per hole
  const strokesPerHole: number[] = Array(HOLES_PER_ROUND).fill(0);

  // Handle negative course handicap (plus players give strokes)
  if (courseHandicap < 0) {
    const absHandicap = Math.abs(courseHandicap);
    // Distribute negative strokes starting from easiest holes (highest stroke index)
    for (let i = 0; i < absHandicap && i < HOLES_PER_ROUND; i++) {
      // Find the hole with stroke index (18 - i), i.e., 18, 17, 16, ...
      const easiestHoleIdx = strokeIndex.indexOf(HOLES_PER_ROUND - i);
      if (easiestHoleIdx !== -1) {
        strokesPerHole[easiestHoleIdx] = -1;
      }
    }
    return strokesPerHole;
  }

  // Distribute positive strokes
  let remainingStrokes = courseHandicap;

  while (remainingStrokes > 0) {
    // How many full rounds of 18 strokes?
    const fullRounds = Math.floor(remainingStrokes / HOLES_PER_ROUND);
    const partialStrokes = remainingStrokes % HOLES_PER_ROUND;

    if (fullRounds > 0) {
      // Give one stroke to all holes for each full round
      for (let i = 0; i < HOLES_PER_ROUND; i++) {
        strokesPerHole[i] += fullRounds;
      }
      remainingStrokes = partialStrokes;
    }

    // Distribute remaining strokes based on stroke index (hardest holes first)
    for (let strokePriority = 1; strokePriority <= partialStrokes; strokePriority++) {
      const holeIdx = strokeIndex.indexOf(strokePriority);
      if (holeIdx !== -1) {
        strokesPerHole[holeIdx] += 1;
      }
    }

    remainingStrokes = 0;
  }

  return strokesPerHole;
}
