import { GOLF } from "../constants/golf";
import type { CompetitionRoundType } from "../types";

const FULL_18: CompetitionRoundType = "full_18";

export function normalizeRoundType(
  roundType: string | null | undefined
): CompetitionRoundType {
  if (roundType === "front_9" || roundType === "back_9") {
    return roundType;
  }
  return FULL_18;
}

export function getExpectedHolesCount(
  roundType: string | null | undefined
): number {
  return normalizeRoundType(roundType) === "full_18"
    ? GOLF.HOLES_PER_ROUND
    : 9;
}

export function getActiveHoleIndices(
  roundType: string | null | undefined
): number[] {
  const normalized = normalizeRoundType(roundType);
  if (normalized === "front_9") {
    return Array.from({ length: 9 }, (_, i) => i);
  }
  if (normalized === "back_9") {
    return Array.from({ length: 9 }, (_, i) => i + 9);
  }
  return Array.from({ length: GOLF.HOLES_PER_ROUND }, (_, i) => i);
}

export function getActiveHoleNumbers(
  roundType: string | null | undefined
): number[] {
  return getActiveHoleIndices(roundType).map((i) => i + 1);
}
