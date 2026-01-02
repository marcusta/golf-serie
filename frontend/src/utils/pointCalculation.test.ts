import { describe, expect, it } from "vitest";

import type { TeamResultInput } from "../types";

import {
  convertLeaderboardToTeamInput,
  debugTeamRanking,
  isValidTeamResult,
  ParticipantScoreWithScores,
  processTeamResults,
} from "./pointCalculation";

describe("convertLeaderboardToTeamInput", () => {
  const createEntry = (
    teamName: string,
    playerNames: string,
    score: number[],
    totalShots: number,
    relativeToPar: number
  ): ParticipantScoreWithScores => ({
    participantId: 1,
    participant: {
      id: 1,
      team_name: teamName,
      position_name: "Captain",
      player_names: playerNames,
      score,
    },
    totalShots,
    relativeToPar,
    holesPlayed: 18,
  });

  it("groups participants by team", () => {
    const leaderboard: ParticipantScoreWithScores[] = [
      createEntry("Team A", "Player 1", Array(18).fill(4), 72, 0),
      createEntry("Team A", "Player 2", Array(18).fill(5), 90, 18),
      createEntry("Team B", "Player 3", Array(18).fill(4), 72, 0),
    ];

    const result = convertLeaderboardToTeamInput(leaderboard);

    expect(result).toHaveLength(2);
    const teamA = result.find((t) => t.teamName === "Team A");
    const teamB = result.find((t) => t.teamName === "Team B");

    expect(teamA?.participants).toHaveLength(2);
    expect(teamB?.participants).toHaveLength(1);
  });

  it("marks participants with -1 in score as invalid", () => {
    const scoreWithGaveUp = [...Array(17).fill(4), -1]; // Gave up on hole 18
    const leaderboard: ParticipantScoreWithScores[] = [
      createEntry("Team A", "Player 1", scoreWithGaveUp, 72, 0),
    ];

    const result = convertLeaderboardToTeamInput(leaderboard);

    expect(result[0].participants[0].totalShots).toBe(-1);
    expect(result[0].totalShots).toBe(-1);
  });

  it("calculates team totals from valid participants only", () => {
    const validScore = Array(18).fill(4);
    const leaderboard: ParticipantScoreWithScores[] = [
      createEntry("Team A", "Player 1", validScore, 72, 0),
      createEntry("Team A", "Player 2", validScore, 74, 2),
    ];

    const result = convertLeaderboardToTeamInput(leaderboard);

    expect(result[0].totalShots).toBe(146); // 72 + 74
    expect(result[0].relativeToPar).toBe(2); // 0 + 2
  });

  it("excludes participants with 0 totalShots from team totals", () => {
    const validScore = Array(18).fill(4);
    const zeroScore = Array(18).fill(0); // Not played
    const leaderboard: ParticipantScoreWithScores[] = [
      createEntry("Team A", "Player 1", validScore, 72, 0),
      createEntry("Team A", "Player 2", zeroScore, 0, 0), // No scores
    ];

    const result = convertLeaderboardToTeamInput(leaderboard);

    expect(result[0].totalShots).toBe(72); // Only Player 1
    expect(result[0].relativeToPar).toBe(0);
  });

  it("marks entire team as invalid if any participant has -1", () => {
    const validScore = Array(18).fill(4);
    const invalidScore = [...Array(17).fill(4), -1];
    const leaderboard: ParticipantScoreWithScores[] = [
      createEntry("Team A", "Player 1", validScore, 72, 0),
      createEntry("Team A", "Player 2", invalidScore, 72, 0),
    ];

    const result = convertLeaderboardToTeamInput(leaderboard);

    expect(result[0].totalShots).toBe(-1);
  });
});

