import { describe, expect, it } from "vitest";

import type { ParticipantScore, PlayerForRoundCheck } from "../types";

import {
  calculateHoleTotal,
  calculateNetScores,
  calculateParticipantScore,
  calculatePlayedPar,
  calculateTeamResults,
  calculateTotalParticipants,
  formatScoreDisplay,
  formatScoreEntryDisplay,
  formatToPar,
  getPositionColor,
  getToParColor,
  hasValidScore,
  isRoundComplete,
  isValidScore,
} from "./scoreCalculations";

describe("calculateParticipantScore", () => {
  const standardPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4]; // Par 72

  it("calculates score for complete round at par", () => {
    const scores = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.totalShots).toBe(72);
    expect(result.relativeToPar).toBe(0);
    expect(result.holesPlayed).toBe(18);
    expect(result.isValidRound).toBe(true);
  });

  it("calculates score for complete round over par", () => {
    const scores = [5, 5, 4, 6, 5, 5, 4, 6, 5, 5, 5, 4, 6, 5, 5, 4, 6, 5]; // +18
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.totalShots).toBe(90);
    expect(result.relativeToPar).toBe(18);
    expect(result.holesPlayed).toBe(18);
    expect(result.isValidRound).toBe(true);
  });

  it("calculates score for complete round under par", () => {
    const scores = [3, 3, 2, 4, 3, 3, 2, 4, 3, 3, 3, 2, 4, 3, 3, 2, 4, 3]; // -18
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.totalShots).toBe(54);
    expect(result.relativeToPar).toBe(-18);
    expect(result.holesPlayed).toBe(18);
    expect(result.isValidRound).toBe(true);
  });

  it("handles partial round with not reported holes (0)", () => {
    const scores = [4, 4, 3, 5, 4, 4, 3, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.totalShots).toBe(36); // Front nine total
    expect(result.relativeToPar).toBe(0); // Par for front nine is also 36
    expect(result.holesPlayed).toBe(9);
    expect(result.isValidRound).toBe(true);
  });

  it("handles empty scores array", () => {
    const result = calculateParticipantScore([], standardPars);

    expect(result.totalShots).toBe(0);
    expect(result.relativeToPar).toBe(0);
    expect(result.holesPlayed).toBe(0);
    expect(result.isValidRound).toBe(true);
  });

  it("handles all zeros (no holes played)", () => {
    const scores = Array(18).fill(0);
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.totalShots).toBe(0);
    expect(result.relativeToPar).toBe(0);
    expect(result.holesPlayed).toBe(0);
    expect(result.isValidRound).toBe(true);
  });

  it("invalidates round when player gave up (-1)", () => {
    const scores = [4, 4, 3, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.totalShots).toBe(0);
    expect(result.relativeToPar).toBe(0);
    expect(result.holesPlayed).toBe(0);
    expect(result.isValidRound).toBe(false);
  });

  it("invalidates round with -1 at any position", () => {
    const scores = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, -1];
    const result = calculateParticipantScore(scores, standardPars);

    expect(result.isValidRound).toBe(false);
  });

  it("handles mismatched array lengths", () => {
    const shortPars = [4, 4, 3];
    const scores = [4, 4, 3, 5, 4, 4, 3, 5, 4];
    const result = calculateParticipantScore(scores, shortPars);

    // Should only process holes where both arrays have values
    expect(result.holesPlayed).toBe(3);
    expect(result.totalShots).toBe(11);
  });
});

describe("formatToPar", () => {
  it("formats even par as E", () => {
    expect(formatToPar(0)).toBe("E");
  });

  it("formats positive scores with plus sign", () => {
    expect(formatToPar(1)).toBe("+1");
    expect(formatToPar(5)).toBe("+5");
    expect(formatToPar(18)).toBe("+18");
  });

  it("formats negative scores with minus sign", () => {
    expect(formatToPar(-1)).toBe("-1");
    expect(formatToPar(-5)).toBe("-5");
    expect(formatToPar(-18)).toBe("-18");
  });
});

describe("getToParColor", () => {
  it("returns turf color for even par", () => {
    expect(getToParColor(0)).toBe("text-turf");
  });

  it("returns flag color for under par", () => {
    expect(getToParColor(-1)).toBe("text-flag");
    expect(getToParColor(-5)).toBe("text-flag");
  });

  it("returns charcoal color for over par", () => {
    expect(getToParColor(1)).toBe("text-charcoal");
    expect(getToParColor(10)).toBe("text-charcoal");
  });
});

