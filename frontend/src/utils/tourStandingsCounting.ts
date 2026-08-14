import type { TourPlayerCompetition } from "@/api/tours";

export type StandingsCompetitionEntry = TourPlayerCompetition & {
  is_future?: boolean;
  not_participated?: boolean;
};

export function competitionCountsTowardTotal(
  competition: StandingsCompetitionEntry,
  viewMode: "actual" | "projected"
): boolean {
  if (competition.is_future || competition.not_participated) {
    return false;
  }

  const flag =
    viewMode === "actual"
      ? competition.counts_toward_actual
      : competition.counts_toward_projected;

  return flag !== false;
}
