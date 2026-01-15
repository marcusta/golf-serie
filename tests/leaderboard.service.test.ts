import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { LeaderboardService } from "../src/services/leaderboard.service";
import { GOLF } from "../src/constants/golf";
import {
  calculateHolesPlayed,
  calculateGrossScore,
  calculateRelativeToPar,
  hasInvalidHole,
  calculateScoreMetrics,
} from "../src/utils/golf-scoring";

describe("LeaderboardService", () => {
  let db: Database;
  let service: LeaderboardService;

  // Standard 18-hole par array (par 72)
  const standardPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
  const standardStrokeIndex = [1, 3, 17, 7, 5, 11, 15, 9, 13, 2, 4, 18, 8, 6, 12, 16, 10, 14];

  // Helper functions
  const createTestUser = (email: string, role: string = "PLAYER") => {
    return db
      .prepare(
        `INSERT INTO users (email, password_hash, role) VALUES (?, 'hash123', ?) RETURNING *`
      )
      .get(email, role) as { id: number; email: string; role: string };
  };

  const createTestPlayer = (name: string, userId?: number, handicap?: number) => {
    return db
      .prepare(`INSERT INTO players (name, user_id, handicap) VALUES (?, ?, ?) RETURNING *`)
      .get(name, userId || null, handicap ?? null) as { id: number; name: string };
  };

  const createTestCourse = (name: string, pars: number[], strokeIndex?: number[]) => {
    return db
      .prepare(`INSERT INTO courses (name, pars, stroke_index) VALUES (?, ?, ?) RETURNING *`)
      .get(name, JSON.stringify(pars), strokeIndex ? JSON.stringify(strokeIndex) : null) as {
      id: number;
      name: string;
    };
  };

  const createTestTee = (courseId: number, name: string, color?: string) => {
    return db
      .prepare(
        `INSERT INTO course_tees (course_id, name, color, course_rating, slope_rating)
         VALUES (?, ?, ?, 72.0, 113) RETURNING *`
      )
      .get(courseId, name, color || null) as { id: number; name: string };
  };

  const createTestTour = (
    name: string,
    ownerId: number,
    options: { pointTemplateId?: number; scoringMode?: string } = {}
  ) => {
    return db
      .prepare(
        `INSERT INTO tours (name, owner_id, enrollment_mode, visibility, point_template_id, scoring_mode)
         VALUES (?, ?, 'closed', 'public', ?, ?) RETURNING *`
      )
      .get(name, ownerId, options.pointTemplateId || null, options.scoringMode || "gross") as {
      id: number;
      name: string;
    };
  };

  const createTestCompetition = (
    name: string,
    date: string,
    courseId: number,
    options: {
      tourId?: number;
      teeId?: number;
      startMode?: string;
      openEnd?: string;
      pointsMultiplier?: number;
      isResultsFinal?: boolean;
    } = {}
  ) => {
    return db
      .prepare(
        `INSERT INTO competitions (name, date, course_id, tour_id, tee_id, start_mode, open_end, points_multiplier, is_results_final)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`
      )
      .get(
        name,
        date,
        courseId,
        options.tourId || null,
        options.teeId || null,
        options.startMode || "scheduled",
        options.openEnd || null,
        options.pointsMultiplier || 1,
        options.isResultsFinal ? 1 : 0
      ) as { id: number; name: string };
  };

  const createTestTeeTime = (competitionId: number, teetime: string) => {
    return db
      .prepare(
        `INSERT INTO tee_times (competition_id, teetime, start_hole) VALUES (?, ?, 1) RETURNING *`
      )
      .get(competitionId, teetime) as { id: number };
  };

  const createTestTeam = (name: string) => {
    return db
      .prepare(`INSERT INTO teams (name) VALUES (?) RETURNING *`)
      .get(name) as { id: number; name: string };
  };

  const createTestParticipant = (
    teeTimeId: number,
    teamId: number,
    playerId: number,
    options: {
      score?: number[];
      isLocked?: boolean;
      isDQ?: boolean;
      manualScoreTotal?: number;
      handicapIndex?: number;
    } = {}
  ) => {
    return db
      .prepare(
        `INSERT INTO participants (tee_time_id, team_id, player_id, tee_order, position_name, score, is_locked, is_dq, manual_score_total, handicap_index)
         VALUES (?, ?, ?, 1, 'Player', ?, ?, ?, ?, ?) RETURNING *`
      )
      .get(
        teeTimeId,
        teamId,
        playerId,
        JSON.stringify(options.score || []),
        options.isLocked ? 1 : 0,
        options.isDQ ? 1 : 0,
        options.manualScoreTotal ?? null,
        options.handicapIndex ?? null
      ) as { id: number; player_id: number };
  };

  const createEnrollment = (tourId: number, playerId: number, email: string) => {
    return db
      .prepare(
        `INSERT INTO tour_enrollments (tour_id, player_id, email, status) VALUES (?, ?, ?, 'active') RETURNING *`
      )
      .get(tourId, playerId, email) as { id: number };
  };

  // Create a complete 18-hole score (par = even par score)
  const createEvenParScore = () => [...standardPars];

  // Create score with specific relative to par
  const createScoreWithRelative = (relativeToPar: number) => {
    const score = [...standardPars];
    // Adjust first hole to get desired relative
    score[0] = standardPars[0] + relativeToPar;
    return score;
  };

  // Create partial score (only N holes played)
  const createPartialScore = (holesPlayed: number) => {
    const score = new Array(18).fill(0);
    for (let i = 0; i < holesPlayed && i < 18; i++) {
      score[i] = standardPars[i];
    }
    return score;
  };

  // Create score with unreported hole
  const createScoreWithUnreported = (unreportedHoleIndex: number) => {
    const score = createEvenParScore();
    score[unreportedHoleIndex] = GOLF.UNREPORTED_HOLE;
    return score;
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    service = new LeaderboardService(db);
  });

  afterEach(() => {
    db.close();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Golf Scoring Utility Tests (calculateHolesPlayed, calculateGrossScore, etc.)
  // ─────────────────────────────────────────────────────────────────────────────

  describe("Golf Scoring Utilities", () => {
    describe("calculateHolesPlayed", () => {
      test("should return 18 for complete round with all positive scores", () => {
        const scores = createEvenParScore();
        expect(calculateHolesPlayed(scores)).toBe(18);
      });

      test("should return 0 for empty score array", () => {
        expect(calculateHolesPlayed([])).toBe(0);
      });

      test("should return 0 for all zeros", () => {
        const scores = new Array(18).fill(0);
        expect(calculateHolesPlayed(scores)).toBe(0);
      });

      test("should count holes with positive scores only", () => {
        const scores = [4, 3, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(calculateHolesPlayed(scores)).toBe(3);
      });

      test("should count UNREPORTED_HOLE (-1) as played", () => {
        const scores = [4, 3, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(calculateHolesPlayed(scores)).toBe(3);
      });

      test("should count mix of positive and UNREPORTED_HOLE correctly", () => {
        const scores = [4, -1, 5, -1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(calculateHolesPlayed(scores)).toBe(5);
      });

      test("should return 9 for front nine only", () => {
        const scores = createPartialScore(9);
        expect(calculateHolesPlayed(scores)).toBe(9);
      });

      test("should handle full round with one UNREPORTED_HOLE", () => {
        const scores = createScoreWithUnreported(5);
        expect(calculateHolesPlayed(scores)).toBe(18);
      });
    });

    describe("calculateGrossScore", () => {
      test("should sum all positive scores for complete round", () => {
        const scores = createEvenParScore();
        expect(calculateGrossScore(scores)).toBe(72);
      });

      test("should return 0 for empty array", () => {
        expect(calculateGrossScore([])).toBe(0);
      });

      test("should return 0 for all zeros", () => {
        const scores = new Array(18).fill(0);
        expect(calculateGrossScore(scores)).toBe(0);
      });

      test("should ignore negative scores (UNREPORTED_HOLE)", () => {
        const scores = [4, 3, -1, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(calculateGrossScore(scores)).toBe(12); // 4 + 3 + 5
      });

      test("should calculate partial round correctly", () => {
        const scores = createPartialScore(9);
        // Front nine of standard pars: 4+4+3+5+4+4+3+5+4 = 36
        expect(calculateGrossScore(scores)).toBe(36);
      });

      test("should handle high scores (bogeys)", () => {
        const scores = standardPars.map((p) => p + 1); // All bogeys
        expect(calculateGrossScore(scores)).toBe(90); // 72 + 18
      });

      test("should handle low scores (birdies)", () => {
        const scores = standardPars.map((p) => p - 1); // All birdies
        expect(calculateGrossScore(scores)).toBe(54); // 72 - 18
      });
    });

    describe("calculateRelativeToPar", () => {
      test("should return 0 for even par round", () => {
        const scores = createEvenParScore();
        expect(calculateRelativeToPar(scores, standardPars)).toBe(0);
      });

      test("should return positive for over par", () => {
        const scores = createScoreWithRelative(5);
        expect(calculateRelativeToPar(scores, standardPars)).toBe(5);
      });

      test("should return negative for under par", () => {
        const scores = createScoreWithRelative(-3);
        expect(calculateRelativeToPar(scores, standardPars)).toBe(-3);
      });

      test("should return 0 for empty arrays", () => {
        expect(calculateRelativeToPar([], [])).toBe(0);
      });

      test("should calculate partial round correctly", () => {
        const scores = [5, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        // Holes 1-3: 5-4=1, 5-4=1, 4-3=1 = +3
        expect(calculateRelativeToPar(scores, standardPars)).toBe(3);
      });

      test("should ignore unplayed holes (0 scores)", () => {
        const scores = [4, 4, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        expect(calculateRelativeToPar(scores, standardPars)).toBe(0); // 4-4 + 4-4 + 3-3 = 0
      });

      test("should handle mismatched array lengths gracefully", () => {
        const scores = [5, 5, 5];
        const pars = [4, 4, 4, 4, 4]; // More pars than scores
        expect(calculateRelativeToPar(scores, pars)).toBe(3);
      });
    });

    describe("hasInvalidHole", () => {
      test("should return false for valid complete round", () => {
        const scores = createEvenParScore();
        expect(hasInvalidHole(scores)).toBe(false);
      });

      test("should return false for empty array", () => {
        expect(hasInvalidHole([])).toBe(false);
      });

      test("should return true when UNREPORTED_HOLE present", () => {
        const scores = createScoreWithUnreported(5);
        expect(hasInvalidHole(scores)).toBe(true);
      });

      test("should return true for multiple UNREPORTED_HOLE", () => {
        const scores = [4, -1, 5, -1, 4, -1, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
        expect(hasInvalidHole(scores)).toBe(true);
      });

      test("should return false for zeros (unplayed)", () => {
        const scores = createPartialScore(9);
        expect(hasInvalidHole(scores)).toBe(false);
      });
    });

    describe("calculateScoreMetrics", () => {
      test("should return all metrics for complete round", () => {
        const scores = createEvenParScore();
        const metrics = calculateScoreMetrics(scores, standardPars);

        expect(metrics.holesPlayed).toBe(18);
        expect(metrics.grossScore).toBe(72);
        expect(metrics.relativeToPar).toBe(0);
        expect(metrics.hasInvalidHole).toBe(false);
      });

      test("should return all metrics for partial round", () => {
        const scores = createPartialScore(9);
        const metrics = calculateScoreMetrics(scores, standardPars);

        expect(metrics.holesPlayed).toBe(9);
        expect(metrics.grossScore).toBe(36);
        expect(metrics.relativeToPar).toBe(0);
        expect(metrics.hasInvalidHole).toBe(false);
      });

      test("should detect invalid hole in metrics", () => {
        const scores = createScoreWithUnreported(10);
        const metrics = calculateScoreMetrics(scores, standardPars);

        expect(metrics.holesPlayed).toBe(18);
        expect(metrics.hasInvalidHole).toBe(true);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Leaderboard Service Integration Tests
  // ─────────────────────────────────────────────────────────────────────────────

  describe("getLeaderboard", () => {
    test("should return empty array for competition with no participants", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard).toEqual([]);
    });

    test("should throw error for non-existent competition", async () => {
      await expect(service.getLeaderboard(999)).rejects.toThrow("Competition not found");
    });

    test("should return single participant entry", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Test Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].totalShots).toBe(72);
      expect(leaderboard[0].holesPlayed).toBe(18);
      expect(leaderboard[0].relativeToPar).toBe(0);
    });

    test("should sort participants by relative to par (ascending)", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Over Par");
      const player2 = createTestPlayer("Under Par");
      const player3 = createTestPlayer("Even Par");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(5),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(-3),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].relativeToPar).toBe(-3); // Under par first
      expect(leaderboard[1].relativeToPar).toBe(0); // Even par second
      expect(leaderboard[2].relativeToPar).toBe(5); // Over par last
    });

    test("should place DQ players at the bottom", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Normal Player");
      const player2 = createTestPlayer("DQ Player");
      const player3 = createTestPlayer("Another Normal");

      // DQ player has best score but should be at bottom
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(-10),
        isLocked: true,
        isDQ: true,
      });
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(5),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(3),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].participant.is_dq).toBe(false);
      expect(leaderboard[1].participant.is_dq).toBe(false);
      expect(leaderboard[2].participant.is_dq).toBe(true);
    });

    test("should handle participants with no scores", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("No Score Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: [],
      });

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].holesPlayed).toBe(0);
      expect(leaderboard[0].totalShots).toBe(0);
    });

    test("should handle participants with partial scores", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Partial Score Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createPartialScore(9),
      });

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].holesPlayed).toBe(9);
      expect(leaderboard[0].totalShots).toBe(36);
    });

    test("should handle manual scores correctly", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Manual Score Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: [],
        manualScoreTotal: 78,
      });

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard).toHaveLength(1);
      expect(leaderboard[0].totalShots).toBe(78);
      expect(leaderboard[0].holesPlayed).toBe(18);
      expect(leaderboard[0].relativeToPar).toBe(6); // 78 - 72 = 6
    });
  });

  describe("getLeaderboardWithDetails", () => {
    test("should return competition metadata", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars, standardStrokeIndex);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });

      const response = await service.getLeaderboardWithDetails(competition.id);

      expect(response.competitionId).toBe(competition.id);
      expect(response.isTourCompetition).toBe(true);
      expect(response.scoringMode).toBe("gross");
    });

    test("should include tee information when tee assigned", async () => {
      const course = createTestCourse("Test Course", standardPars, standardStrokeIndex);
      const tee = createTestTee(course.id, "White Tees", "white");
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        teeId: tee.id,
      });

      const response = await service.getLeaderboardWithDetails(competition.id);

      expect(response.tee).toBeDefined();
      expect(response.tee?.name).toBe("White Tees");
    });

    test("should return isResultsFinal flag", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        isResultsFinal: true,
      });

      const response = await service.getLeaderboardWithDetails(competition.id);
      expect(response.isResultsFinal).toBe(true);
    });
  });

  describe("Leaderboard with Ties", () => {
    test("should maintain tie order by score", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");

      // All three tied at even par
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // All should have same relative to par
      expect(leaderboard[0].relativeToPar).toBe(0);
      expect(leaderboard[1].relativeToPar).toBe(0);
      expect(leaderboard[2].relativeToPar).toBe(0);
    });

    test("should assign same position to tied players", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");

      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");
      createEnrollment(tour.id, player3.id, "charlie@test.com");

      // All three tied at even par
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // All tied players should have position 1
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].position).toBe(1);
      expect(leaderboard[2].position).toBe(1);
    });

    test("should gap positions correctly after ties (1,1,3 not 1,1,2)", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");

      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");
      createEnrollment(tour.id, player3.id, "charlie@test.com");

      // Two players tied at -2, one player at +3
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-2), // 70
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(-2), // 70
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(3), // 75
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // First two should be position 1 (tied)
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].position).toBe(1);
      // Third should be position 3, not 2 (gap after tie)
      expect(leaderboard[2].position).toBe(3);
    });

    test("should handle multiple tie groups correctly", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");
      const player4 = createTestPlayer("David");
      const player5 = createTestPlayer("Eve");

      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");
      createEnrollment(tour.id, player3.id, "charlie@test.com");
      createEnrollment(tour.id, player4.id, "david@test.com");
      createEnrollment(tour.id, player5.id, "eve@test.com");

      // Two players at -2, two players at +1, one player at +5
      // Expected positions: 1, 1, 3, 3, 5
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(1),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player4.id, {
        score: createScoreWithRelative(1),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player5.id, {
        score: createScoreWithRelative(5),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // First two tied at position 1
      expect(leaderboard[0].relativeToPar).toBe(-2);
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].relativeToPar).toBe(-2);
      expect(leaderboard[1].position).toBe(1);
      // Next two tied at position 3 (after the two T1s)
      expect(leaderboard[2].relativeToPar).toBe(1);
      expect(leaderboard[2].position).toBe(3);
      expect(leaderboard[3].relativeToPar).toBe(1);
      expect(leaderboard[3].position).toBe(3);
      // Last player at position 5
      expect(leaderboard[4].relativeToPar).toBe(5);
      expect(leaderboard[4].position).toBe(5);
    });

    test("should handle single player with no ties", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");

      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");
      createEnrollment(tour.id, player3.id, "charlie@test.com");

      // All different scores - no ties
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-3),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(2),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // Sequential positions with no ties
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].position).toBe(2);
      expect(leaderboard[2].position).toBe(3);
    });

    test("should not assign positions to DQ players in tie calculations", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("DQPlayer");

      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");
      createEnrollment(tour.id, player3.id, "dq@test.com");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(3),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(-5), // Best score but DQ
        isLocked: true,
        isDQ: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // Non-DQ players get positions
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].position).toBe(2);
      // DQ player at bottom with position 0 (excluded from ranking)
      expect(leaderboard[2].participant.is_dq).toBe(true);
      expect(leaderboard[2].position).toBe(0);
    });

    test("should not assign positions to DNF players in tie calculations", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
        startMode: "open",
        openEnd: pastDate,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Finished1");
      const player2 = createTestPlayer("Finished2");
      const player3 = createTestPlayer("DNFPlayer");

      createEnrollment(tour.id, player1.id, "f1@test.com");
      createEnrollment(tour.id, player2.id, "f2@test.com");
      createEnrollment(tour.id, player3.id, "dnf@test.com");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(2),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createPartialScore(12), // Did not finish
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // Finished players get sequential positions
      expect(leaderboard[0].position).toBe(1);
      expect(leaderboard[1].position).toBe(2);
      // DNF player gets position 0 (excluded from ranking)
      expect(leaderboard[2].isDNF).toBe(true);
      expect(leaderboard[2].position).toBe(0);
    });
  });

  describe("DNF (Did Not Finish) handling", () => {
    test("should mark incomplete rounds as DNF when competition window closed", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        startMode: "open",
        openEnd: pastDate,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Incomplete Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createPartialScore(9),
      });

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard[0].isDNF).toBe(true);
    });

    test("should not mark incomplete rounds as DNF when competition still open", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        startMode: "open",
        openEnd: futureDate,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("In Progress Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createPartialScore(9),
      });

      const leaderboard = await service.getLeaderboard(competition.id);
      expect(leaderboard[0].isDNF).toBe(false);
    });

    test("should sort DNF players below finished players but above DQ", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        startMode: "open",
        openEnd: pastDate,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const finishedPlayer = createTestPlayer("Finished");
      const dnfPlayer = createTestPlayer("DNF");
      const dqPlayer = createTestPlayer("DQ");

      createTestParticipant(teeTime.id, team.id, finishedPlayer.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, dnfPlayer.id, {
        score: createPartialScore(12),
      });
      createTestParticipant(teeTime.id, team.id, dqPlayer.id, {
        score: createEvenParScore(),
        isLocked: true,
        isDQ: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].isDNF).toBe(false);
      expect(leaderboard[0].participant.is_dq).toBe(false);
      expect(leaderboard[1].isDNF).toBe(true);
      expect(leaderboard[2].participant.is_dq).toBe(true);
    });
  });

  describe("Net Scoring", () => {
    test("should calculate net scores when handicap available", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars, standardStrokeIndex);
      const tee = createTestTee(course.id, "White Tees", "white");
      const tour = createTestTour("Test Tour", user.id, { scoringMode: "net" });
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
        teeId: tee.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Handicap Player", undefined, 10);

      createEnrollment(tour.id, player.id, "player@test.com");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createScoreWithRelative(10), // 82 gross
        isLocked: true,
        handicapIndex: 10,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].totalShots).toBe(82);
      expect(leaderboard[0].courseHandicap).toBeDefined();
      expect(leaderboard[0].netTotalShots).toBeDefined();
    });

    test("should not calculate net scores for gross-only tour", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id, { scoringMode: "gross" });
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Player");

      createEnrollment(tour.id, player.id, "player@test.com");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
        handicapIndex: 10,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].netTotalShots).toBeUndefined();
      expect(leaderboard[0].netRelativeToPar).toBeUndefined();
    });
  });

  describe("Points Calculation", () => {
    test("should calculate projected points for tour competition", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("First");
      const player2 = createTestPlayer("Second");

      createEnrollment(tour.id, player1.id, "p1@test.com");
      createEnrollment(tour.id, player2.id, "p2@test.com");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(2),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].points).toBeGreaterThan(0);
      expect(leaderboard[0].points).toBeGreaterThan(leaderboard[1].points!);
      expect(leaderboard[0].isProjected).toBe(true);
    });

    test("should not assign points to non-tour competition", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      expect(leaderboard[0].points).toBeUndefined();
    });

    test("should apply points multiplier", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
        pointsMultiplier: 2,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Player");

      createEnrollment(tour.id, player.id, "player@test.com");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      const leaderboard = await service.getLeaderboard(competition.id);

      // Points should be doubled
      expect(leaderboard[0].points).toBeDefined();
      // With 1 player and 2x multiplier: 1+2=3 * 2 = 6
      expect(leaderboard[0].points).toBe(6);
    });
  });

  describe("Team Leaderboard", () => {
    test("should return empty array for competition with no teams", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);

      const teamLeaderboard = await service.getTeamLeaderboard(competition.id);
      expect(teamLeaderboard).toEqual([]);
    });

    test("should aggregate team scores correctly", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Player 1");
      const player2 = createTestPlayer("Player 2");

      // Player 1: even par
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      // Player 2: +5
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(5),
        isLocked: true,
      });

      const teamLeaderboard = await service.getTeamLeaderboard(competition.id);

      expect(teamLeaderboard).toHaveLength(1);
      expect(teamLeaderboard[0].teamName).toBe("Team A");
      expect(teamLeaderboard[0].totalRelativeScore).toBe(5); // 0 + 5
      expect(teamLeaderboard[0].totalShots).toBe(149); // 72 + 77
    });

    test("should sort teams by total relative score", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");

      const teamA = createTestTeam("Team A");
      const teamB = createTestTeam("Team B");

      const playerA = createTestPlayer("Player A");
      const playerB = createTestPlayer("Player B");

      // Team A: +10
      createTestParticipant(teeTime.id, teamA.id, playerA.id, {
        score: createScoreWithRelative(10),
        isLocked: true,
      });
      // Team B: -2
      createTestParticipant(teeTime.id, teamB.id, playerB.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });

      const teamLeaderboard = await service.getTeamLeaderboard(competition.id);

      expect(teamLeaderboard[0].teamName).toBe("Team B");
      expect(teamLeaderboard[1].teamName).toBe("Team A");
    });

    test("should handle teams with players who have not started", async () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "10:00");
      const team = createTestTeam("Not Started Team");
      const player = createTestPlayer("Waiting Player");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: [], // Not started
      });

      const teamLeaderboard = await service.getTeamLeaderboard(competition.id);

      expect(teamLeaderboard[0].status).toBe("NOT_STARTED");
      expect(teamLeaderboard[0].totalRelativeScore).toBeNull();
    });
  });
});
