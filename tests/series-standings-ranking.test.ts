import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTestDatabase } from "../src/database/db";
import { SeriesService } from "../src/services/series-service";
import { CompetitionService } from "../src/services/competition-service";

/**
 * Unit tests for SeriesService.sortAndRankTeamStandings() method.
 *
 * Tests the ranking logic to ensure:
 * - Teams with tied points get the same position
 * - Positions gap correctly after ties (1,1,3 not 1,1,2)
 * - Single team standings work correctly
 * - All teams tied get position 1
 * - Secondary sort by competitions played is correct
 * - Tertiary sort by team name is correct
 *
 * Points are calculated per competition based on finishing position:
 * - With N teams: 1st = N+2, 2nd = N, 3rd = N-1, etc.
 * - For 3 teams: 1st = 5pts, 2nd = 3pts, 3rd = 2pts
 *
 * To create tied point totals, we use multiple competitions:
 * - Team A: 1st (5) + 3rd (2) = 7 pts
 * - Team B: 2nd (3) + 2nd (3) = 6 pts
 * - Etc.
 */
describe("SeriesService Team Standings Ranking", () => {
  let db: Database;
  let seriesService: SeriesService;
  let competitionService: CompetitionService;

  // Helper to create a user
  const createUser = (email: string, role: string = "ORGANIZER"): { id: number } => {
    db.prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)").run(
      email,
      "hash",
      role
    );
    return db.prepare("SELECT id FROM users WHERE email = ?").get(email) as { id: number };
  };

  // Helper to create a series
  const createSeries = (name: string, ownerId: number): { id: number } => {
    db.prepare(
      "INSERT INTO series (name, owner_id, is_public, created_at, updated_at) VALUES (?, ?, 1, datetime('now'), datetime('now'))"
    ).run(name, ownerId);
    return db.prepare("SELECT id FROM series WHERE name = ?").get(name) as { id: number };
  };

  // Helper to create a team
  const createTeam = (name: string): { id: number } => {
    db.prepare(
      "INSERT INTO teams (name, created_at, updated_at) VALUES (?, datetime('now'), datetime('now'))"
    ).run(name);
    return db.prepare("SELECT id FROM teams WHERE name = ?").get(name) as { id: number };
  };

  // Helper to add team to series
  const addTeamToSeries = (seriesId: number, teamId: number): void => {
    db.prepare("INSERT INTO series_teams (series_id, team_id) VALUES (?, ?)").run(
      seriesId,
      teamId
    );
  };

  // Helper to create a course
  const createCourse = (name: string): { id: number } => {
    const pars = JSON.stringify([4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5]);
    db.prepare("INSERT INTO courses (name, pars) VALUES (?, ?)").run(name, pars);
    return db.prepare("SELECT id FROM courses WHERE name = ?").get(name) as { id: number };
  };

  // Helper to create a competition with a past date (so it's included in standings)
  const createCompetition = (
    name: string,
    courseId: number,
    seriesId: number,
    date: string = "2024-01-01",
    pointsMultiplier: number = 1
  ): { id: number } => {
    db.prepare(
      `INSERT INTO competitions (name, date, course_id, series_id, points_multiplier, manual_entry_format, venue_type, start_mode, is_results_final)
       VALUES (?, ?, ?, ?, ?, 'out_in_total', 'outdoor', 'scheduled', 0)`
    ).run(name, date, courseId, seriesId, pointsMultiplier);
    return db.prepare("SELECT id FROM competitions WHERE name = ?").get(name) as { id: number };
  };

  // Helper to create a tee time
  const createTeeTime = (competitionId: number, teetime: string = "09:00"): { id: number } => {
    db.prepare(
      "INSERT INTO tee_times (competition_id, teetime) VALUES (?, ?)"
    ).run(competitionId, teetime);
    return db.prepare("SELECT id FROM tee_times WHERE competition_id = ? AND teetime = ?").get(
      competitionId,
      teetime
    ) as { id: number };
  };

  // Helper to create a participant with a score
  const createParticipant = (
    teeTimeId: number,
    teamId: number,
    teeOrder: number = 1,
    manualScoreTotal: number | null = null
  ): { id: number } => {
    const score = manualScoreTotal !== null ? JSON.stringify(Array(18).fill(4)) : "[]";
    db.prepare(
      `INSERT INTO participants (tee_time_id, team_id, tee_order, position_name, score, manual_score_total, is_locked)
       VALUES (?, ?, ?, 'Player', ?, ?, ?)`
    ).run(teeTimeId, teamId, teeOrder, score, manualScoreTotal, manualScoreTotal !== null ? 1 : 0);
    return db.prepare(
      "SELECT id FROM participants WHERE tee_time_id = ? AND team_id = ?"
    ).get(teeTimeId, teamId) as { id: number };
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    competitionService = new CompetitionService(db);
    seriesService = new SeriesService(db, competitionService);
  });

  afterEach(() => {
    db.close();
  });

  describe("Tie Handling", () => {
    test("teams with tied total points should get the same position", async () => {
      /**
       * Create a scenario where teams end up with identical total points across competitions.
       *
       * With 2 teams: 1st = 4 pts, 2nd = 2 pts
       * Competition 1: Team Alpha wins (4), Team Beta loses (2)
       * Competition 2: Team Beta wins (4), Team Alpha loses (2)
       * Total: Team Alpha = 6, Team Beta = 6 (TIED!)
       */
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      const teamAlpha = createTeam("Team Alpha");
      const teamBeta = createTeam("Team Beta");

      addTeamToSeries(series.id, teamAlpha.id);
      addTeamToSeries(series.id, teamBeta.id);

      // Competition 1: Team Alpha wins (score 70), Team Beta loses (score 75)
      const comp1 = createCompetition("Competition 1", course.id, series.id, "2024-01-01");
      const teeTime1 = createTeeTime(comp1.id);
      createParticipant(teeTime1.id, teamAlpha.id, 1, 70);
      createParticipant(teeTime1.id, teamBeta.id, 2, 75);

      // Competition 2: Team Beta wins (score 70), Team Alpha loses (score 75)
      const comp2 = createCompetition("Competition 2", course.id, series.id, "2024-01-02");
      const teeTime2 = createTeeTime(comp2.id);
      createParticipant(teeTime2.id, teamBeta.id, 1, 70);
      createParticipant(teeTime2.id, teamAlpha.id, 2, 75);

      const standings = await seriesService.getStandings(series.id);

      // Both teams should have 6 points total and be in position 1
      const alpha = standings.team_standings.find((t) => t.team_name === "Team Alpha");
      const beta = standings.team_standings.find((t) => t.team_name === "Team Beta");

      expect(alpha).toBeDefined();
      expect(beta).toBeDefined();
      expect(alpha!.total_points).toBe(6);
      expect(beta!.total_points).toBe(6);
      expect(alpha!.position).toBe(1);
      expect(beta!.position).toBe(1);
    });

    test("positions should gap correctly after ties (1,1,3 not 1,1,2)", async () => {
      /**
       * Create a scenario with a tie at the top and verify position gap.
       *
       * Points formula with N teams: 1st = N+2, 2nd = N, 3rd = N-(3-1) = N-2
       * With 3 teams: 1st = 5 pts, 2nd = 3 pts, 3rd = 1 pt
       *
       * Competition 1: A wins (5), B 2nd (3), C 3rd (1)
       * Competition 2: B wins (5), A 2nd (3), C 3rd (1)
       *
       * Total: A = 8, B = 8, C = 2
       * Expected positions: 1, 1, 3 (not 1, 1, 2)
       */
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      const teamA = createTeam("Team A");
      const teamB = createTeam("Team B");
      const teamC = createTeam("Team C");

      addTeamToSeries(series.id, teamA.id);
      addTeamToSeries(series.id, teamB.id);
      addTeamToSeries(series.id, teamC.id);

      // Competition 1: A wins, B 2nd, C 3rd
      const comp1 = createCompetition("Competition 1", course.id, series.id, "2024-01-01");
      const teeTime1 = createTeeTime(comp1.id);
      createParticipant(teeTime1.id, teamA.id, 1, 70);
      createParticipant(teeTime1.id, teamB.id, 2, 75);
      createParticipant(teeTime1.id, teamC.id, 3, 80);

      // Competition 2: B wins, A 2nd, C 3rd
      const comp2 = createCompetition("Competition 2", course.id, series.id, "2024-01-02");
      const teeTime2 = createTeeTime(comp2.id);
      createParticipant(teeTime2.id, teamB.id, 1, 70);
      createParticipant(teeTime2.id, teamA.id, 2, 75);
      createParticipant(teeTime2.id, teamC.id, 3, 80);

      const standings = await seriesService.getStandings(series.id);

      const a = standings.team_standings.find((t) => t.team_name === "Team A");
      const b = standings.team_standings.find((t) => t.team_name === "Team B");
      const c = standings.team_standings.find((t) => t.team_name === "Team C");

      expect(a!.total_points).toBe(8);
      expect(b!.total_points).toBe(8);
      expect(c!.total_points).toBe(2);

      // Positions should be: 1, 1, 3 (not 1, 1, 2)
      expect(a!.position).toBe(1);
      expect(b!.position).toBe(1);
      expect(c!.position).toBe(3); // Should be 3, not 2 - validates gap after tie
    });

    test("three-way tie should all get same position with correct gap", async () => {
      /**
       * Create a three-way tie scenario.
       *
       * Points formula with N teams: 1st = N+2, 2nd = N, 3rd = N-(3-1) = N-2
       * With 3 teams: 1st = 5 pts, 2nd = 3 pts, 3rd = 1 pt
       *
       * Competition 1: A wins (5), B 2nd (3), C 3rd (1)
       * Competition 2: B wins (5), C 2nd (3), A 3rd (1)
       * Competition 3: C wins (5), A 2nd (3), B 3rd (1)
       *
       * Total: A = 5+1+3 = 9, B = 3+5+1 = 9, C = 1+3+5 = 9 (THREE-WAY TIE!)
       * Expected positions: 1, 1, 1
       */
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      const teamA = createTeam("Team A");
      const teamB = createTeam("Team B");
      const teamC = createTeam("Team C");

      addTeamToSeries(series.id, teamA.id);
      addTeamToSeries(series.id, teamB.id);
      addTeamToSeries(series.id, teamC.id);

      // Competition 1: A wins, B 2nd, C 3rd
      const comp1 = createCompetition("Competition 1", course.id, series.id, "2024-01-01");
      const teeTime1 = createTeeTime(comp1.id);
      createParticipant(teeTime1.id, teamA.id, 1, 70);
      createParticipant(teeTime1.id, teamB.id, 2, 75);
      createParticipant(teeTime1.id, teamC.id, 3, 80);

      // Competition 2: B wins, C 2nd, A 3rd
      const comp2 = createCompetition("Competition 2", course.id, series.id, "2024-01-02");
      const teeTime2 = createTeeTime(comp2.id);
      createParticipant(teeTime2.id, teamB.id, 1, 70);
      createParticipant(teeTime2.id, teamC.id, 2, 75);
      createParticipant(teeTime2.id, teamA.id, 3, 80);

      // Competition 3: C wins, A 2nd, B 3rd
      const comp3 = createCompetition("Competition 3", course.id, series.id, "2024-01-03");
      const teeTime3 = createTeeTime(comp3.id);
      createParticipant(teeTime3.id, teamC.id, 1, 70);
      createParticipant(teeTime3.id, teamA.id, 2, 75);
      createParticipant(teeTime3.id, teamB.id, 3, 80);

      const standings = await seriesService.getStandings(series.id);

      const a = standings.team_standings.find((t) => t.team_name === "Team A");
      const b = standings.team_standings.find((t) => t.team_name === "Team B");
      const c = standings.team_standings.find((t) => t.team_name === "Team C");

      // All teams should have 9 points (5+3+1 = 9)
      expect(a!.total_points).toBe(9);
      expect(b!.total_points).toBe(9);
      expect(c!.total_points).toBe(9);

      // All should be position 1 (three-way tie)
      expect(a!.position).toBe(1);
      expect(b!.position).toBe(1);
      expect(c!.position).toBe(1);
    });
  });

  describe("Single Team", () => {
    test("single team should be position 1", async () => {
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      const team1 = createTeam("Solo Team");
      addTeamToSeries(series.id, team1.id);

      const competition = createCompetition("Competition 1", course.id, series.id);
      const teeTime = createTeeTime(competition.id);

      createParticipant(teeTime.id, team1.id, 1, 72);

      const standings = await seriesService.getStandings(series.id);

      expect(standings.team_standings).toHaveLength(1);
      expect(standings.team_standings[0].position).toBe(1);
      expect(standings.team_standings[0].team_name).toBe("Solo Team");
    });
  });

  describe("All Teams Tied", () => {
    test("all teams tied should get position 1", async () => {
      /**
       * Use the same three-way tie scenario from above.
       * With 3 teams: 1st = 5, 2nd = 3, 3rd = 1
       * Each team gets 9 points total across 3 competitions (5+3+1 = 9).
       */
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      const teamA = createTeam("Team A");
      const teamB = createTeam("Team B");
      const teamC = createTeam("Team C");

      addTeamToSeries(series.id, teamA.id);
      addTeamToSeries(series.id, teamB.id);
      addTeamToSeries(series.id, teamC.id);

      // Rotation to create equal points
      const comp1 = createCompetition("Competition 1", course.id, series.id, "2024-01-01");
      const teeTime1 = createTeeTime(comp1.id);
      createParticipant(teeTime1.id, teamA.id, 1, 70);
      createParticipant(teeTime1.id, teamB.id, 2, 75);
      createParticipant(teeTime1.id, teamC.id, 3, 80);

      const comp2 = createCompetition("Competition 2", course.id, series.id, "2024-01-02");
      const teeTime2 = createTeeTime(comp2.id);
      createParticipant(teeTime2.id, teamB.id, 1, 70);
      createParticipant(teeTime2.id, teamC.id, 2, 75);
      createParticipant(teeTime2.id, teamA.id, 3, 80);

      const comp3 = createCompetition("Competition 3", course.id, series.id, "2024-01-03");
      const teeTime3 = createTeeTime(comp3.id);
      createParticipant(teeTime3.id, teamC.id, 1, 70);
      createParticipant(teeTime3.id, teamA.id, 2, 75);
      createParticipant(teeTime3.id, teamB.id, 3, 80);

      const standings = await seriesService.getStandings(series.id);

      // All teams should have 9 points and position 1
      expect(standings.team_standings).toHaveLength(3);
      standings.team_standings.forEach((team) => {
        expect(team.total_points).toBe(9);
        expect(team.position).toBe(1);
      });
    });
  });

  describe("Secondary Sort by Competitions Played", () => {
    test("teams with same points but different competitions played should have correct positions", async () => {
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      const team1 = createTeam("Team Alpha");
      const team2 = createTeam("Team Beta");

      addTeamToSeries(series.id, team1.id);
      addTeamToSeries(series.id, team2.id);

      // Create two competitions
      const competition1 = createCompetition("Competition 1", course.id, series.id, "2024-01-01");
      const competition2 = createCompetition("Competition 2", course.id, series.id, "2024-01-02");

      const teeTime1 = createTeeTime(competition1.id);
      const teeTime2 = createTeeTime(competition2.id);

      // Team Alpha plays both competitions, comes 2nd each time (2 points each = 4 total)
      createParticipant(teeTime1.id, team1.id, 1, 75);
      createParticipant(teeTime2.id, team1.id, 1, 75);

      // Team Beta plays only one competition, comes 1st (4 points = 4 total)
      createParticipant(teeTime1.id, team2.id, 2, 72);

      const standings = await seriesService.getStandings(series.id);

      const teamAlpha = standings.team_standings.find((t) => t.team_name === "Team Alpha");
      const teamBeta = standings.team_standings.find((t) => t.team_name === "Team Beta");

      // Both have same total points, but Team Alpha played more competitions
      // So Team Alpha should rank higher (position 1) and Team Beta should be position 2
      expect(teamAlpha!.competitions_played).toBe(2);
      expect(teamBeta!.competitions_played).toBe(1);
      expect(teamAlpha!.position).toBe(1);
      expect(teamBeta!.position).toBe(2);
    });
  });

  describe("Tertiary Sort by Team Name", () => {
    test("teams with same points and competitions played should be sorted alphabetically", async () => {
      /**
       * Create 3 teams with specific names to test alphabetical sorting.
       * Use rotation to ensure all teams end up with same points (9 each).
       * With 3 teams: 1st = 5, 2nd = 3, 3rd = 1
       */
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      // Create teams with names that test alphabetical sorting
      const zebra = createTeam("Zebra Team");
      const alpha = createTeam("Alpha Team");
      const middle = createTeam("Middle Team");

      addTeamToSeries(series.id, zebra.id);
      addTeamToSeries(series.id, alpha.id);
      addTeamToSeries(series.id, middle.id);

      // Rotation to create equal points
      const comp1 = createCompetition("Competition 1", course.id, series.id, "2024-01-01");
      const teeTime1 = createTeeTime(comp1.id);
      createParticipant(teeTime1.id, zebra.id, 1, 70);
      createParticipant(teeTime1.id, alpha.id, 2, 75);
      createParticipant(teeTime1.id, middle.id, 3, 80);

      const comp2 = createCompetition("Competition 2", course.id, series.id, "2024-01-02");
      const teeTime2 = createTeeTime(comp2.id);
      createParticipant(teeTime2.id, alpha.id, 1, 70);
      createParticipant(teeTime2.id, middle.id, 2, 75);
      createParticipant(teeTime2.id, zebra.id, 3, 80);

      const comp3 = createCompetition("Competition 3", course.id, series.id, "2024-01-03");
      const teeTime3 = createTeeTime(comp3.id);
      createParticipant(teeTime3.id, middle.id, 1, 70);
      createParticipant(teeTime3.id, zebra.id, 2, 75);
      createParticipant(teeTime3.id, alpha.id, 3, 80);

      const standings = await seriesService.getStandings(series.id);

      // All teams tied with 9 points (5+3+1), so should be position 1
      expect(standings.team_standings).toHaveLength(3);

      // All should be position 1 (tied) and have same points
      standings.team_standings.forEach((team) => {
        expect(team.total_points).toBe(9);
        expect(team.position).toBe(1);
      });

      // Should be sorted alphabetically
      const teamNames = standings.team_standings.map((t) => t.team_name);
      expect(teamNames).toEqual(["Alpha Team", "Middle Team", "Zebra Team"]);
    });
  });

  describe("Empty Standings", () => {
    test("should return empty standings for series with no competitions", async () => {
      const owner = createUser("owner@test.com");
      const series = createSeries("Empty Series", owner.id);

      const standings = await seriesService.getStandings(series.id);

      expect(standings.team_standings).toEqual([]);
      expect(standings.total_competitions).toBe(0);
    });

    test("should return empty standings for series with competitions but no participants", async () => {
      const owner = createUser("owner@test.com");
      const series = createSeries("Test Series", owner.id);
      const course = createCourse("Test Course");

      createCompetition("Empty Competition", course.id, series.id);

      const standings = await seriesService.getStandings(series.id);

      expect(standings.team_standings).toEqual([]);
      expect(standings.total_competitions).toBe(1);
    });
  });
});
