import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import {
  CompetitionResultsService,
  createCompetitionResultsService,
} from "../src/services/competition-results.service";
import { PointTemplateService } from "../src/services/point-template.service";

describe("CompetitionResultsService", () => {
  let db: Database;
  let service: CompetitionResultsService;
  let pointTemplateService: PointTemplateService;

  // Standard 18-hole par array (par 72)
  const standardPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

  // Helper functions
  const createTestUser = (email: string, role: string = "PLAYER") => {
    return db
      .prepare(
        `INSERT INTO users (email, password_hash, role) VALUES (?, 'hash123', ?) RETURNING *`
      )
      .get(email, role) as { id: number; email: string; role: string };
  };

  const createTestPlayer = (name: string, userId?: number) => {
    return db
      .prepare(`INSERT INTO players (name, user_id) VALUES (?, ?) RETURNING *`)
      .get(name, userId || null) as { id: number; name: string };
  };

  const createTestCourse = (name: string, pars: number[]) => {
    return db
      .prepare(`INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *`)
      .get(name, JSON.stringify(pars)) as { id: number; name: string };
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
      startMode?: string;
      openEnd?: string;
      pointsMultiplier?: number;
    } = {}
  ) => {
    return db
      .prepare(
        `INSERT INTO competitions (name, date, course_id, tour_id, start_mode, open_end, points_multiplier)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
      )
      .get(
        name,
        date,
        courseId,
        options.tourId || null,
        options.startMode || "scheduled",
        options.openEnd || null,
        options.pointsMultiplier || 1
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

  const createEnrollment = (
    tourId: number,
    playerId: number,
    email: string
  ) => {
    return db
      .prepare(
        `INSERT INTO tour_enrollments (tour_id, player_id, email, status) VALUES (?, ?, ?, 'active') RETURNING *`
      )
      .get(tourId, playerId, email) as { id: number };
  };

  const createPointTemplate = (
    name: string,
    structure: Record<string, number>
  ) => {
    return db
      .prepare(
        `INSERT INTO point_templates (name, points_structure, created_by) VALUES (?, ?, 1) RETURNING *`
      )
      .get(name, JSON.stringify(structure)) as { id: number; name: string };
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

  beforeEach(async () => {
    db = await createTestDatabase();
    service = createCompetitionResultsService(db);
    pointTemplateService = new PointTemplateService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("finalizeCompetitionResults", () => {
    test("should throw error for non-existent competition", () => {
      expect(() => service.finalizeCompetitionResults(999)).toThrow(
        "Competition not found"
      );
    });

    test("should finalize competition with no participants", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);

      // Should not throw
      service.finalizeCompetitionResults(competition.id);

      expect(service.isCompetitionFinalized(competition.id)).toBe(true);
      expect(service.getCompetitionResults(competition.id)).toEqual([]);
    });

    test("should calculate results for finished participants with hole-by-hole scores", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Player One");
      const player2 = createTestPlayer("Player Two");

      createEnrollment(tour.id, player1.id, "player1@test.com");
      createEnrollment(tour.id, player2.id, "player2@test.com");

      // Player 1: even par (72), locked
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      // Player 2: +2 (74), locked
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(2),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(2);

      // Player 1 should be first (even par)
      expect(results[0].position).toBe(1);
      expect(results[0].relative_to_par).toBe(0);
      expect(results[0].gross_score).toBe(72);

      // Player 2 should be second (+2)
      expect(results[1].position).toBe(2);
      expect(results[1].relative_to_par).toBe(2);
      expect(results[1].gross_score).toBe(74);
    });

    test("should handle tied positions correctly", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");

      // All three players with same score
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(1),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(3);

      // Alice and Bob tied at position 1
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(1);
      // Charlie at position 3 (not 2, because there are two players ahead)
      expect(results[2].position).toBe(3);
    });

    test("should average points for tied players", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      // Create 5 players (default formula: 1st=n+2=7, 2nd=n=5, 3rd=n-2=3, 4th=n-3=2, 5th=n-4=1)
      const player1 = createTestPlayer("First");
      const player2 = createTestPlayer("TiedA");
      const player3 = createTestPlayer("TiedB");
      const player4 = createTestPlayer("TiedC");
      const player5 = createTestPlayer("Last");

      // Player 1: Best score (wins outright)
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });

      // Players 2, 3, 4: All tied for 2nd place
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player4.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      // Player 5: Worst score
      createTestParticipant(teeTime.id, team.id, player5.id, {
        score: createScoreWithRelative(5),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(5);

      // Find results by player
      const result1 = results.find(r => r.player_id === player1.id)!;
      const result2 = results.find(r => r.player_id === player2.id)!;
      const result3 = results.find(r => r.player_id === player3.id)!;
      const result4 = results.find(r => r.player_id === player4.id)!;
      const result5 = results.find(r => r.player_id === player5.id)!;

      // Player 1: Position 1, gets 1st place points (7 with 5 players)
      expect(result1.position).toBe(1);
      expect(result1.points).toBe(7);

      // Players 2,3,4: All position 2, get averaged points for positions 2,3,4
      // With 5 players: 2nd=5, 3rd=3, 4th=2 → average = (5+3+2)/3 = 3.33 → rounds to 3
      expect(result2.position).toBe(2);
      expect(result3.position).toBe(2);
      expect(result4.position).toBe(2);
      expect(result2.points).toBe(3);
      expect(result3.points).toBe(3);
      expect(result4.points).toBe(3);

      // Player 5: Position 5 (after three 2nd places), gets 5th place points (1)
      expect(result5.position).toBe(5);
      expect(result5.points).toBe(1);

      // Verify total points distributed
      // Without ties: 7 + 5 + 3 + 2 + 1 = 18
      // With averaging and rounding: 7 + 3 + 3 + 3 + 1 = 17
      const totalPoints = results.reduce((sum, r) => sum + r.points, 0);
      expect(totalPoints).toBe(7 + 3 + 3 + 3 + 1); // 17
    });

    test("should exclude DQ players from results", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Normal Player");
      const player2 = createTestPlayer("DQ Player");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
        isDQ: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(1);
      expect(results[0].player_id).toBe(player1.id);
    });

    test("should exclude unlocked participants in scheduled competitions", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        startMode: "scheduled",
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Locked Player");
      const player2 = createTestPlayer("Unlocked Player");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: false,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(1);
      expect(results[0].player_id).toBe(player1.id);
    });

    test("should include unlocked participants in closed open competitions", () => {
      const course = createTestCourse("Test Course", standardPars);
      // Open competition that has ended
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        startMode: "open",
        openEnd: pastDate,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Unlocked Player");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: false,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(1);
    });

    test("should handle manual scores correctly", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Manual Score Player");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: [], // No hole-by-hole score
        manualScoreTotal: 75,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(1);
      expect(results[0].gross_score).toBe(75);
      expect(results[0].relative_to_par).toBe(3); // 75 - 72 = 3
    });

    test("should exclude participants with incomplete scores", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Complete Player");
      const player2 = createTestPlayer("Incomplete Player");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      // Only 9 holes played
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: [4, 4, 3, 5, 4, 4, 3, 5, 4],
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(1);
      expect(results[0].player_id).toBe(player1.id);
    });

    test("should exclude participants with invalid holes (-1)", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Invalid Hole Player");
      const scoreWithInvalid = createEvenParScore();
      scoreWithInvalid[5] = -1; // Mark hole 6 as invalid

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: scoreWithInvalid,
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toHaveLength(0);
    });

    test("should assign points using default formula when no template", () => {
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
      const player3 = createTestPlayer("Third");

      createEnrollment(tour.id, player1.id, "p1@test.com");
      createEnrollment(tour.id, player2.id, "p2@test.com");
      createEnrollment(tour.id, player3.id, "p3@test.com");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(0),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(2),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      // Default formula: 1st = n+2, 2nd = n, 3rd+ = n-(pos-1)
      // With 3 players: 1st = 5, 2nd = 3, 3rd = 1
      expect(results[0].points).toBe(5);
      expect(results[1].points).toBe(3);
      expect(results[2].points).toBe(1);
    });

    test("should apply points multiplier", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
        tourId: tour.id,
        pointsMultiplier: 2,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Winner");
      createEnrollment(tour.id, player.id, "winner@test.com");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      // 1 player: 1st = 1+2 = 3, with 2x multiplier = 6
      expect(results[0].points).toBe(6);
    });

    test("should use point template when provided", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const template = createPointTemplate("Custom Template", {
        "1": 100,
        "2": 50,
        "3": 25,
        default: 10,
      });
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id, { pointTemplateId: template.id });
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
        score: createScoreWithRelative(-1),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(1),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results[0].points).toBe(100);
      expect(results[1].points).toBe(50);
    });

    test("should calculate net score when handicap is available", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Handicap Player");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createScoreWithRelative(10), // 82 gross
        isLocked: true,
        handicapIndex: 10.5,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results[0].gross_score).toBe(82);
      expect(results[0].net_score).toBe(71); // 82 - round(10.5) = 82 - 11 = 71
    });

    test("should clear existing results before storing new ones", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Player");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      // Finalize twice
      service.finalizeCompetitionResults(competition.id);
      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      // Should only have 1 result, not duplicated
      expect(results).toHaveLength(1);
    });

    describe("net scoring mode", () => {
      test("should store net results when tour scoring_mode is 'both'", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "both" });
        const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(competition.id, "08:00");
        const team = createTestTeam("Team A");

        const player = createTestPlayer("Player");
        createEnrollment(tour.id, player.id, "player@test.com");
        createTestParticipant(teeTime.id, team.id, player.id, {
          score: createScoreWithRelative(10), // 82 gross
          isLocked: true,
          handicapIndex: 10,
        });

        service.finalizeCompetitionResults(competition.id);

        const grossResults = service.getCompetitionResults(competition.id, "gross");
        const netResults = service.getCompetitionResults(competition.id, "net");

        expect(grossResults).toHaveLength(1);
        expect(netResults).toHaveLength(1);
        expect(grossResults[0].gross_score).toBe(82);
        expect(netResults[0].net_score).toBe(72); // 82 - 10 = 72
      });

      test("should store net results when tour scoring_mode is 'net'", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "net" });
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
          handicapIndex: 5,
        });

        service.finalizeCompetitionResults(competition.id);

        const netResults = service.getCompetitionResults(competition.id, "net");
        expect(netResults).toHaveLength(1);
      });

      test("should rank players by net score in net results", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "both" });
        const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(competition.id, "08:00");
        const team = createTestTeam("Team A");

        // Player 1: 82 gross, handicap 15 = 67 net
        const player1 = createTestPlayer("High Handicapper");
        createEnrollment(tour.id, player1.id, "p1@test.com");
        createTestParticipant(teeTime.id, team.id, player1.id, {
          score: createScoreWithRelative(10), // 82 gross
          isLocked: true,
          handicapIndex: 15,
        });

        // Player 2: 72 gross, handicap 0 = 72 net
        const player2 = createTestPlayer("Scratch Golfer");
        createEnrollment(tour.id, player2.id, "p2@test.com");
        createTestParticipant(teeTime.id, team.id, player2.id, {
          score: createEvenParScore(), // 72 gross
          isLocked: true,
          handicapIndex: 0,
        });

        service.finalizeCompetitionResults(competition.id);

        // Gross rankings: Scratch Golfer 1st (72), High Handicapper 2nd (82)
        const grossResults = service.getCompetitionResults(competition.id, "gross");
        expect(grossResults[0].player_id).toBe(player2.id);
        expect(grossResults[0].position).toBe(1);
        expect(grossResults[1].player_id).toBe(player1.id);
        expect(grossResults[1].position).toBe(2);

        // Net rankings: High Handicapper 1st (67), Scratch Golfer 2nd (72)
        const netResults = service.getCompetitionResults(competition.id, "net");
        expect(netResults[0].player_id).toBe(player1.id);
        expect(netResults[0].position).toBe(1);
        expect(netResults[1].player_id).toBe(player2.id);
        expect(netResults[1].position).toBe(2);
      });

      test("should exclude players without handicap from net results", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "both" });
        const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(competition.id, "08:00");
        const team = createTestTeam("Team A");

        // Player with handicap
        const player1 = createTestPlayer("With Handicap");
        createEnrollment(tour.id, player1.id, "p1@test.com");
        createTestParticipant(teeTime.id, team.id, player1.id, {
          score: createEvenParScore(),
          isLocked: true,
          handicapIndex: 10,
        });

        // Player without handicap
        const player2 = createTestPlayer("No Handicap");
        createEnrollment(tour.id, player2.id, "p2@test.com");
        createTestParticipant(teeTime.id, team.id, player2.id, {
          score: createEvenParScore(),
          isLocked: true,
          // No handicapIndex
        });

        service.finalizeCompetitionResults(competition.id);

        const grossResults = service.getCompetitionResults(competition.id, "gross");
        const netResults = service.getCompetitionResults(competition.id, "net");

        // Both appear in gross
        expect(grossResults).toHaveLength(2);
        // Only player with handicap in net
        expect(netResults).toHaveLength(1);
        expect(netResults[0].player_id).toBe(player1.id);
      });

      test("should calculate correct net relative_to_par", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "both" });
        const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(competition.id, "08:00");
        const team = createTestTeam("Team A");

        // 82 gross with 10 handicap = 72 net = even par
        const player = createTestPlayer("Player");
        createEnrollment(tour.id, player.id, "player@test.com");
        createTestParticipant(teeTime.id, team.id, player.id, {
          score: createScoreWithRelative(10), // 82 gross
          isLocked: true,
          handicapIndex: 10,
        });

        service.finalizeCompetitionResults(competition.id);

        const grossResults = service.getCompetitionResults(competition.id, "gross");
        const netResults = service.getCompetitionResults(competition.id, "net");

        expect(grossResults[0].relative_to_par).toBe(10); // +10 gross
        expect(netResults[0].relative_to_par).toBe(0); // even par net (72 - 72)
      });

      test("should assign correct points in net standings", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "both" });
        const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(competition.id, "08:00");
        const team = createTestTeam("Team A");

        const player1 = createTestPlayer("First Net");
        const player2 = createTestPlayer("Second Net");

        createEnrollment(tour.id, player1.id, "p1@test.com");
        createEnrollment(tour.id, player2.id, "p2@test.com");

        // Player 1: 80 gross, 15 handicap = 65 net (wins net)
        createTestParticipant(teeTime.id, team.id, player1.id, {
          score: createScoreWithRelative(8),
          isLocked: true,
          handicapIndex: 15,
        });

        // Player 2: 72 gross, 0 handicap = 72 net (wins gross)
        createTestParticipant(teeTime.id, team.id, player2.id, {
          score: createEvenParScore(),
          isLocked: true,
          handicapIndex: 0,
        });

        service.finalizeCompetitionResults(competition.id);

        const netResults = service.getCompetitionResults(competition.id, "net");

        // With 2 enrolled players: 1st = 4 points, 2nd = 2 points
        expect(netResults[0].player_id).toBe(player1.id);
        expect(netResults[0].points).toBe(4); // 1st place
        expect(netResults[1].player_id).toBe(player2.id);
        expect(netResults[1].points).toBe(2); // 2nd place
      });

      test("should handle ties in net results correctly", () => {
        const user = createTestUser("owner@test.com", "ADMIN");
        const course = createTestCourse("Test Course", standardPars);
        const tour = createTestTour("Test Tour", user.id, { scoringMode: "both" });
        const competition = createTestCompetition("Test Comp", "2024-01-15", course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(competition.id, "08:00");
        const team = createTestTeam("Team A");

        // Both players end up with 70 net
        const player1 = createTestPlayer("Alice");
        const player2 = createTestPlayer("Bob");

        createEnrollment(tour.id, player1.id, "p1@test.com");
        createEnrollment(tour.id, player2.id, "p2@test.com");

        // Alice: 80 gross, 10 handicap = 70 net
        createTestParticipant(teeTime.id, team.id, player1.id, {
          score: createScoreWithRelative(8),
          isLocked: true,
          handicapIndex: 10,
        });

        // Bob: 75 gross, 5 handicap = 70 net
        createTestParticipant(teeTime.id, team.id, player2.id, {
          score: createScoreWithRelative(3),
          isLocked: true,
          handicapIndex: 5,
        });

        service.finalizeCompetitionResults(competition.id);

        const netResults = service.getCompetitionResults(competition.id, "net");

        // Both should be tied at position 1
        expect(netResults[0].position).toBe(1);
        expect(netResults[1].position).toBe(1);
        expect(netResults[0].net_score).toBe(70);
        expect(netResults[1].net_score).toBe(70);
      });
    });
  });

  describe("isCompetitionFinalized", () => {
    test("should return false for non-finalized competition", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);

      expect(service.isCompetitionFinalized(competition.id)).toBe(false);
    });

    test("should return true after finalization", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);

      service.finalizeCompetitionResults(competition.id);

      expect(service.isCompetitionFinalized(competition.id)).toBe(true);
    });

    test("should return false for non-existent competition", () => {
      expect(service.isCompetitionFinalized(999)).toBe(false);
    });
  });

  describe("getCompetitionResults", () => {
    test("should return empty array for competition with no results", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results).toEqual([]);
    });

    test("should return results ordered by position", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Third Place");
      const player2 = createTestPlayer("First Place");
      const player3 = createTestPlayer("Second Place");

      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(5),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(0),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getCompetitionResults(competition.id);
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(2);
      expect(results[2].position).toBe(3);
    });

    test("should filter by scoring type - gross only tour", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Player");
      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      // Gross-only tour should not store net results
      const grossResults = service.getCompetitionResults(competition.id, "gross");
      const netResults = service.getCompetitionResults(competition.id, "net");

      expect(grossResults).toHaveLength(1);
      expect(netResults).toHaveLength(0);
    });
  });

  describe("recalculateResults", () => {
    test("should recalculate results after score update", () => {
      const course = createTestCourse("Test Course", standardPars);
      const competition = createTestCompetition("Test Comp", "2024-01-15", course.id);
      const teeTime = createTestTeeTime(competition.id, "08:00");
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Player");
      const participant = createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      let results = service.getCompetitionResults(competition.id);
      expect(results[0].gross_score).toBe(72);

      // Update participant score
      db.prepare(`UPDATE participants SET score = ? WHERE id = ?`).run(
        JSON.stringify(createScoreWithRelative(5)),
        participant.id
      );

      service.recalculateResults(competition.id);

      results = service.getCompetitionResults(competition.id);
      expect(results[0].gross_score).toBe(77);
    });
  });

  describe("getPlayerResults", () => {
    test("should return empty array for player with no results", () => {
      const player = createTestPlayer("New Player");
      const results = service.getPlayerResults(player.id);
      expect(results).toEqual([]);
    });

    test("should return results across multiple competitions", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Multi Comp Player");

      createEnrollment(tour.id, player.id, "player@test.com");

      // Create two competitions
      const comp1 = createTestCompetition("Comp 1", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const comp2 = createTestCompetition("Comp 2", "2024-02-15", course.id, {
        tourId: tour.id,
      });

      const teeTime1 = createTestTeeTime(comp1.id, "08:00");
      const teeTime2 = createTestTeeTime(comp2.id, "08:00");

      createTestParticipant(teeTime1.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime2.id, team.id, player.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });

      service.finalizeCompetitionResults(comp1.id);
      service.finalizeCompetitionResults(comp2.id);

      const results = service.getPlayerResults(player.id);
      expect(results).toHaveLength(2);
      // Results should be ordered by date DESC
      expect(results[0].competition_name).toBe("Comp 2");
      expect(results[1].competition_name).toBe("Comp 1");
    });

    test("should include tour information in results", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("My Tour", user.id);
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Player");

      createEnrollment(tour.id, player.id, "player@test.com");

      const competition = createTestCompetition("Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");

      createTestParticipant(teeTime.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const results = service.getPlayerResults(player.id);
      expect(results[0].tour_id).toBe(tour.id);
      expect(results[0].tour_name).toBe("My Tour");
    });
  });

  describe("getPlayerTourPoints", () => {
    test("should return zero for player with no results", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Test Tour", user.id);
      const player = createTestPlayer("No Results Player");

      const points = service.getPlayerTourPoints(player.id, tour.id);
      expect(points.total_points).toBe(0);
      expect(points.competitions_played).toBe(0);
    });

    test("should sum points across finalized competitions", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const team = createTestTeam("Team A");
      const player = createTestPlayer("Point Earner");

      createEnrollment(tour.id, player.id, "player@test.com");

      // Two competitions
      const comp1 = createTestCompetition("Comp 1", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const comp2 = createTestCompetition("Comp 2", "2024-02-15", course.id, {
        tourId: tour.id,
      });

      const teeTime1 = createTestTeeTime(comp1.id, "08:00");
      const teeTime2 = createTestTeeTime(comp2.id, "08:00");

      createTestParticipant(teeTime1.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime2.id, team.id, player.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      service.finalizeCompetitionResults(comp1.id);
      service.finalizeCompetitionResults(comp2.id);

      const points = service.getPlayerTourPoints(player.id, tour.id);
      expect(points.competitions_played).toBe(2);
      // Each win with 1 player = 3 points (1+2), total = 6
      expect(points.total_points).toBe(6);
    });
  });

  describe("getTourStandingsFromResults", () => {
    test("should return empty array for tour with no finalized competitions", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Empty Tour", user.id);

      const standings = service.getTourStandingsFromResults(tour.id);
      expect(standings).toEqual([]);
    });

    test("should rank players by total points", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Winner");
      const player2 = createTestPlayer("Second");
      const player3 = createTestPlayer("Third");

      createEnrollment(tour.id, player1.id, "p1@test.com");
      createEnrollment(tour.id, player2.id, "p2@test.com");
      createEnrollment(tour.id, player3.id, "p3@test.com");

      const competition = createTestCompetition("Comp", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const teeTime = createTestTeeTime(competition.id, "08:00");

      // Winner finishes first
      createTestParticipant(teeTime.id, team.id, player1.id, {
        score: createScoreWithRelative(-3),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player2.id, {
        score: createScoreWithRelative(0),
        isLocked: true,
      });
      createTestParticipant(teeTime.id, team.id, player3.id, {
        score: createScoreWithRelative(3),
        isLocked: true,
      });

      service.finalizeCompetitionResults(competition.id);

      const standings = service.getTourStandingsFromResults(tour.id);
      expect(standings).toHaveLength(3);
      expect(standings[0].player_name).toBe("Winner");
      expect(standings[0].position).toBe(1);
      expect(standings[1].player_name).toBe("Second");
      expect(standings[1].position).toBe(2);
      expect(standings[2].player_name).toBe("Third");
      expect(standings[2].position).toBe(3);
    });

    test("should handle tied standings with same position", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const team = createTestTeam("Team A");

      const player1 = createTestPlayer("Player A");
      const player2 = createTestPlayer("Player B");

      createEnrollment(tour.id, player1.id, "p1@test.com");
      createEnrollment(tour.id, player2.id, "p2@test.com");

      // Two competitions where they alternate wins
      const comp1 = createTestCompetition("Comp 1", "2024-01-15", course.id, {
        tourId: tour.id,
      });
      const comp2 = createTestCompetition("Comp 2", "2024-02-15", course.id, {
        tourId: tour.id,
      });

      const teeTime1 = createTestTeeTime(comp1.id, "08:00");
      const teeTime2 = createTestTeeTime(comp2.id, "08:00");

      // Comp 1: Player A wins
      createTestParticipant(teeTime1.id, team.id, player1.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });
      createTestParticipant(teeTime1.id, team.id, player2.id, {
        score: createEvenParScore(),
        isLocked: true,
      });

      // Comp 2: Player B wins
      createTestParticipant(teeTime2.id, team.id, player1.id, {
        score: createEvenParScore(),
        isLocked: true,
      });
      createTestParticipant(teeTime2.id, team.id, player2.id, {
        score: createScoreWithRelative(-2),
        isLocked: true,
      });

      service.finalizeCompetitionResults(comp1.id);
      service.finalizeCompetitionResults(comp2.id);

      const standings = service.getTourStandingsFromResults(tour.id);
      expect(standings).toHaveLength(2);
      // Both should have same points and tied position
      expect(standings[0].total_points).toBe(standings[1].total_points);
      expect(standings[0].position).toBe(1);
      expect(standings[1].position).toBe(1);
    });

    test("should show competitions played count", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const course = createTestCourse("Test Course", standardPars);
      const tour = createTestTour("Test Tour", user.id);
      const team = createTestTeam("Team A");

      const player = createTestPlayer("Regular Player");
      createEnrollment(tour.id, player.id, "player@test.com");

      // Play in 3 competitions
      for (let i = 1; i <= 3; i++) {
        const comp = createTestCompetition(`Comp ${i}`, `2024-0${i}-15`, course.id, {
          tourId: tour.id,
        });
        const teeTime = createTestTeeTime(comp.id, "08:00");
        createTestParticipant(teeTime.id, team.id, player.id, {
          score: createEvenParScore(),
          isLocked: true,
        });
        service.finalizeCompetitionResults(comp.id);
      }

      const standings = service.getTourStandingsFromResults(tour.id);
      expect(standings[0].competitions_played).toBe(3);
    });
  });
});
