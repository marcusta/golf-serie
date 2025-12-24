import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { TourService } from "../src/services/tour.service";
import { PointTemplateService } from "../src/services/point-template.service";

describe("TourService.getFullStandings", () => {
  let db: Database;
  let tourService: TourService;
  let pointTemplateService: PointTemplateService;

  // Helper to create test data
  const createTestTour = (name: string, ownerId: number, pointTemplateId?: number) => {
    return db
      .prepare(`
        INSERT INTO tours (name, owner_id, enrollment_mode, visibility, point_template_id)
        VALUES (?, ?, 'closed', 'public', ?)
        RETURNING *
      `)
      .get(name, ownerId, pointTemplateId || null) as any;
  };

  const createTestUser = (email: string, role: string = "PLAYER") => {
    return db
      .prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, 'hash123', ?)
        RETURNING *
      `)
      .get(email, role) as any;
  };

  const createTestPlayer = (name: string, userId?: number) => {
    return db
      .prepare(`
        INSERT INTO players (name, user_id)
        VALUES (?, ?)
        RETURNING *
      `)
      .get(name, userId || null) as any;
  };

  const createTestCourse = (name: string, pars: number[]) => {
    return db
      .prepare(`
        INSERT INTO courses (name, pars)
        VALUES (?, ?)
        RETURNING *
      `)
      .get(name, JSON.stringify(pars)) as any;
  };

  const createTestCompetition = (name: string, date: string, courseId: number, tourId: number) => {
    return db
      .prepare(`
        INSERT INTO competitions (name, date, course_id, tour_id, points_multiplier)
        VALUES (?, ?, ?, ?, 1)
        RETURNING *
      `)
      .get(name, date, courseId, tourId) as any;
  };

  const createTestTeeTime = (competitionId: number, teetime: string) => {
    return db
      .prepare(`
        INSERT INTO tee_times (competition_id, teetime, start_hole)
        VALUES (?, ?, 1)
        RETURNING *
      `)
      .get(competitionId, teetime) as any;
  };

  const createTestTeam = (name: string) => {
    return db
      .prepare(`
        INSERT INTO teams (name)
        VALUES (?)
        RETURNING *
      `)
      .get(name) as any;
  };

  const createTestParticipant = (
    teeTimeId: number,
    teamId: number,
    playerId: number,
    score: number[],
    isLocked: boolean = true,
    manualScoreTotal?: number
  ) => {
    return db
      .prepare(`
        INSERT INTO participants (tee_time_id, team_id, player_id, tee_order, position_name, score, is_locked, manual_score_total)
        VALUES (?, ?, ?, 1, 'Player', ?, ?, ?)
        RETURNING *
      `)
      .get(
        teeTimeId,
        teamId,
        playerId,
        JSON.stringify(score),
        isLocked ? 1 : 0,
        manualScoreTotal ?? null
      ) as any;
  };

  const createEnrollment = (tourId: number, playerId: number, email: string) => {
    return db
      .prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status)
        VALUES (?, ?, ?, 'active')
        RETURNING *
      `)
      .get(tourId, playerId, email) as any;
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    tourService = new TourService(db);
    pointTemplateService = new PointTemplateService(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("Empty tour scenarios", () => {
    test("should return empty standings for tour with no competitions", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Empty Tour", user.id);

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.tour.id).toBe(tour.id);
      expect(standings.player_standings).toEqual([]);
      expect(standings.total_competitions).toBe(0);
      expect(standings.point_template).toBeUndefined();
    });

    test("should return empty standings for tour with competition but no participants", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour With Empty Competition", user.id);
      const course = createTestCourse("Test Course", Array(18).fill(4));
      createTestCompetition("Comp 1", "2024-01-15", course.id, tour.id);

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.player_standings).toEqual([]);
      expect(standings.total_competitions).toBe(1);
    });

    test("should throw error for non-existent tour", () => {
      expect(() => tourService.getFullStandings(999)).toThrow("Tour not found");
    });
  });

  describe("Single competition standings", () => {
    test("should calculate standings for single competition with finished players", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Single Comp Tour", user.id);
      const course = createTestCourse("Par 72 Course", Array(18).fill(4)); // Par 72
      const competition = createTestCompetition("Competition 1", "2024-01-15", course.id, tour.id);
      const teeTime = createTestTeeTime(competition.id, "09:00");
      const team = createTestTeam("Test Team");

      // Create players and enrollments
      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      const player3 = createTestPlayer("Charlie");
      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");
      createEnrollment(tour.id, player3.id, "charlie@test.com");

      // Create participants with scores (all 4s = par)
      // Alice: 72 (even par)
      createTestParticipant(teeTime.id, team.id, player1.id, Array(18).fill(4), true);
      // Bob: 74 (+2)
      createTestParticipant(teeTime.id, team.id, player2.id, [5, 5, ...Array(16).fill(4)], true);
      // Charlie: 71 (-1)
      createTestParticipant(teeTime.id, team.id, player3.id, [3, ...Array(17).fill(4)], true);

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.player_standings.length).toBe(3);

      // Charlie should be 1st (-1)
      expect(standings.player_standings[0].player_name).toBe("Charlie");
      expect(standings.player_standings[0].position).toBe(1);
      expect(standings.player_standings[0].competitions_played).toBe(1);

      // Alice should be 2nd (even par)
      expect(standings.player_standings[1].player_name).toBe("Alice");
      expect(standings.player_standings[1].position).toBe(2);

      // Bob should be 3rd (+2)
      expect(standings.player_standings[2].player_name).toBe("Bob");
      expect(standings.player_standings[2].position).toBe(3);
    });

    test("should not include players who have not finished (unlocked)", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const competition = createTestCompetition("Comp", "2024-01-15", course.id, tour.id);
      const teeTime = createTestTeeTime(competition.id, "09:00");
      const team = createTestTeam("Team");

      const finishedPlayer = createTestPlayer("Finished");
      const unfinishedPlayer = createTestPlayer("Unfinished");
      createEnrollment(tour.id, finishedPlayer.id, "finished@test.com");
      createEnrollment(tour.id, unfinishedPlayer.id, "unfinished@test.com");

      // Finished player
      createTestParticipant(teeTime.id, team.id, finishedPlayer.id, Array(18).fill(4), true);
      // Unfinished player (not locked)
      createTestParticipant(teeTime.id, team.id, unfinishedPlayer.id, Array(18).fill(4), false);

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.player_standings.length).toBe(1);
      expect(standings.player_standings[0].player_name).toBe("Finished");
    });

    test("should not include players with gave-up score (-1)", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const competition = createTestCompetition("Comp", "2024-01-15", course.id, tour.id);
      const teeTime = createTestTeeTime(competition.id, "09:00");
      const team = createTestTeam("Team");

      const validPlayer = createTestPlayer("Valid");
      const gaveUpPlayer = createTestPlayer("GaveUp");
      createEnrollment(tour.id, validPlayer.id, "valid@test.com");
      createEnrollment(tour.id, gaveUpPlayer.id, "gaveup@test.com");

      createTestParticipant(teeTime.id, team.id, validPlayer.id, Array(18).fill(4), true);
      // Player with gave-up on hole 10
      const scoreWithGaveUp = [...Array(9).fill(4), -1, ...Array(8).fill(4)];
      createTestParticipant(teeTime.id, team.id, gaveUpPlayer.id, scoreWithGaveUp, true);

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.player_standings.length).toBe(1);
      expect(standings.player_standings[0].player_name).toBe("Valid");
    });
  });

  describe("Multiple competition standings", () => {
    test("should aggregate points across multiple competitions", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Multi Comp Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      // Create 3 players
      const player1 = createTestPlayer("Player1");
      const player2 = createTestPlayer("Player2");
      const player3 = createTestPlayer("Player3");
      createEnrollment(tour.id, player1.id, "p1@test.com");
      createEnrollment(tour.id, player2.id, "p2@test.com");
      createEnrollment(tour.id, player3.id, "p3@test.com");

      // Competition 1: P1 wins, P2 second, P3 third
      const comp1 = createTestCompetition("Comp 1", "2024-01-01", course.id, tour.id);
      const tt1 = createTestTeeTime(comp1.id, "09:00");
      createTestParticipant(tt1.id, team.id, player1.id, [3, ...Array(17).fill(4)], true); // -1
      createTestParticipant(tt1.id, team.id, player2.id, Array(18).fill(4), true); // even
      createTestParticipant(tt1.id, team.id, player3.id, [5, ...Array(17).fill(4)], true); // +1

      // Competition 2: P2 wins, P1 second, P3 third
      const comp2 = createTestCompetition("Comp 2", "2024-01-08", course.id, tour.id);
      const tt2 = createTestTeeTime(comp2.id, "09:00");
      createTestParticipant(tt2.id, team.id, player1.id, Array(18).fill(4), true); // even
      createTestParticipant(tt2.id, team.id, player2.id, [3, ...Array(17).fill(4)], true); // -1
      createTestParticipant(tt2.id, team.id, player3.id, [5, ...Array(17).fill(4)], true); // +1

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.total_competitions).toBe(2);
      expect(standings.player_standings.length).toBe(3);

      // Each player should have 2 competitions played
      standings.player_standings.forEach((s) => {
        expect(s.competitions_played).toBe(2);
        expect(s.competitions.length).toBe(2);
      });

      // P1 and P2 should be tied for 1st (each won 1 and came 2nd once)
      // Points: 1st = 5 (3+2), 2nd = 3, so both have 8 points
      // P3 came 3rd both times: 2 + 2 = 4 points
      const p1Standing = standings.player_standings.find((s) => s.player_name === "Player1");
      const p2Standing = standings.player_standings.find((s) => s.player_name === "Player2");
      const p3Standing = standings.player_standings.find((s) => s.player_name === "Player3");

      expect(p1Standing?.total_points).toBe(p2Standing?.total_points);
      expect(p3Standing?.total_points).toBeLessThan(p1Standing!.total_points);
    });

    test("should handle player missing a competition", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      const player1 = createTestPlayer("Consistent");
      const player2 = createTestPlayer("MissedOne");
      createEnrollment(tour.id, player1.id, "consistent@test.com");
      createEnrollment(tour.id, player2.id, "missed@test.com");

      // Comp 1: Both play
      const comp1 = createTestCompetition("Comp 1", "2024-01-01", course.id, tour.id);
      const tt1 = createTestTeeTime(comp1.id, "09:00");
      createTestParticipant(tt1.id, team.id, player1.id, Array(18).fill(4), true);
      createTestParticipant(tt1.id, team.id, player2.id, [3, ...Array(17).fill(4)], true);

      // Comp 2: Only player1 plays
      const comp2 = createTestCompetition("Comp 2", "2024-01-08", course.id, tour.id);
      const tt2 = createTestTeeTime(comp2.id, "09:00");
      createTestParticipant(tt2.id, team.id, player1.id, Array(18).fill(4), true);

      const standings = tourService.getFullStandings(tour.id);

      const p1 = standings.player_standings.find((s) => s.player_name === "Consistent");
      const p2 = standings.player_standings.find((s) => s.player_name === "MissedOne");

      expect(p1?.competitions_played).toBe(2);
      expect(p2?.competitions_played).toBe(1);
    });
  });

  describe("Tie handling", () => {
    test("should assign same position to players with tied scores", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      const player1 = createTestPlayer("Alice");
      const player2 = createTestPlayer("Bob");
      createEnrollment(tour.id, player1.id, "alice@test.com");
      createEnrollment(tour.id, player2.id, "bob@test.com");

      const comp = createTestCompetition("Comp", "2024-01-01", course.id, tour.id);
      const tt = createTestTeeTime(comp.id, "09:00");

      // Both players have same score
      createTestParticipant(tt.id, team.id, player1.id, Array(18).fill(4), true);
      createTestParticipant(tt.id, team.id, player2.id, Array(18).fill(4), true);

      const standings = tourService.getFullStandings(tour.id);

      // Both should be position 1 (tied)
      expect(standings.player_standings[0].position).toBe(1);
      expect(standings.player_standings[1].position).toBe(1);
      // Same points
      expect(standings.player_standings[0].total_points).toBe(standings.player_standings[1].total_points);
    });
  });

  describe("Point template usage", () => {
    test("should use point template when configured", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");

      // Create a custom point template
      const template = pointTemplateService.create(
        {
          name: "Custom Points",
          points_structure: { "1": 100, "2": 75, "3": 50, default: 10 },
        },
        user.id
      );

      const tour = createTestTour("Tour", user.id, template.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      const player1 = createTestPlayer("Winner");
      const player2 = createTestPlayer("Second");
      const player3 = createTestPlayer("Third");
      const player4 = createTestPlayer("Fourth");
      createEnrollment(tour.id, player1.id, "p1@test.com");
      createEnrollment(tour.id, player2.id, "p2@test.com");
      createEnrollment(tour.id, player3.id, "p3@test.com");
      createEnrollment(tour.id, player4.id, "p4@test.com");

      const comp = createTestCompetition("Comp", "2024-01-01", course.id, tour.id);
      const tt = createTestTeeTime(comp.id, "09:00");

      createTestParticipant(tt.id, team.id, player1.id, [3, ...Array(17).fill(4)], true); // -1 (1st)
      createTestParticipant(tt.id, team.id, player2.id, Array(18).fill(4), true); // even (2nd)
      createTestParticipant(tt.id, team.id, player3.id, [5, ...Array(17).fill(4)], true); // +1 (3rd)
      createTestParticipant(tt.id, team.id, player4.id, [5, 5, ...Array(16).fill(4)], true); // +2 (4th)

      const standings = tourService.getFullStandings(tour.id);

      expect(standings.point_template?.id).toBe(template.id);
      expect(standings.point_template?.name).toBe("Custom Points");

      const winner = standings.player_standings.find((s) => s.player_name === "Winner");
      const second = standings.player_standings.find((s) => s.player_name === "Second");
      const third = standings.player_standings.find((s) => s.player_name === "Third");
      const fourth = standings.player_standings.find((s) => s.player_name === "Fourth");

      expect(winner?.total_points).toBe(100);
      expect(second?.total_points).toBe(75);
      expect(third?.total_points).toBe(50);
      expect(fourth?.total_points).toBe(10); // default
    });

    test("should use default formula when no point template", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id); // No point template
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      // 5 enrolled players for points calculation
      const players = [
        createTestPlayer("P1"),
        createTestPlayer("P2"),
        createTestPlayer("P3"),
        createTestPlayer("P4"),
        createTestPlayer("P5"),
      ];

      players.forEach((p, i) => createEnrollment(tour.id, p.id, `p${i}@test.com`));

      const comp = createTestCompetition("Comp", "2024-01-01", course.id, tour.id);
      const tt = createTestTeeTime(comp.id, "09:00");

      // Create participants with different scores
      createTestParticipant(tt.id, team.id, players[0].id, [3, ...Array(17).fill(4)], true); // 1st
      createTestParticipant(tt.id, team.id, players[1].id, Array(18).fill(4), true); // 2nd
      createTestParticipant(tt.id, team.id, players[2].id, [5, ...Array(17).fill(4)], true); // 3rd
      createTestParticipant(tt.id, team.id, players[3].id, [5, 5, ...Array(16).fill(4)], true); // 4th
      createTestParticipant(tt.id, team.id, players[4].id, [5, 5, 5, ...Array(15).fill(4)], true); // 5th

      const standings = tourService.getFullStandings(tour.id);

      // Default formula: 1st = N+2, 2nd = N, 3rd+ = N-(pos-1), min 0
      // With 5 players: 1st = 7, 2nd = 5, 3rd = 3, 4th = 2, 5th = 1
      expect(standings.player_standings[0].total_points).toBe(7); // 5+2
      expect(standings.player_standings[1].total_points).toBe(5); // 5
      expect(standings.player_standings[2].total_points).toBe(3); // 5-2
      expect(standings.player_standings[3].total_points).toBe(2); // 5-3
      expect(standings.player_standings[4].total_points).toBe(1); // 5-4
    });
  });

  describe("Manual scores", () => {
    test("should use manual_score_total when available", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4)); // Par 72
      const team = createTestTeam("Team");

      const player1 = createTestPlayer("Manual");
      const player2 = createTestPlayer("HoleByHole");
      createEnrollment(tour.id, player1.id, "manual@test.com");
      createEnrollment(tour.id, player2.id, "hbh@test.com");

      const comp = createTestCompetition("Comp", "2024-01-01", course.id, tour.id);
      const tt = createTestTeeTime(comp.id, "09:00");

      // Player with manual score (70 = -2)
      createTestParticipant(tt.id, team.id, player1.id, [], true, 70);
      // Player with hole-by-hole (72 = even)
      createTestParticipant(tt.id, team.id, player2.id, Array(18).fill(4), true);

      const standings = tourService.getFullStandings(tour.id);

      const manual = standings.player_standings.find((s) => s.player_name === "Manual");
      const hbh = standings.player_standings.find((s) => s.player_name === "HoleByHole");

      expect(manual?.position).toBe(1);
      expect(manual?.competitions[0].score_relative_to_par).toBe(-2);
      expect(hbh?.position).toBe(2);
      expect(hbh?.competitions[0].score_relative_to_par).toBe(0);
    });
  });

  describe("Competition breakdown", () => {
    test("should include detailed competition breakdown for each player", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      const player = createTestPlayer("Player");
      createEnrollment(tour.id, player.id, "player@test.com");

      const comp1 = createTestCompetition("Competition A", "2024-01-01", course.id, tour.id);
      const comp2 = createTestCompetition("Competition B", "2024-01-08", course.id, tour.id);

      const tt1 = createTestTeeTime(comp1.id, "09:00");
      const tt2 = createTestTeeTime(comp2.id, "09:00");

      createTestParticipant(tt1.id, team.id, player.id, [3, ...Array(17).fill(4)], true); // -1
      createTestParticipant(tt2.id, team.id, player.id, [5, ...Array(17).fill(4)], true); // +1

      const standings = tourService.getFullStandings(tour.id);
      const playerStanding = standings.player_standings[0];

      expect(playerStanding.competitions.length).toBe(2);

      const compA = playerStanding.competitions.find((c) => c.competition_name === "Competition A");
      const compB = playerStanding.competitions.find((c) => c.competition_name === "Competition B");

      expect(compA?.score_relative_to_par).toBe(-1);
      expect(compA?.competition_date).toBe("2024-01-01");
      expect(compB?.score_relative_to_par).toBe(1);
      expect(compB?.competition_date).toBe("2024-01-08");
    });
  });

  describe("Legacy getStandings method", () => {
    test("should return simplified standings array", async () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour("Tour", user.id);
      const course = createTestCourse("Course", Array(18).fill(4));
      const team = createTestTeam("Team");

      const player = createTestPlayer("Player");
      createEnrollment(tour.id, player.id, "player@test.com");

      const comp = createTestCompetition("Comp", "2024-01-01", course.id, tour.id);
      const tt = createTestTeeTime(comp.id, "09:00");
      createTestParticipant(tt.id, team.id, player.id, Array(18).fill(4), true);

      const standings = tourService.getStandings(tour.id);

      expect(Array.isArray(standings)).toBe(true);
      expect(standings.length).toBe(1);
      expect(standings[0]).toHaveProperty("player_id");
      expect(standings[0]).toHaveProperty("player_name");
      expect(standings[0]).toHaveProperty("total_points");
      expect(standings[0]).toHaveProperty("competitions_played");
      // Should NOT have the detailed fields
      expect(standings[0]).not.toHaveProperty("position");
      expect(standings[0]).not.toHaveProperty("competitions");
    });
  });
});