describe("getPositionColor", () => {
  it("returns gold styling for 1st place", () => {
    expect(getPositionColor(1)).toContain("#FFD700");
  });

  it("returns silver styling for 2nd place", () => {
    expect(getPositionColor(2)).toContain("#C0C0C0");
  });

  it("returns bronze styling for 3rd place", () => {
    expect(getPositionColor(3)).toContain("#CD7F32");
  });

  it("returns default styling for 4th place and beyond", () => {
    expect(getPositionColor(4)).toContain("soft-grey");
    expect(getPositionColor(10)).toContain("soft-grey");
  });
});

describe("formatScoreDisplay", () => {
  it("formats gave up (-1) as dash", () => {
    expect(formatScoreDisplay(-1)).toBe("-");
  });

  it("formats not reported (0) as 0", () => {
    expect(formatScoreDisplay(0)).toBe("0");
  });

  it("formats positive scores as numbers", () => {
    expect(formatScoreDisplay(3)).toBe("3");
    expect(formatScoreDisplay(5)).toBe("5");
    expect(formatScoreDisplay(10)).toBe("10");
  });
});

describe("formatScoreEntryDisplay", () => {
  it("formats gave up (-1) as dash", () => {
    expect(formatScoreEntryDisplay(-1)).toBe("-");
  });

  it("formats null as dash", () => {
    expect(formatScoreEntryDisplay(null)).toBe("-");
  });

  it("formats not reported (0) as 0", () => {
    expect(formatScoreEntryDisplay(0)).toBe("0");
  });

  it("formats positive scores as numbers", () => {
    expect(formatScoreEntryDisplay(4)).toBe("4");
  });
});

describe("calculateTotalParticipants", () => {
  it("calculates total across multiple tee times", () => {
    const teeTimes = [
      { participants: [1, 2, 3] },
      { participants: [4, 5] },
      { participants: [6] },
    ];
    expect(calculateTotalParticipants(teeTimes)).toBe(6);
  });

  it("returns 0 for undefined", () => {
    expect(calculateTotalParticipants(undefined)).toBe(0);
  });

  it("returns 0 for empty array", () => {
    expect(calculateTotalParticipants([])).toBe(0);
  });

  it("handles empty tee times", () => {
    const teeTimes = [{ participants: [] }, { participants: [1] }];
    expect(calculateTotalParticipants(teeTimes)).toBe(1);
  });
});

describe("isValidScore", () => {
  it("returns true for positive scores", () => {
    expect(isValidScore(1)).toBe(true);
    expect(isValidScore(4)).toBe(true);
    expect(isValidScore(10)).toBe(true);
  });

  it("returns false for zero", () => {
    expect(isValidScore(0)).toBe(false);
  });

  it("returns false for negative values", () => {
    expect(isValidScore(-1)).toBe(false);
  });
});

describe("hasValidScore", () => {
  it("returns true for positive scores", () => {
    expect(hasValidScore(4)).toBe(true);
  });

  it("returns true for gave up (-1)", () => {
    expect(hasValidScore(-1)).toBe(true);
  });

  it("returns false for not reported (0)", () => {
    expect(hasValidScore(0)).toBe(false);
  });
});

