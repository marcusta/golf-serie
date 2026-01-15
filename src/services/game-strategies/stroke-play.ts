import {
  GameTypeStrategy,
  type GameLeaderboardContext,
  type GameScoreResult,
} from "./base";
import { calculateCourseHandicap, distributeHandicapStrokes } from "../../utils/handicap";
import { GOLF } from "../../constants/golf";
import {
  calculateHolesPlayed,
  calculateGrossScore,
  calculateRelativeToPar,
} from "../../utils/golf-scoring";

/**
 * Stroke Play Strategy
 *
 * Traditional golf scoring where total shots (gross or net) determines the winner.
 * Supports three scoring modes: gross, net, and both.
 */
export class StrokePlayStrategy extends GameTypeStrategy {
  readonly typeName = "stroke_play";
  readonly displayName = "Stroke Play";

  validateSettings(settings: Record<string, any>): void {
    // Stroke play has no additional settings to validate
    return;
  }

  calculateResults(
    scores: Map<number, number[]>,
    handicaps: Map<number, number>,
    context: GameLeaderboardContext
  ): GameScoreResult[] {
    const results: GameScoreResult[] = [];
    const totalPar = context.pars.reduce((sum, par) => sum + par, 0);

    for (const [memberId, scoreArray] of scores.entries()) {
      // Count holes played
      const holesPlayed = calculateHolesPlayed(scoreArray);

      // Calculate gross total and relative to par
      const grossTotal = calculateGrossScore(scoreArray);
      const relativeToPar = calculateRelativeToPar(scoreArray, context.pars);

      // Initialize result with gross scores
      const result: GameScoreResult = {
        memberId,
        memberName: "", // Will be filled by service layer
        grossTotal,
        relativeToPar,
        holesPlayed,
        position: 0, // Will be calculated after sorting
      };

      // Calculate net scores if needed
      if (context.scoringMode !== "gross" && handicaps.has(memberId)) {
        const handicapIndex = handicaps.get(memberId)!;

        // Get tee-specific ratings if available, otherwise use standard ratings
        const teeRating = context.playerTeeRatings?.get(memberId);
        const slopeRating = teeRating?.slopeRating ?? GOLF.STANDARD_SLOPE_RATING;
        const courseRating = teeRating?.courseRating ?? GOLF.STANDARD_COURSE_RATING;
        const par = teeRating?.par ?? totalPar;

        // Calculate course handicap using actual tee ratings
        const courseHandicap = calculateCourseHandicap(
          handicapIndex,
          slopeRating,
          courseRating,
          par
        );

        // Distribute handicap strokes across holes
        const strokesPerHole = distributeHandicapStrokes(
          courseHandicap,
          context.strokeIndex
        );

        // Calculate net score
        const netData = this.calculateNetScore(scoreArray, context.pars, strokesPerHole);
        result.netTotal = netData.netTotal;
        result.netRelativeToPar = netData.netRelativeToPar;
      }

      results.push(result);
    }

    // Sort results based on scoring mode
    this.sortResults(results, context.scoringMode);

    // Assign positions (with tie handling)
    this.assignPositions(results, context.scoringMode);

    return results;
  }

  // ============================================================================
  // Private Helper Methods (Logic - No SQL)
  // ============================================================================

  /**
   * Calculate net score and relative to par
   */
  private calculateNetScore(
    scores: number[],
    pars: number[],
    strokesPerHole: number[]
  ): { netTotal: number; netRelativeToPar: number } {
    let netScore = 0;
    let parForHolesPlayed = 0;

    for (let i = 0; i < scores.length; i++) {
      if (scores[i] > 0) {
        // Net score = gross - handicap strokes for this hole
        netScore += scores[i] - strokesPerHole[i];
        parForHolesPlayed += pars[i];
      }
    }

    return {
      netTotal: netScore,
      netRelativeToPar: netScore - parForHolesPlayed,
    };
  }

  /**
   * Sort results based on scoring mode
   * Mutates the results array in place
   */
  private sortResults(results: GameScoreResult[], scoringMode: string): void {
    results.sort((a, b) => {
      if (scoringMode === "net") {
        // Sort by net relative to par (or gross if net not available)
        const aScore = a.netRelativeToPar ?? a.relativeToPar;
        const bScore = b.netRelativeToPar ?? b.relativeToPar;
        return aScore - bScore;
      } else {
        // Sort by gross relative to par (default for 'gross' and 'both')
        return a.relativeToPar - b.relativeToPar;
      }
    });
  }

  /**
   * Assign positions based on sorted order with tie handling
   * Mutates the results array in place
   */
  private assignPositions(results: GameScoreResult[], scoringMode: string): void {
    let currentPosition = 1;

    results.forEach((result, index) => {
      if (index > 0) {
        // Check if this player's score is the same as previous player
        const prevResult = results[index - 1];

        const prevScore = scoringMode === "net"
          ? (prevResult.netRelativeToPar ?? prevResult.relativeToPar)
          : prevResult.relativeToPar;

        const currScore = scoringMode === "net"
          ? (result.netRelativeToPar ?? result.relativeToPar)
          : result.relativeToPar;

        if (currScore !== prevScore) {
          // Different score, advance position
          currentPosition = index + 1;
        }
        // If same score, keep same position (tied)
      }

      result.position = currentPosition;
    });
  }
}
