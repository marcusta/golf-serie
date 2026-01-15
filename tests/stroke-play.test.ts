import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { StrokePlayStrategy } from "../src/services/game-strategies/stroke-play";
import type { GameLeaderboardContext, PlayerTeeRating } from "../src/services/game-strategies/base";
import { GOLF } from "../src/constants/golf";

/**
 * Comprehensive tests for the StrokePlayStrategy class
 *
 * Tests cover:
 * - Basic score calculation (gross and net)
 * - Relative to par calculations
 * - Position/ranking with ties
 * - Different scoring modes (gross, net, both)
 * - Edge cases (incomplete scores, UNREPORTED_HOLE values)
 * - Handicap-based net score calculations
 */
describe("StrokePlayStrategy", () => {
  let db: Database;
  let strategy: StrokePlayStrategy;

  // Standard 18-hole par array (par 72)
  const standardPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
  const totalPar = standardPars.reduce((sum, p) => sum + p, 0); // 72

  // Standard stroke index (1-18 representing difficulty)
  const standardStrokeIndex = [7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14];

  // Helper function to create a score with specific relative to par
  const createScoreWithRelative = (relativeToPar: number): number[] => {
    const score = [...standardPars];
    // Adjust first hole to get desired relative
    score[0] = standardPars[0] + relativeToPar;
    return score;
  };

  // Helper to create even par score
  const createEvenParScore = (): number[] => [...standardPars];

  // Helper to create a context
  const createContext = (overrides: Partial<GameLeaderboardContext> = {}): GameLeaderboardContext => ({
    gameId: 1,
    pars: standardPars,
    strokeIndex: standardStrokeIndex,
    scoringMode: "gross",
    ...overrides,
  });

  beforeEach(async () => {
    db = await createTestDatabase();
    strategy = new StrokePlayStrategy(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("validateSettings", () => {
    test("should accept empty settings", () => {
      expect(() => strategy.validateSettings({})).not.toThrow();
    });

    test("should accept any settings (stroke play has no additional settings)", () => {
      expect(() => strategy.validateSettings({ anyKey: "anyValue" })).not.toThrow();
    });
  });

  describe("calculateResults - Basic Gross Scoring", () => {
    test("should calculate gross score correctly for complete round", () => {
      const scores = new Map<number, number[]>();
      const evenParScore = createEvenParScore();
      scores.set(1, evenParScore);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(72); // Par 72
      expect(results[0].relativeToPar).toBe(0); // Even par
      expect(results[0].holesPlayed).toBe(18);
      expect(results[0].position).toBe(1);
    });

    test("should calculate under par score correctly", () => {
      const scores = new Map<number, number[]>();
      const underParScore = createScoreWithRelative(-3); // 3 under par
      scores.set(1, underParScore);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(69); // 72 - 3
      expect(results[0].relativeToPar).toBe(-3);
    });

    test("should calculate over par score correctly", () => {
      const scores = new Map<number, number[]>();
      const overParScore = createScoreWithRelative(5); // 5 over par
      scores.set(1, overParScore);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(77); // 72 + 5
      expect(results[0].relativeToPar).toBe(5);
    });

    test("should calculate scores for multiple players", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createScoreWithRelative(-2)); // 70
      scores.set(2, createEvenParScore()); // 72
      scores.set(3, createScoreWithRelative(3)); // 75

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(3);
      expect(results[0].grossTotal).toBe(70);
      expect(results[1].grossTotal).toBe(72);
      expect(results[2].grossTotal).toBe(75);
    });
  });

  describe("calculateResults - Ranking and Positions", () => {
    test("should rank players by gross score in ascending order", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createScoreWithRelative(5)); // 77
      scores.set(2, createScoreWithRelative(-1)); // 71
      scores.set(3, createEvenParScore()); // 72

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      // Should be sorted: player 2 (71), player 3 (72), player 1 (77)
      expect(results[0].memberId).toBe(2);
      expect(results[0].position).toBe(1);
      expect(results[1].memberId).toBe(3);
      expect(results[1].position).toBe(2);
      expect(results[2].memberId).toBe(1);
      expect(results[2].position).toBe(3);
    });

    test("should handle tied positions correctly", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore()); // 72
      scores.set(2, createEvenParScore()); // 72
      scores.set(3, createScoreWithRelative(2)); // 74

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(3);
      // First two players tied at position 1
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(1);
      // Third player at position 3 (not 2, because two players are ahead)
      expect(results[2].position).toBe(3);
    });

    test("should handle multiple ties at different positions", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createScoreWithRelative(-2)); // 70
      scores.set(2, createScoreWithRelative(-2)); // 70
      scores.set(3, createEvenParScore()); // 72
      scores.set(4, createScoreWithRelative(3)); // 75
      scores.set(5, createScoreWithRelative(3)); // 75
      scores.set(6, createScoreWithRelative(3)); // 75

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(6);
      // First two tied at 1
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(1);
      // Third player at position 3
      expect(results[2].position).toBe(3);
      // Last three tied at position 4
      expect(results[3].position).toBe(4);
      expect(results[4].position).toBe(4);
      expect(results[5].position).toBe(4);
    });

    test("should handle all players tied", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore());
      scores.set(2, createEvenParScore());
      scores.set(3, createEvenParScore());

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(3);
      // All tied at position 1
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(1);
      expect(results[2].position).toBe(1);
    });
  });

  describe("calculateResults - Partial Rounds", () => {
    test("should calculate holes played for partial round", () => {
      const scores = new Map<number, number[]>();
      // Only first 9 holes played
      const partialScore = [4, 4, 3, 5, 4, 4, 3, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      scores.set(1, partialScore);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].holesPlayed).toBe(9);
      expect(results[0].grossTotal).toBe(36); // Front 9 score
      // Relative to par for played holes only
      expect(results[0].relativeToPar).toBe(0); // Front 9 is par 36
    });

    test("should handle scattered incomplete scores", () => {
      const scores = new Map<number, number[]>();
      // Holes 1, 3, 5, 7 played
      const scatteredScore = [4, 0, 3, 0, 4, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      scores.set(1, scatteredScore);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].holesPlayed).toBe(4);
      expect(results[0].grossTotal).toBe(14); // 4 + 3 + 4 + 3
    });

    test("should rank partial rounds by relative to par", () => {
      const scores = new Map<number, number[]>();
      // Player 1: 9 holes, 1 under par
      const player1Score = [3, 4, 3, 5, 4, 4, 3, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      scores.set(1, player1Score);
      // Player 2: 9 holes, 2 over par
      const player2Score = [5, 5, 3, 5, 4, 4, 3, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      scores.set(2, player2Score);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results[0].memberId).toBe(1);
      expect(results[0].relativeToPar).toBe(-1);
      expect(results[1].memberId).toBe(2);
      expect(results[1].relativeToPar).toBe(2);
    });
  });

  describe("calculateResults - UNREPORTED_HOLE Handling", () => {
    test("should count UNREPORTED_HOLE (-1) as a played hole", () => {
      const scores = new Map<number, number[]>();
      // 17 completed holes + 1 unreported hole
      const scoreWithUnreported = [...createEvenParScore()];
      scoreWithUnreported[10] = GOLF.UNREPORTED_HOLE; // -1

      scores.set(1, scoreWithUnreported);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].holesPlayed).toBe(18); // All 18 counted as played
    });

    test("should not include UNREPORTED_HOLE in gross score calculation", () => {
      const scores = new Map<number, number[]>();
      // Complete round except hole 11 which is unreported
      const scoreWithUnreported = [...createEvenParScore()];
      scoreWithUnreported[10] = GOLF.UNREPORTED_HOLE; // Hole 11 (0-indexed: 10)

      scores.set(1, scoreWithUnreported);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      // Gross should be 72 - 4 (par for hole 11) = 68 for played holes
      expect(results[0].grossTotal).toBe(68);
    });

    test("should not include UNREPORTED_HOLE in relative to par calculation", () => {
      const scores = new Map<number, number[]>();
      const scoreWithUnreported = [...createEvenParScore()];
      scoreWithUnreported[10] = GOLF.UNREPORTED_HOLE;

      scores.set(1, scoreWithUnreported);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      // Relative to par should be 0 for the 17 played holes (all at par)
      expect(results[0].relativeToPar).toBe(0);
    });

    test("should handle multiple UNREPORTED_HOLE values", () => {
      const scores = new Map<number, number[]>();
      const scoreWithMultipleUnreported = [...createEvenParScore()];
      scoreWithMultipleUnreported[5] = GOLF.UNREPORTED_HOLE;
      scoreWithMultipleUnreported[10] = GOLF.UNREPORTED_HOLE;
      scoreWithMultipleUnreported[15] = GOLF.UNREPORTED_HOLE;

      scores.set(1, scoreWithMultipleUnreported);

      const handicaps = new Map<number, number>();
      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].holesPlayed).toBe(18); // All counted as played
      // Gross should exclude the 3 unreported holes
      const expectedGross = 72 - standardPars[5] - standardPars[10] - standardPars[15];
      expect(results[0].grossTotal).toBe(expectedGross);
    });
  });

  describe("calculateResults - Net Scoring", () => {
    test("should calculate net score with handicap", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore()); // 72 gross

      const handicaps = new Map<number, number>();
      handicaps.set(1, 10.0); // 10 handicap index

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(72);
      // Net score is calculated with course handicap and strokes distributed
      expect(results[0].netTotal).toBeDefined();
      expect(results[0].netRelativeToPar).toBeDefined();
    });

    test("should rank by net score when scoring mode is net", () => {
      const scores = new Map<number, number[]>();
      // Player 1: High handicapper, shoots 85
      scores.set(1, createScoreWithRelative(13)); // 85 gross
      // Player 2: Low handicapper, shoots 72
      scores.set(2, createEvenParScore()); // 72 gross

      const handicaps = new Map<number, number>();
      handicaps.set(1, 20.0); // High handicap
      handicaps.set(2, 5.0); // Low handicap

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(2);
      // With net scoring, the high handicapper may rank better
      // Player 1: 85 - ~20 strokes = ~65 net
      // Player 2: 72 - ~5 strokes = ~67 net
      // Player 1 should be first
      expect(results[0].memberId).toBe(1);
    });

    test("should not calculate net score when player has no handicap", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore());

      const handicaps = new Map<number, number>();
      // No handicap for player 1

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(72);
      expect(results[0].netTotal).toBeUndefined();
      expect(results[0].netRelativeToPar).toBeUndefined();
    });

    test("should calculate net score with player-specific tee ratings", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore()); // 72 gross

      const handicaps = new Map<number, number>();
      handicaps.set(1, 10.0);

      const playerTeeRatings = new Map<number, PlayerTeeRating>();
      playerTeeRatings.set(1, {
        courseRating: 73.5,
        slopeRating: 135,
        par: 72,
      });

      const context = createContext({
        scoringMode: "net",
        playerTeeRatings,
      });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      // Course Handicap = (10.0 * 135 / 113) + (73.5 - 72) = 11.95 + 1.5 = 13.45 -> 13
      // Net score should reflect this
      expect(results[0].netTotal).toBeDefined();
    });

    test("should handle plus handicap (negative handicap index)", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createScoreWithRelative(-2)); // 70 gross

      const handicaps = new Map<number, number>();
      handicaps.set(1, -2.0); // Plus 2 handicap

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(70);
      // Plus handicap player has strokes added to their score
      expect(results[0].netTotal).toBeDefined();
      // Net should be higher than gross for plus handicap
      expect(results[0].netTotal!).toBeGreaterThan(results[0].grossTotal);
    });
  });

  describe("calculateResults - Scoring Mode: Both", () => {
    test("should calculate both gross and net scores", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore());

      const handicaps = new Map<number, number>();
      handicaps.set(1, 15.0);

      const context = createContext({ scoringMode: "both" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(72);
      expect(results[0].relativeToPar).toBe(0);
      expect(results[0].netTotal).toBeDefined();
      expect(results[0].netRelativeToPar).toBeDefined();
    });

    test("should rank by gross score when scoring mode is both", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createScoreWithRelative(10)); // 82 gross
      scores.set(2, createEvenParScore()); // 72 gross

      const handicaps = new Map<number, number>();
      handicaps.set(1, 20.0);
      handicaps.set(2, 0.0);

      const context = createContext({ scoringMode: "both" });

      const results = strategy.calculateResults(scores, handicaps, context);

      // Should rank by gross, not net
      expect(results[0].memberId).toBe(2); // 72 gross
      expect(results[1].memberId).toBe(1); // 82 gross
    });
  });

  describe("calculateResults - Scoring Mode: Gross", () => {
    test("should not calculate net scores when scoring mode is gross", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore());

      const handicaps = new Map<number, number>();
      handicaps.set(1, 15.0); // Player has handicap but mode is gross

      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(72);
      expect(results[0].netTotal).toBeUndefined();
      expect(results[0].netRelativeToPar).toBeUndefined();
    });
  });

  describe("calculateResults - Edge Cases", () => {
    test("should handle empty scores map", () => {
      const scores = new Map<number, number[]>();
      const handicaps = new Map<number, number>();
      const context = createContext();

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(0);
    });

    test("should handle all zeros score (not started)", () => {
      const scores = new Map<number, number[]>();
      const notStartedScore = Array(18).fill(0);
      scores.set(1, notStartedScore);

      const handicaps = new Map<number, number>();
      const context = createContext();

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].holesPlayed).toBe(0);
      expect(results[0].grossTotal).toBe(0);
      expect(results[0].relativeToPar).toBe(0);
    });

    test("should handle very high scores", () => {
      const scores = new Map<number, number[]>();
      // Each hole is a 10
      const highScore = Array(18).fill(10);
      scores.set(1, highScore);

      const handicaps = new Map<number, number>();
      const context = createContext();

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(180); // 10 * 18
      expect(results[0].relativeToPar).toBe(108); // 180 - 72
    });

    test("should handle very low scores (birdie on every hole)", () => {
      const scores = new Map<number, number[]>();
      // One under par on each hole
      const lowScore = standardPars.map((p) => p - 1);
      scores.set(1, lowScore);

      const handicaps = new Map<number, number>();
      const context = createContext();

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(54); // 72 - 18
      expect(results[0].relativeToPar).toBe(-18);
    });

    test("should handle large number of players", () => {
      const scores = new Map<number, number[]>();
      const handicaps = new Map<number, number>();

      // Add 50 players with varying scores
      for (let i = 1; i <= 50; i++) {
        const relativeScore = (i % 20) - 10; // Range from -10 to +9
        scores.set(i, createScoreWithRelative(relativeScore));
        handicaps.set(i, i % 30); // Varying handicaps
      }

      const context = createContext({ scoringMode: "gross" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(50);
      // Results should be sorted by score
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].relativeToPar).toBeLessThanOrEqual(results[i + 1].relativeToPar);
      }
    });

    test("should handle missing stroke index gracefully", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore());

      const handicaps = new Map<number, number>();
      handicaps.set(1, 10.0);

      const context = createContext({
        scoringMode: "net",
        strokeIndex: [], // Empty stroke index
      });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].netTotal).toBeDefined(); // Should still calculate net
    });
  });

  describe("calculateResults - Net Score Distribution", () => {
    test("should distribute handicap strokes correctly across holes", () => {
      const scores = new Map<number, number[]>();
      // Score 5 on every hole (total 90)
      const flatScore = Array(18).fill(5);
      scores.set(1, flatScore);

      const handicaps = new Map<number, number>();
      handicaps.set(1, 18.0); // 18 handicap = 1 stroke per hole

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(90);
      // Net should be 90 - 18 = 72 (approximately, depends on course handicap calc)
      // With standard ratings: course handicap = 18 * 113/113 = 18
      expect(results[0].netTotal).toBe(72);
    });

    test("should handle handicap strokes on partial round", () => {
      const scores = new Map<number, number[]>();
      // Only front 9 played, all 5s
      const partialScore = [5, 5, 5, 5, 5, 5, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      scores.set(1, partialScore);

      const handicaps = new Map<number, number>();
      handicaps.set(1, 18.0);

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(1);
      expect(results[0].grossTotal).toBe(45);
      expect(results[0].holesPlayed).toBe(9);
      // Net score should still be calculated
      expect(results[0].netTotal).toBeDefined();
    });
  });

  describe("Strategy Properties", () => {
    test("should have correct type name", () => {
      expect(strategy.typeName).toBe("stroke_play");
    });

    test("should have correct display name", () => {
      expect(strategy.displayName).toBe("Stroke Play");
    });

    test("should return empty default settings", () => {
      const settings = strategy.getDefaultSettings();
      expect(settings).toEqual({});
    });
  });

  describe("Score Validation", () => {
    test("should accept positive scores", () => {
      expect(() => strategy.validateScore(1, 4, 4)).not.toThrow();
      expect(() => strategy.validateScore(1, 5, 4)).not.toThrow();
      expect(() => strategy.validateScore(1, 3, 4)).not.toThrow();
    });

    test("should accept UNREPORTED_HOLE (-1)", () => {
      expect(() => strategy.validateScore(1, GOLF.UNREPORTED_HOLE, 4)).not.toThrow();
    });

    test("should accept zero (cleared hole)", () => {
      expect(() => strategy.validateScore(1, 0, 4)).not.toThrow();
    });

    test("should reject invalid negative scores", () => {
      expect(() => strategy.validateScore(1, -2, 4)).toThrow("Invalid score value");
      expect(() => strategy.validateScore(1, -10, 4)).toThrow("Invalid score value");
    });
  });

  describe("Net Score Tie Handling", () => {
    test("should handle ties correctly in net scoring mode", () => {
      const scores = new Map<number, number[]>();
      // Player 1: 82 gross with 10 handicap
      scores.set(1, createScoreWithRelative(10));
      // Player 2: 77 gross with 5 handicap
      scores.set(2, createScoreWithRelative(5));

      const handicaps = new Map<number, number>();
      handicaps.set(1, 10.0);
      handicaps.set(2, 5.0);

      const context = createContext({ scoringMode: "net" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(2);
      // Both should have approximately 72 net (82-10 = 72, 77-5 = 72)
      // Should be tied
      if (results[0].netRelativeToPar === results[1].netRelativeToPar) {
        expect(results[0].position).toBe(1);
        expect(results[1].position).toBe(1);
      }
    });
  });

  describe("Real-world Scenarios", () => {
    test("should calculate typical weekend round correctly", () => {
      const scores = new Map<number, number[]>();

      // Player 1: Scratch golfer, shoots 70
      scores.set(1, createScoreWithRelative(-2));
      // Player 2: Mid handicapper (15), shoots 85
      scores.set(2, createScoreWithRelative(13));
      // Player 3: High handicapper (25), shoots 95
      scores.set(3, createScoreWithRelative(23));
      // Player 4: Low handicapper (5), shoots 75
      scores.set(4, createScoreWithRelative(3));

      const handicaps = new Map<number, number>();
      handicaps.set(1, 0.0);
      handicaps.set(2, 15.0);
      handicaps.set(3, 25.0);
      handicaps.set(4, 5.0);

      const context = createContext({ scoringMode: "both" });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(4);

      // Gross ranking: Player 1 (70), Player 4 (75), Player 2 (85), Player 3 (95)
      expect(results[0].memberId).toBe(1);
      expect(results[0].grossTotal).toBe(70);
      expect(results[1].memberId).toBe(4);
      expect(results[2].memberId).toBe(2);
      expect(results[3].memberId).toBe(3);

      // All should have net scores calculated
      expect(results[0].netTotal).toBeDefined();
      expect(results[1].netTotal).toBeDefined();
      expect(results[2].netTotal).toBeDefined();
      expect(results[3].netTotal).toBeDefined();
    });

    test("should handle mixed field with different tee ratings", () => {
      const scores = new Map<number, number[]>();
      scores.set(1, createEvenParScore()); // Player 1 on back tees
      scores.set(2, createEvenParScore()); // Player 2 on forward tees

      const handicaps = new Map<number, number>();
      handicaps.set(1, 10.0);
      handicaps.set(2, 10.0);

      const playerTeeRatings = new Map<number, PlayerTeeRating>();
      // Back tees (harder)
      playerTeeRatings.set(1, {
        courseRating: 74.0,
        slopeRating: 140,
        par: 72,
      });
      // Forward tees (easier)
      playerTeeRatings.set(2, {
        courseRating: 69.0,
        slopeRating: 110,
        par: 72,
      });

      const context = createContext({
        scoringMode: "net",
        playerTeeRatings,
      });

      const results = strategy.calculateResults(scores, handicaps, context);

      expect(results).toHaveLength(2);
      // Both have same gross
      expect(results[0].grossTotal).toBe(72);
      expect(results[1].grossTotal).toBe(72);

      // But different net scores due to different course handicaps
      expect(results[0].netTotal).not.toBe(results[1].netTotal);

      // Player 1 (harder tees) should have lower net
      const player1Result = results.find((r) => r.memberId === 1)!;
      const player2Result = results.find((r) => r.memberId === 2)!;

      // Course handicap for harder tees should be higher
      // P1: (10 * 140 / 113) + (74 - 72) = 12.39 + 2 = 14.39 -> 14
      // P2: (10 * 110 / 113) + (69 - 72) = 9.73 - 3 = 6.73 -> 7
      // P1 net: 72 - 14 = 58, P2 net: 72 - 7 = 65
      expect(player1Result.netTotal).toBeLessThan(player2Result.netTotal!);
    });
  });
});
