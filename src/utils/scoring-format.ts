import type { TourScoringFormat } from "../types";

export function resolveCompetitionScoringFormat(
  competitionScoringFormat?: TourScoringFormat | null,
  tourScoringFormat?: TourScoringFormat | null
): TourScoringFormat {
  return competitionScoringFormat ?? tourScoringFormat ?? "stroke_play";
}