describe("calculateHoleTotal", () => {
  const playerScores = [4, 5, 3, 6, 4, 5, 3, 6, 4, 5, 4, 3, 6, 4, 5, 3, 6, 4];

  it("calculates total for front nine", () => {
    const frontNine = [
      { number: 1 },
      { number: 2 },
      { number: 3 },
      { number: 4 },
      { number: 5 },
      { number: 6 },
      { number: 7 },
      { number: 8 },
      { number: 9 },
    ];
    expect(calculateHoleTotal(playerScores, frontNine)).toBe(40);
  });

  it("excludes not reported holes (0)", () => {
    const scoresWithZero = [4, 0, 3, 0, 4, 0, 3, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const frontNine = Array.from({ length: 9 }, (_, i) => ({ number: i + 1 }));
    expect(calculateHoleTotal(scoresWithZero, frontNine)).toBe(18);
  });

  it("excludes gave up holes (-1)", () => {
    const scoresWithGaveUp = [4, -1, 3, 5, 4, 4, 3, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const frontNine = Array.from({ length: 9 }, (_, i) => ({ number: i + 1 }));
    expect(calculateHoleTotal(scoresWithGaveUp, frontNine)).toBe(32); // 4+3+5+4+4+3+5+4 = 32
  });

  it("handles empty holes array", () => {
    expect(calculateHoleTotal(playerScores, [])).toBe(0);
  });
});

describe("calculatePlayedPar", () => {
  const playerScores = [4, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const holes = [
    { number: 1, par: 4 },
    { number: 2, par: 4 },
    { number: 3, par: 3 },
    { number: 4, par: 5 },
    { number: 5, par: 4 },
  ];

  it("calculates par only for played holes", () => {
    expect(calculatePlayedPar(playerScores, holes)).toBe(11); // 4+4+3 for first 3 holes
  });

  it("returns 0 for no played holes", () => {
    const noScores = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(calculatePlayedPar(noScores, holes)).toBe(0);
  });

  it("excludes gave up holes from par total", () => {
    const scoresWithGaveUp = [-1, 5, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect(calculatePlayedPar(scoresWithGaveUp, holes)).toBe(7); // 4+3 for holes 2 and 3
  });
});

describe("isRoundComplete", () => {
  it("returns true when all players have complete scores", () => {
    const players: PlayerForRoundCheck[] = [
      { score: Array(18).fill(4) },
      { score: Array(18).fill(5) },
    ];
    expect(isRoundComplete(players)).toBe(true);
  });

  it("returns false when any hole is 0 (not played)", () => {
    const scores = Array(18).fill(4);
    scores[17] = 0; // Last hole not played
    const players: PlayerForRoundCheck[] = [{ score: scores }];
    expect(isRoundComplete(players)).toBe(false);
  });

  it("returns false for empty players array", () => {
    expect(isRoundComplete([])).toBe(false);
  });

  it("returns false for null/undefined players", () => {
    expect(isRoundComplete(null as unknown as PlayerForRoundCheck[])).toBe(false);
    expect(isRoundComplete(undefined as unknown as PlayerForRoundCheck[])).toBe(false);
  });

  it("returns false when player has no score array", () => {
    const players = [{ score: null }] as unknown as PlayerForRoundCheck[];
    expect(isRoundComplete(players)).toBe(false);
  });

  it("returns true when player gave up (-1) on a hole", () => {
    const scores = Array(18).fill(4);
    scores[5] = -1; // Gave up on hole 6
    const players: PlayerForRoundCheck[] = [{ score: scores }];
    expect(isRoundComplete(players)).toBe(true);
  });

  it("returns false when any player has incomplete round", () => {
    const players: PlayerForRoundCheck[] = [
      { score: Array(18).fill(4) }, // Complete
      { score: [...Array(9).fill(4), ...Array(9).fill(0)] }, // Incomplete
    ];
    expect(isRoundComplete(players)).toBe(false);
  });
});

describe("calculateTeamResults", () => {
  const createParticipantScore = (
    teamName: string,
    playerNames: string,
    positionName: string,
    totalShots: number,
    relativeToPar: number
  ): ParticipantScore => ({
    participantId: 1,
    participant: {
      id: 1,
      team_name: teamName,
      position_name: positionName,
      player_name: playerNames,
    },
    totalShots,
    relativeToPar,
    holesPlayed: 18,
  });

  it("groups participants by team and calculates totals", () => {
    const leaderboard: ParticipantScore[] = [
      createParticipantScore("Team A", "Player 1", "Captain", 72, 0),
      createParticipantScore("Team A", "Player 2", "Member", 74, 2),
      createParticipantScore("Team B", "Player 3", "Captain", 70, -2),
      createParticipantScore("Team B", "Player 4", "Member", 71, -1),
    ];

    const results = calculateTeamResults(leaderboard);

    expect(results).toHaveLength(2);
    expect(results[0].teamName).toBe("Team B"); // Better total score (-3)
    expect(results[0].relativeToPar).toBe(-3); // -2 + -1 = -3
    expect(results[0].position).toBe(1);
    expect(results[1].teamName).toBe("Team A");
    expect(results[1].relativeToPar).toBe(2); // 0 + 2 = 2
    expect(results[1].position).toBe(2);
  });

  it("assigns points with bonus for top 3", () => {
    const leaderboard: ParticipantScore[] = [
      createParticipantScore("Team A", "P1", "C", 68, -4),
      createParticipantScore("Team B", "P2", "C", 70, -2),
      createParticipantScore("Team C", "P3", "C", 72, 0),
      createParticipantScore("Team D", "P4", "C", 74, 2),
    ];

    const results = calculateTeamResults(leaderboard);

    // 4 teams: base points are 4,3,2,1, plus bonuses
    expect(results[0].points).toBe(6); // 4 + 2 (1st place bonus)
    expect(results[1].points).toBe(4); // 3 + 1 (2nd place bonus)
    expect(results[2].points).toBe(2); // 2 + 0
    expect(results[3].points).toBe(1); // 1 + 0
  });

  it("includes all team participants in result", () => {
    const leaderboard: ParticipantScore[] = [
      createParticipantScore("Team A", "Player 1", "Captain", 72, 0),
      createParticipantScore("Team A", "Player 2", "Member", 74, 2),
    ];

    const results = calculateTeamResults(leaderboard);

    expect(results[0].participants).toHaveLength(2);
    expect(results[0].participants[0].name).toBe("Player 1");
    expect(results[0].participants[1].name).toBe("Player 2");
  });

  it("handles empty leaderboard", () => {
    const results = calculateTeamResults([]);
    expect(results).toEqual([]);
  });

  it("handles single team", () => {
    const leaderboard: ParticipantScore[] = [
      createParticipantScore("Team A", "P1", "C", 72, 0),
    ];

    const results = calculateTeamResults(leaderboard);

    expect(results).toHaveLength(1);
    expect(results[0].position).toBe(1);
    expect(results[0].points).toBe(3); // 1 base + 2 bonus
  });
});

describe("calculateNetScores", () => {
  const standardPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4]; // Par 72

  it("calculates net scores for complete round with even handicap distribution", () => {
    // 18 handicap = 1 stroke per hole
    const handicapStrokesPerHole = Array(18).fill(1);
    // Scores: all 5s = 90 gross
    const scores = Array(18).fill(5);

    const result = calculateNetScores(scores, standardPars, handicapStrokesPerHole);

    expect(result).not.toBeNull();
    expect(result!.netTotal).toBe(72); // 90 - 18 = 72
    expect(result!.netRelativeToPar).toBe(0); // 72 - 72 = 0
    expect(result!.netFrontTotal).toBe(36); // (5*9) - (1*9) = 36
    expect(result!.netBackTotal).toBe(36);
  });

  it("correctly calculates net for partial round - only subtracts handicap for played holes", () => {
    // This is the key bug fix test
    // HCP 19 distributes as [1,1,2,1,1,1,1,1,1, 1,1,1,1,1,1,1,1,1] (front has one 2, rest are 1s)
    const handicapStrokesPerHole = [1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    // Only 2 holes played: scores [4, 4, 0, 0, 0, ...]
    const scores = [4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // Pars for first 2 holes: 4, 4

    const result = calculateNetScores(scores, standardPars, handicapStrokesPerHole);

    expect(result).not.toBeNull();
    // Net should be (4-1) + (4-1) = 6, NOT 8 - 19 = -11
    expect(result!.netTotal).toBe(6);
    // Net to par: 6 - 8 = -2 (2 under par for holes played)
    expect(result!.netRelativeToPar).toBe(-2);
    expect(result!.netFrontTotal).toBe(6);
    expect(result!.netBackTotal).toBe(0);
  });

  it("returns null when player gave up", () => {
    const handicapStrokesPerHole = Array(18).fill(1);
    const scores = [4, 4, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const result = calculateNetScores(scores, standardPars, handicapStrokesPerHole);

    expect(result).toBeNull();
  });

  it("handles no holes played", () => {
    const handicapStrokesPerHole = Array(18).fill(1);
    const scores = Array(18).fill(0);

    const result = calculateNetScores(scores, standardPars, handicapStrokesPerHole);

    expect(result).not.toBeNull();
    expect(result!.netTotal).toBe(0);
    expect(result!.netRelativeToPar).toBe(0);
    expect(result!.netFrontTotal).toBe(0);
    expect(result!.netBackTotal).toBe(0);
  });

  it("correctly handles high handicap player", () => {
    // 36 handicap = 2 strokes per hole
    const handicapStrokesPerHole = Array(18).fill(2);
    // Player shoots bogey golf: par + 1 on every hole
    const scores = standardPars.map((par) => par + 1); // 90 gross

    const result = calculateNetScores(scores, standardPars, handicapStrokesPerHole);

    expect(result).not.toBeNull();
    expect(result!.netTotal).toBe(54); // 90 - 36 = 54
    expect(result!.netRelativeToPar).toBe(-18); // 54 - 72 = -18
  });

  it("correctly splits front and back nine", () => {
    // Front nine gets 2 strokes each, back nine gets 0
    const handicapStrokesPerHole = [2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // All 4s
    const scores = Array(18).fill(4);

    const result = calculateNetScores(scores, standardPars, handicapStrokesPerHole);

    expect(result).not.toBeNull();
    expect(result!.netFrontTotal).toBe(18); // (4*9) - (2*9) = 18
    expect(result!.netBackTotal).toBe(36); // (4*9) - 0 = 36
    expect(result!.netTotal).toBe(54);
  });
});
