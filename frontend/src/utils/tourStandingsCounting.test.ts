import { describe, expect, it } from "vitest";
import { competitionCountsTowardTotal } from "./tourStandingsCounting";
import type { StandingsCompetitionEntry } from "./tourStandingsCounting";

const baseCompetition: StandingsCompetitionEntry = {
  competition_id: 1,
  competition_name: "Comp 1",
  competition_date: "2024-01-01",
  points: 5,
  position: 1,
  score_relative_to_par: 0,
};

describe("competitionCountsTowardTotal", () => {
  it("uses counts_toward_projected in projected view mode", () => {
    expect(
      competitionCountsTowardTotal(
        {
          ...baseCompetition,
          counts_toward_projected: true,
          counts_toward_actual: false,
        },
        "projected"
      )
    ).toBe(true);

    expect(
      competitionCountsTowardTotal(
        {
          ...baseCompetition,
          counts_toward_projected: false,
          counts_toward_actual: true,
        },
        "projected"
      )
    ).toBe(false);
  });

  it("uses counts_toward_actual in actual view mode", () => {
    expect(
      competitionCountsTowardTotal(
        {
          ...baseCompetition,
          counts_toward_projected: false,
          counts_toward_actual: true,
        },
        "actual"
      )
    ).toBe(true);

    expect(
      competitionCountsTowardTotal(
        {
          ...baseCompetition,
          counts_toward_projected: true,
          counts_toward_actual: false,
        },
        "actual"
      )
    ).toBe(false);
  });

  it("defaults missing flags to counted for legacy responses", () => {
    expect(competitionCountsTowardTotal(baseCompetition, "projected")).toBe(true);
    expect(competitionCountsTowardTotal(baseCompetition, "actual")).toBe(true);
  });

  it("returns false for future or non-participated placeholders", () => {
    expect(
      competitionCountsTowardTotal(
        { ...baseCompetition, is_future: true },
        "projected"
      )
    ).toBe(false);

    expect(
      competitionCountsTowardTotal(
        { ...baseCompetition, not_participated: true },
        "actual"
      )
    ).toBe(false);
  });
});

describe("dropped result styling decision", () => {
  it("marks only explicit non-counting results when a cap is active", () => {
    const countingLimit = 2;
    const competition = {
      ...baseCompetition,
      counts_toward_projected: false,
      counts_toward_actual: false,
    };

    const showDroppedStyle =
      countingLimit != null &&
      !competition.is_future &&
      !competition.not_participated &&
      !competitionCountsTowardTotal(competition, "projected");

    expect(showDroppedStyle).toBe(true);
  });

  it("does not mark dropped results when no cap is configured", () => {
    const countingLimit = null;
    const competition = {
      ...baseCompetition,
      counts_toward_projected: false,
    };

    const showDroppedStyle =
      countingLimit != null &&
      !competition.is_future &&
      !competition.not_participated &&
      !competitionCountsTowardTotal(competition, "projected");

    expect(showDroppedStyle).toBe(false);
  });
});