describe("processTeamResults", () => {
  /**
   * Helper to create team test data
   * @param participantScores - Array of relativeToPar values for each participant
   *   Use -1000 as a sentinel to mark "gave up" (totalShots = -1)
   */
  const createTeam = (
    teamName: string,
    relativeToPar: number,
    totalShots: number,
    participantScores: number[] = []
  ): TeamResultInput => ({
    teamName,
    relativeToPar,
    totalShots,
    participants: participantScores.map((score, i) => ({
      name: `Player ${i + 1}`,
      position: "Member",
      // -1000 sentinel means "gave up" → totalShots = -1
      // Otherwise compute valid totalShots from relativeToPar
      totalShots: score === -1000 ? -1 : 72 + score,
      relativeToPar: score === -1000 ? 0 : score,
    })),
  });

  it("returns empty array for empty input", () => {
    expect(processTeamResults([])).toEqual([]);
    expect(processTeamResults(null as unknown as TeamResultInput[])).toEqual([]);
  });

  it("sorts teams by relativeToPar ascending", () => {
    const teams: TeamResultInput[] = [
      createTeam("Team C", 4, 148, [2, 2]),    // +4 total (each player +2)
      createTeam("Team A", -4, 140, [-2, -2]), // -4 total (each player -2)
      createTeam("Team B", 0, 144, [0, 0]),    // even total
    ];

    const result = processTeamResults(teams);

    expect(result[0].teamName).toBe("Team A"); // -4 (best)
    expect(result[1].teamName).toBe("Team B"); // 0
    expect(result[2].teamName).toBe("Team C"); // +4 (worst)
  });

  it("assigns positions correctly", () => {
    const teams: TeamResultInput[] = [
      createTeam("Team A", 0, 144, [0, 0]),
      createTeam("Team B", 2, 146, [1, 1]),
    ];

    const result = processTeamResults(teams);

    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
  });

  it("calculates ranking points based on total series teams", () => {
    const teams: TeamResultInput[] = [
      createTeam("Team A", -4, 140, [-2, -2]), // -4 total
      createTeam("Team B", 0, 144, [0, 0]),    // even
      createTeam("Team C", 2, 146, [1, 1]),    // +2
      createTeam("Team D", 4, 148, [2, 2]),    // +4
    ];

    // 10 teams in series: 1st = 12, 2nd = 10, 3rd = 8, 4th = 7
    const result = processTeamResults(teams, 10);

    expect(result[0].rankingPoints).toBe(12); // 10 + 2
    expect(result[1].rankingPoints).toBe(10); // 12 - 2
    expect(result[2].rankingPoints).toBe(8); // 10 - 2
    expect(result[3].rankingPoints).toBe(7); // 8 - 1
  });

  it("marks teams with hasResults correctly", () => {
    const validTeam = createTeam("Valid", 0, 144, [0, 0]);
    const invalidTeam = createTeam("Invalid", 0, -1, [-1000]); // -1000 sentinel = gave up

    const result = processTeamResults([validTeam, invalidTeam]);

    expect(result.find((t) => t.teamName === "Valid")?.hasResults).toBe(true);
    expect(result.find((t) => t.teamName === "Invalid")?.hasResults).toBe(false);
  });

  it("gives 0 points to teams without valid results", () => {
    const teams: TeamResultInput[] = [
      createTeam("Valid", 0, 144, [0, 0]),
      createTeam("Invalid", 0, -1, [-1000]), // -1000 sentinel = gave up
    ];

    const result = processTeamResults(teams);

    expect(result.find((t) => t.teamName === "Invalid")?.rankingPoints).toBe(0);
  });

  it("places invalid teams after valid teams", () => {
    const teams: TeamResultInput[] = [
      createTeam("Invalid", 0, -1, [-1000]), // -1000 sentinel = gave up
      createTeam("Valid", 10, 154, [5, 5]), // Worse score but valid
    ];

    const result = processTeamResults(teams);

    expect(result[0].teamName).toBe("Valid");
    expect(result[1].teamName).toBe("Invalid");
  });

  it("places teams with no scores after invalid teams", () => {
    const validTeam = createTeam("Valid", 0, 144, [0, 0]);
    // Invalid team: has one valid score AND one gave-up (-1)
    const invalidTeam: TeamResultInput = {
      teamName: "Invalid",
      relativeToPar: 0,
      totalShots: -1,
      participants: [
        { name: "P1", position: "M", totalShots: 72, relativeToPar: 0 }, // Valid score
        { name: "P2", position: "M", totalShots: -1, relativeToPar: 0 }, // Gave up
      ],
    };
    const noScoresTeam: TeamResultInput = {
      teamName: "No Scores",
      relativeToPar: 0,
      totalShots: 0,
      participants: [{ name: "P1", position: "M", totalShots: 0, relativeToPar: 0 }],
    };

    const result = processTeamResults([noScoresTeam, invalidTeam, validTeam]);

    expect(result[0].teamName).toBe("Valid");
    expect(result[1].teamName).toBe("Invalid");
    expect(result[2].teamName).toBe("No Scores");
  });

  it("ensures minimum 1 point for teams with results", () => {
    // Create many teams to push points calculation very low
    const teams: TeamResultInput[] = Array.from({ length: 20 }, (_, i) =>
      createTeam(`Team ${i}`, i, 144 + i, [i / 2, i / 2])
    );

    const result = processTeamResults(teams, 5); // Small series

    // Even last place with results should get at least 1 point
    const lastWithResults = result.filter((t) => t.hasResults).pop();
    expect(lastWithResults?.rankingPoints).toBeGreaterThanOrEqual(1);
  });

  describe("countback tie-breaking", () => {
    it("breaks tie using best individual score", () => {
      // Same team total, different individual scores
      const teamA = createTeam("Team A", 0, 144, [-2, 2]); // Best: -2
      const teamB = createTeam("Team B", 0, 144, [-1, 1]); // Best: -1

      const result = processTeamResults([teamA, teamB]);

      expect(result[0].teamName).toBe("Team A"); // -2 beats -1
      expect(result[1].teamName).toBe("Team B");
    });

    it("compares second best when first is tied", () => {
      const teamA = createTeam("Team A", 0, 144, [-2, 2]); // Best: -2, Second: 2
      const teamB = createTeam("Team B", 0, 144, [-2, 1]); // Best: -2, Second: 1

      const result = processTeamResults([teamA, teamB]);

      expect(result[0].teamName).toBe("Team B"); // Second score 1 beats 2
    });

    it("handles teams with different player counts", () => {
      const teamA = createTeam("Team A", 0, 72, [-1]); // One player at -1
      const teamB = createTeam("Team B", 0, 144, [0, 0]); // Two players at 0 each

      const result = processTeamResults([teamA, teamB]);

      expect(result[0].teamName).toBe("Team A"); // -1 beats 0
    });
  });
});

