/**
 * Points calculation utilities for golf competitions.
 *
 * The default formula awards points based on position:
 * - 1st place: numberOfParticipants + 2
 * - 2nd place: numberOfParticipants
 * - 3rd and below: numberOfParticipants - (position - 1), minimum 0
 */

/**
 * Calculate points for a given position using the default formula.
 *
 * @param position - The finishing position (1-based)
 * @param numberOfParticipants - Total number of participants
 * @param multiplier - Optional multiplier to apply to base points (default: 1)
 * @returns Points awarded for the position
 */
export function calculateDefaultPoints(
  position: number,
  numberOfParticipants: number,
  multiplier: number = 1
): number {
  if (position <= 0) return 0;

  let basePoints: number;

  if (position === 1) {
    basePoints = numberOfParticipants + 2;
  } else if (position === 2) {
    basePoints = numberOfParticipants;
  } else {
    // For position 3 and below, ensuring points don't go below 0
    basePoints = numberOfParticipants - (position - 1);
    basePoints = Math.max(0, basePoints);
  }

  return basePoints * multiplier;
}
