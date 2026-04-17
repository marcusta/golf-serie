import type { CompetitionRoundType } from "../api/competitions";

export function normalizeRoundType(
  roundType: string | null | undefined
): CompetitionRoundType {
  if (roundType === "front_9" || roundType === "back_9") {
    return roundType;
  }
  return "full_18";
}

export function getActiveHoleNumbers(
  roundType: string | null | undefined
): number[] {
  const normalized = normalizeRoundType(roundType);
  if (normalized === "front_9") {
    return Array.from({ length: 9 }, (_, i) => i + 1);
  }
  if (normalized === "back_9") {
    return Array.from({ length: 9 }, (_, i) => i + 10);
  }
  return Array.from({ length: 18 }, (_, i) => i + 1);
}

export function isHoleActive(
  hole: number,
  roundType: string | null | undefined
): boolean {
  return getActiveHoleNumbers(roundType).includes(hole);
}
