import { describe, expect, test } from "bun:test";
import {
  calculateCourseHandicap,
  distributeHandicapStrokes,
  calculateNetScores,
  calculateNetTotal,
  calculateFullHandicap,
  getDefaultStrokeIndex,
  validateStrokeIndex,
  formatCourseHandicap,
  formatHandicapIndex,
} from "../src/utils/handicap";

describe("Handicap Calculations", () => {
  describe("calculateCourseHandicap", () => {
    test("calculates correctly for standard course", () => {
      // Handicap Index: 15.4, Slope: 113 (standard), CR: 72.0, Par: 72
      const result = calculateCourseHandicap(15.4, 113, 72.0, 72);
      expect(result).toBe(15); // 15.4 × 113/113 + 0 = 15.4 → 15
    });

    test("calculates correctly with slope adjustment", () => {
      // Handicap Index: 15.4, Slope: 128 (harder), CR: 72.3, Par: 72
      // Formula: (15.4 × 128 / 113) + (72.3 - 72) = 17.44 + 0.3 = 17.74 → 18
      const result = calculateCourseHandicap(15.4, 128, 72.3, 72);
      expect(result).toBe(18);
    });

    test("calculates correctly for easier course", () => {
      // Handicap Index: 15.4, Slope: 100 (easier), CR: 70.0, Par: 72
      // Formula: (15.4 × 100 / 113) + (70.0 - 72) = 13.63 - 2 = 11.63 → 12
      const result = calculateCourseHandicap(15.4, 100, 70.0, 72);
      expect(result).toBe(12);
    });

    test("handles plus handicap (better than scratch)", () => {
      // Handicap Index: -2.0 (plus 2), Slope: 130, CR: 73.0, Par: 72
      // Formula: (-2.0 × 130 / 113) + (73.0 - 72) = -2.30 + 1 = -1.30 → -1
      const result = calculateCourseHandicap(-2.0, 130, 73.0, 72);
      expect(result).toBe(-1);
    });

    test("handles scratch golfer", () => {
      const result = calculateCourseHandicap(0, 113, 72.0, 72);
      expect(result).toBe(0);
    });

    test("handles high handicap", () => {
      // Handicap Index: 36.0, Slope: 120, CR: 72.0, Par: 72
      // Formula: (36.0 × 120 / 113) + 0 = 38.23 → 38
      const result = calculateCourseHandicap(36.0, 120, 72.0, 72);
      expect(result).toBe(38);
    });
  });

  describe("distributeHandicapStrokes", () => {
    // Standard stroke index for testing
    const strokeIndex = [1, 11, 5, 15, 3, 13, 7, 17, 9, 2, 12, 6, 16, 4, 14, 8, 18, 10];

    test("distributes 18 strokes evenly", () => {
      const result = distributeHandicapStrokes(18, strokeIndex);
      expect(result).toHaveLength(18);
      expect(result.every((s) => s === 1)).toBe(true);
      expect(result.reduce((sum, s) => sum + s, 0)).toBe(18);
    });

    test("distributes strokes to hardest holes first", () => {
      const result = distributeHandicapStrokes(5, strokeIndex);
      expect(result).toHaveLength(18);

      // Holes with stroke index 1-5 should get 1 stroke
      // Hole 0 has SI 1, hole 4 has SI 3, etc.
      expect(result[0]).toBe(1); // SI 1
      expect(result[9]).toBe(1); // SI 2
      expect(result[4]).toBe(1); // SI 3
      expect(result[13]).toBe(1); // SI 4
      expect(result[2]).toBe(1); // SI 5

      // Total strokes should be 5
      expect(result.reduce((sum, s) => sum + s, 0)).toBe(5);
    });

    test("distributes high handicap with multiple strokes per hole", () => {
      const result = distributeHandicapStrokes(23, strokeIndex);
      expect(result).toHaveLength(18);

      // 23 = 18 + 5, so all holes get 1 stroke, plus 5 hardest holes get extra
      expect(result.reduce((sum, s) => sum + s, 0)).toBe(23);

      // Holes with SI 1-5 should get 2 strokes
      expect(result[0]).toBe(2); // SI 1
      expect(result[9]).toBe(2); // SI 2
      expect(result[4]).toBe(2); // SI 3
      expect(result[13]).toBe(2); // SI 4
      expect(result[2]).toBe(2); // SI 5

      // Other holes should get 1 stroke
      expect(result[3]).toBe(1); // SI 15
    });

    test("handles zero handicap", () => {
      const result = distributeHandicapStrokes(0, strokeIndex);
      expect(result).toHaveLength(18);
      expect(result.every((s) => s === 0)).toBe(true);
    });

    test("handles 36+ handicap", () => {
      const result = distributeHandicapStrokes(36, strokeIndex);
      expect(result).toHaveLength(18);
      expect(result.every((s) => s === 2)).toBe(true);
      expect(result.reduce((sum, s) => sum + s, 0)).toBe(36);
    });

    test("distributes evenly when no stroke index provided", () => {
      const result = distributeHandicapStrokes(10, []);
      expect(result).toHaveLength(18);
      // 10 / 18 = 0 base, 10 extra strokes to first 10 holes
      expect(result.reduce((sum, s) => sum + s, 0)).toBe(10);
    });

    test("handles negative course handicap (plus player)", () => {
      const result = distributeHandicapStrokes(-3, strokeIndex);
      expect(result).toHaveLength(18);
      // Should have -1 on the 3 easiest holes (highest stroke index)
      const negativeCount = result.filter((s) => s === -1).length;
      expect(negativeCount).toBe(3);
      expect(result.reduce((sum, s) => sum + s, 0)).toBe(-3);
    });
  });

  describe("calculateNetScores", () => {
    test("calculates net scores correctly", () => {
      const grossScores = [5, 4, 6, 4, 5, 3, 4, 5, 4, 5, 4, 6, 3, 5, 4, 4, 5, 5];
      const handicapStrokes = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1];

      const result = calculateNetScores(grossScores, handicapStrokes);

      expect(result).toHaveLength(18);
      expect(result[0]).toBe(4); // 5 - 1
      expect(result[1]).toBe(4); // 4 - 0
      expect(result[2]).toBe(5); // 6 - 1
    });

    test("preserves invalid scores (0 and -1)", () => {
      const grossScores = [5, 0, -1, 4, 5, 3, 4, 5, 4, 5, 4, 6, 3, 5, 4, 4, 5, 5];
      const handicapStrokes = [1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1];

      const result = calculateNetScores(grossScores, handicapStrokes);

      expect(result[0]).toBe(4); // 5 - 1
      expect(result[1]).toBe(0); // Preserved
      expect(result[2]).toBe(-1); // Preserved
    });

    test("throws error on mismatched array lengths", () => {
      const grossScores = [5, 4, 6];
      const handicapStrokes = [1, 0];

      expect(() => calculateNetScores(grossScores, handicapStrokes)).toThrow();
    });
  });

  describe("calculateNetTotal", () => {
    test("calculates net total correctly", () => {
      expect(calculateNetTotal(90, 18)).toBe(72);
      expect(calculateNetTotal(85, 15)).toBe(70);
      expect(calculateNetTotal(72, 0)).toBe(72);
    });

    test("handles plus handicap", () => {
      expect(calculateNetTotal(70, -2)).toBe(72);
    });
  });

  describe("calculateFullHandicap", () => {
    test("calculates full handicap details without scores", () => {
      const strokeIndex = getDefaultStrokeIndex();
      const result = calculateFullHandicap(15.4, 72.3, 128, 72, strokeIndex);

      expect(result.handicapIndex).toBe(15.4);
      expect(result.courseHandicap).toBe(18);
      expect(result.strokesPerHole).toHaveLength(18);
      expect(result.strokesPerHole.reduce((sum, s) => sum + s, 0)).toBe(18);
      expect(result.grossScores).toBeUndefined();
      expect(result.netScores).toBeUndefined();
    });

    test("calculates full handicap details with scores", () => {
      const strokeIndex = getDefaultStrokeIndex();
      const grossScores = [5, 4, 6, 4, 5, 3, 4, 5, 4, 5, 4, 6, 3, 5, 4, 4, 5, 5];

      const result = calculateFullHandicap(15.4, 72.3, 128, 72, strokeIndex, grossScores);

      expect(result.handicapIndex).toBe(15.4);
      expect(result.courseHandicap).toBe(18);
      expect(result.grossScores).toEqual(grossScores);
      expect(result.netScores).toHaveLength(18);
      expect(result.grossTotal).toBe(81);
      expect(result.netTotal).toBe(63);
    });
  });

  describe("getDefaultStrokeIndex", () => {
    test("returns valid 18-hole stroke index", () => {
      const result = getDefaultStrokeIndex();
      expect(result).toHaveLength(18);
      expect(validateStrokeIndex(result)).toBe(true);
    });
  });

  describe("validateStrokeIndex", () => {
    test("validates correct stroke index", () => {
      const validIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      expect(validateStrokeIndex(validIndex)).toBe(true);
    });

    test("validates shuffled but valid stroke index", () => {
      const validIndex = [7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14];
      expect(validateStrokeIndex(validIndex)).toBe(true);
    });

    test("rejects stroke index with wrong length", () => {
      const invalidIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      expect(validateStrokeIndex(invalidIndex)).toBe(false);
    });

    test("rejects stroke index with missing values", () => {
      const invalidIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 17];
      expect(validateStrokeIndex(invalidIndex)).toBe(false);
    });

    test("rejects stroke index with out of range values", () => {
      const invalidIndex = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19];
      expect(validateStrokeIndex(invalidIndex)).toBe(false);
    });

    test("rejects null/undefined stroke index", () => {
      expect(validateStrokeIndex(null as unknown as number[])).toBe(false);
      expect(validateStrokeIndex(undefined as unknown as number[])).toBe(false);
    });
  });

  describe("formatCourseHandicap", () => {
    test("formats positive handicap", () => {
      expect(formatCourseHandicap(18)).toBe("18");
      expect(formatCourseHandicap(5)).toBe("5");
    });

    test("formats plus handicap with + prefix", () => {
      expect(formatCourseHandicap(-2)).toBe("+2");
      expect(formatCourseHandicap(-5)).toBe("+5");
    });

    test("formats scratch handicap", () => {
      expect(formatCourseHandicap(0)).toBe("0");
    });
  });

  describe("formatHandicapIndex", () => {
    test("formats positive handicap index with one decimal", () => {
      expect(formatHandicapIndex(15.4)).toBe("15.4");
      expect(formatHandicapIndex(15)).toBe("15.0");
      expect(formatHandicapIndex(0.7)).toBe("0.7");
    });

    test("formats plus handicap with + prefix", () => {
      expect(formatHandicapIndex(-2.3)).toBe("+2.3");
      expect(formatHandicapIndex(-5)).toBe("+5.0");
    });

    test("formats scratch handicap", () => {
      expect(formatHandicapIndex(0)).toBe("0.0");
    });
  });

  describe("Real-world scenarios", () => {
    test("Swedish handicap example", () => {
      // Player with HCP Index 15.4 playing a course with:
      // Par 72, CR 72.3, SR 128
      const courseHandicap = calculateCourseHandicap(15.4, 128, 72.3, 72);
      expect(courseHandicap).toBe(18);

      // Playing from Men's Yellow tees
      const strokeIndex = [5, 13, 1, 9, 17, 3, 15, 7, 11, 6, 14, 2, 10, 18, 4, 16, 8, 12];
      const strokesPerHole = distributeHandicapStrokes(courseHandicap, strokeIndex);

      // With 18 strokes, each hole gets 1 stroke
      expect(strokesPerHole.reduce((sum, s) => sum + s, 0)).toBe(18);
      expect(strokesPerHole.every((s) => s === 1)).toBe(true);

      // Player scores 90 (18 over par)
      // Net score = 90 - 18 = 72 (par)
      expect(calculateNetTotal(90, courseHandicap)).toBe(72);
    });

    test("Low handicap player on difficult course", () => {
      // Player with HCP Index 5.0 on Championship tees
      // Par 72, CR 74.2, SR 138
      const courseHandicap = calculateCourseHandicap(5.0, 138, 74.2, 72);
      // (5.0 × 138 / 113) + 2.2 = 6.1 + 2.2 = 8.3 → 8
      expect(courseHandicap).toBe(8);
    });

    test("High handicap beginner", () => {
      // Player with HCP Index 28.0 on Ladies tees
      // Par 72, CR 71.8, SR 125
      const courseHandicap = calculateCourseHandicap(28.0, 125, 71.8, 72);
      // (28.0 × 125 / 113) + (-0.2) = 30.97 - 0.2 = 30.77 → 31
      expect(courseHandicap).toBe(31);

      const strokeIndex = getDefaultStrokeIndex();
      const strokesPerHole = distributeHandicapStrokes(courseHandicap, strokeIndex);

      // 31 = 18 + 13, so 13 hardest holes get 2 strokes
      const twoStrokeHoles = strokesPerHole.filter((s) => s === 2).length;
      const oneStrokeHoles = strokesPerHole.filter((s) => s === 1).length;

      expect(twoStrokeHoles).toBe(13);
      expect(oneStrokeHoles).toBe(5);
      expect(strokesPerHole.reduce((sum, s) => sum + s, 0)).toBe(31);
    });
  });
});
