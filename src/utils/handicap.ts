/**
 * Handicap calculation utilities following the World Handicap System (WHS)
 *
 * Key formulas:
 * - Course Handicap = (Handicap Index × Slope Rating / 113) + (Course Rating - Par)
 * - Net Score = Gross Score - Course Handicap (for total)
 * - Per-hole: Net = Gross - Handicap Strokes for that hole
 */

/**
 * Calculate Course Handicap using WHS formula
 *
 * @param handicapIndex - Player's Handicap Index (e.g., 15.4)
 * @param slopeRating - Course's Slope Rating (55-155, standard is 113)
 * @param courseRating - Course's Course Rating (e.g., 72.3)
 * @param par - Course's par (e.g., 72)
 * @returns Course Handicap rounded to nearest integer
 *
 * @example
 * calculateCourseHandicap(15.4, 128, 72.3, 72)
 * // Returns 18 (15.4 × 128 / 113 + 0.3 = 17.7 → 18)
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  if (handicapIndex < 0) {
    // Plus handicap (better than scratch)
    const courseHandicap = (handicapIndex * slopeRating) / 113 + (courseRating - par);
    return Math.round(courseHandicap);
  }

  const courseHandicap = (handicapIndex * slopeRating) / 113 + (courseRating - par);
  return Math.round(courseHandicap);
}

/**
 * Distribute handicap strokes to holes based on stroke index
 *
 * @param courseHandicap - Calculated course handicap (integer)
 * @param strokeIndex - Array of stroke indices [1-18] (hole difficulty order)
 * @returns Array of strokes per hole (0, 1, 2, or more for high handicaps)
 *
 * @example
 * distributeHandicapStrokes(18, [5, 13, 1, 9, 17, 3, ...])
 * // Returns [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
 *
 * @example
 * distributeHandicapStrokes(23, [5, 13, 1, 9, 17, 3, ...])
 * // Returns [2, 1, 2, 1, 1, 2, ...] (5 holes with stroke index 1-5 get extra stroke)
 */
