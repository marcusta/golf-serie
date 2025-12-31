/**
 * Golf domain constants based on World Handicap System (WHS) rules.
 * Use these instead of magic numbers throughout the codebase.
 */
export const GOLF = {
  // Round structure
  HOLES_PER_ROUND: 18,
  FRONT_NINE_START: 1,
  BACK_NINE_START: 10,

  // WHS Standard Values
  STANDARD_SLOPE_RATING: 113,
  STANDARD_COURSE_RATING: 72,

  // Valid par range per hole
  MIN_PAR: 3,
  MAX_PAR: 6,

  // Valid course rating range
  MIN_COURSE_RATING: 50,
  MAX_COURSE_RATING: 90,

  // Valid slope rating range
  MIN_SLOPE_RATING: 55,
  MAX_SLOPE_RATING: 155,

  // Valid handicap index range
  MIN_HANDICAP_INDEX: -10,
  MAX_HANDICAP_INDEX: 54,

  // Score markers
  UNREPORTED_HOLE: -1,
} as const;

// Type for the GOLF constant object
export type GolfConstants = typeof GOLF;