describe("isValidTeamResult", () => {
  it("returns true for valid team result", () => {
    const team: TeamResultInput = {
      teamName: "Team A",
      participants: [
        { name: "Player 1", position: "Captain", totalShots: 72, relativeToPar: 0 },
      ],
      totalShots: 72,
      relativeToPar: 0,
    };

    expect(isValidTeamResult(team)).toBe(true);
  });

  it("returns false for null/undefined", () => {
    expect(isValidTeamResult(null)).toBe(false);
    expect(isValidTeamResult(undefined)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(isValidTeamResult("string")).toBe(false);
    expect(isValidTeamResult(123)).toBe(false);
  });

  it("returns false for missing required properties", () => {
    expect(isValidTeamResult({ teamName: "A" })).toBe(false);
    expect(isValidTeamResult({ participants: [] })).toBe(false);
  });

  it("returns false for invalid participant structure", () => {
    const team = {
      teamName: "Team A",
      participants: [{ name: "Player 1" }], // Missing other props
      totalShots: 72,
      relativeToPar: 0,
    };

    expect(isValidTeamResult(team)).toBe(false);
  });

  it("returns false for wrong property types", () => {
    const team = {
      teamName: 123, // Should be string
      participants: [],
      totalShots: 72,
      relativeToPar: 0,
    };

    expect(isValidTeamResult(team)).toBe(false);
  });
});

describe("debugTeamRanking", () => {
  it("returns debug information array", () => {
    const teams = processTeamResults([
      {
        teamName: "Team A",
        participants: [
          { name: "P1", position: "C", totalShots: 72, relativeToPar: 0 },
        ],
        totalShots: 72,
        relativeToPar: 0,
      },
    ]);

    const debug = debugTeamRanking(teams, 5);

    expect(debug).toBeInstanceOf(Array);
    expect(debug.some((line) => line.includes("Team A"))).toBe(true);
    expect(debug.some((line) => line.includes("Total teams in series: 5"))).toBe(true);
  });

  it("shows individual scores in debug output", () => {
    const teams = processTeamResults([
      {
        teamName: "Team A",
        participants: [
          { name: "P1", position: "C", totalShots: 70, relativeToPar: -2 },
          { name: "P2", position: "M", totalShots: 74, relativeToPar: 2 },
        ],
        totalShots: 144,
        relativeToPar: 0,
      },
    ]);

    const debug = debugTeamRanking(teams);

    expect(debug.some((line) => line.includes("-2, 2"))).toBe(true);
  });
});