export function distributeHandicapStrokes(
  courseHandicap: number,
  strokeIndex: number[]
): number[] {
  if (!strokeIndex || strokeIndex.length === 0) {
    // No stroke index provided, distribute evenly
    const baseStrokes = Math.floor(courseHandicap / 18);
    const extraStrokes = courseHandicap % 18;
    return Array(18)
      .fill(baseStrokes)
      .map((strokes, i) => (i < extraStrokes ? strokes + 1 : strokes));
  }

  // Validate stroke index has 18 holes
  if (strokeIndex.length !== 18) {
    throw new Error("Stroke index must have exactly 18 values");
  }

  // Initialize strokes per hole
  const strokesPerHole: number[] = Array(18).fill(0);

  // Handle negative course handicap (plus players give strokes)
  if (courseHandicap < 0) {
    const absHandicap = Math.abs(courseHandicap);
    // Distribute negative strokes starting from easiest holes (highest stroke index)
    for (let i = 0; i < absHandicap && i < 18; i++) {
      // Find the hole with the highest remaining stroke index
      const easiestHoleIdx = strokeIndex.indexOf(18 - i);
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
    const fullRounds = Math.floor(remainingStrokes / 18);
    const partialStrokes = remainingStrokes % 18;

    if (fullRounds > 0) {
      // Give one stroke to all holes for each full round
      for (let i = 0; i < 18; i++) {
        strokesPerHole[i] += fullRounds;
      }
      remainingStrokes = partialStrokes;
    }

    // Distribute remaining strokes based on stroke index
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

/**
 * Calculate net scores per hole
 *
 * @param grossScores - Array of gross scores (18 holes)
 * @param handicapStrokes - Array of handicap strokes per hole (from distributeHandicapStrokes)
 * @returns Array of net scores per hole
 *
 * @example
 * calculateNetScores([5, 4, 6, 4, 5, ...], [1, 0, 1, 0, 0, ...])
 * // Returns [4, 4, 5, 4, 5, ...]
 */
export function calculateNetScores(
  grossScores: number[],
  handicapStrokes: number[]
): number[] {
  if (grossScores.length !== handicapStrokes.length) {
    throw new Error("Gross scores and handicap strokes must have same length");
  }

  return grossScores.map((gross, i) => {
    // Skip invalid scores (0 or -1)
    if (gross <= 0) return gross;
    return gross - handicapStrokes[i];
  });
}

/**
 * Calculate net total from gross total
 *
 * @param grossTotal - Total gross score
 * @param courseHandicap - Calculated course handicap
 * @returns Net total score
 *
 * @example
 * calculateNetTotal(90, 18)
 * // Returns 72
 */
export function calculateNetTotal(grossTotal: number, courseHandicap: number): number {
  return grossTotal - courseHandicap;
}

/**
 * Calculate full handicap details for a player in a competition
 *
 * @param handicapIndex - Player's handicap index
 * @param courseRating - Course rating
 * @param slopeRating - Slope rating
 * @param par - Course par
 * @param strokeIndex - Stroke index array
 * @param grossScores - Optional: gross scores for calculating net
 * @returns Full handicap calculation details
 */
export interface FullHandicapCalculation {
  handicapIndex: number;
  courseHandicap: number;
  strokesPerHole: number[];
  grossScores?: number[];
  netScores?: number[];
  grossTotal?: number;
  netTotal?: number;
}

export function calculateFullHandicap(
  handicapIndex: number,
  courseRating: number,
  slopeRating: number,
  par: number,
  strokeIndex: number[],
  grossScores?: number[]
): FullHandicapCalculation {
  const courseHandicap = calculateCourseHandicap(
    handicapIndex,
    slopeRating,
    courseRating,
    par
  );

  const strokesPerHole = distributeHandicapStrokes(courseHandicap, strokeIndex);

  const result: FullHandicapCalculation = {
    handicapIndex,
    courseHandicap,
    strokesPerHole,
  };

  if (grossScores && grossScores.length === 18) {
    result.grossScores = grossScores;
    result.netScores = calculateNetScores(grossScores, strokesPerHole);
    result.grossTotal = grossScores
      .filter((s) => s > 0)
      .reduce((sum, s) => sum + s, 0);
    result.netTotal = result.grossTotal - courseHandicap;
  }

  return result;
}

/**
 * Get default stroke index for 18 holes
 * Uses a common pattern where front 9 odd numbers are harder
 */
export function getDefaultStrokeIndex(): number[] {
  // Common pattern: hardest to easiest holes
  // Par 4s and Par 5s typically have lower stroke index (harder)
  // Par 3s typically have higher stroke index (easier)
  return [7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14];
}

/**
 * Validate a stroke index array
 * Must contain each number from 1-18 exactly once
 */
export function validateStrokeIndex(strokeIndex: number[]): boolean {
  if (!strokeIndex || strokeIndex.length !== 18) {
    return false;
  }

  const sorted = [...strokeIndex].sort((a, b) => a - b);
  for (let i = 0; i < 18; i++) {
    if (sorted[i] !== i + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Format course handicap for display
 * Positive handicaps are displayed as-is
 * Plus handicaps are displayed with + prefix
 */
export function formatCourseHandicap(courseHandicap: number): string {
  if (courseHandicap > 0) {
    return courseHandicap.toString();
  } else if (courseHandicap < 0) {
    return `+${Math.abs(courseHandicap)}`;
  }
  return "0";
}

/**
 * Format handicap index for display
 * Always shows one decimal place
 */
export function formatHandicapIndex(handicapIndex: number): string {
  if (handicapIndex < 0) {
    return `+${Math.abs(handicapIndex).toFixed(1)}`;
  }
  return handicapIndex.toFixed(1);
}
