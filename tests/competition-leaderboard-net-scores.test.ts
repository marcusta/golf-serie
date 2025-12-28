import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { CompetitionService } from "../src/services/competition-service";
import { CourseService } from "../src/services/course-service";
import { TourService } from "../src/services/tour.service";
import { initializeDatabase } from "../src/database/db";
import type { TourScoringMode } from "../src/types";

describe("Competition Leaderboard with Net Scores", () => {
  let db: Database;
  let competitionService: CompetitionService;
  let courseService: CourseService;
  let tourService: TourService;

  beforeAll(async () => {
    db = new Database(":memory:");
    await initializeDatabase(db);
    competitionService = new CompetitionService(db);
    courseService = new CourseService(db);
    tourService = new TourService(db);

    // Create a user for foreign key references (owner_id, created_by)
    db.prepare(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('admin@test.com', 'hash', 'ADMIN')
    `).run();
  });

  afterAll(() => {
    db.close();
  });

  // Helper to create a course with pars
  async function createCourse(name: string): Promise<number> {
    const course = await courseService.create({ name });
    await courseService.updateHoles(
      course.id,
      [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4] // par 72
    );
    return course.id;
  }

  // Helper to create a tour with specific scoring mode
  function createTour(name: string, scoringMode: TourScoringMode): number {
    const stmt = db.prepare(`
      INSERT INTO tours (name, owner_id, enrollment_mode, visibility, scoring_mode)
      VALUES (?, 1, 'closed', 'public', ?)
      RETURNING id
    `);
    const result = stmt.get(name, scoringMode) as { id: number };
    return result.id;
  }

  // Helper to create a tee box for a course
  function createTee(courseId: number, name: string, courseRating: number, slopeRating: number, strokeIndex: number[]): number {
    const stmt = db.prepare(`
      INSERT INTO course_tees (course_id, name, course_rating, slope_rating, stroke_index)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id
    `);
    const result = stmt.get(courseId, name, courseRating, slopeRating, JSON.stringify(strokeIndex)) as { id: number };
    return result.id;
  }

  // Helper to create a player
  function createPlayer(name: string, handicap: number): number {
    const stmt = db.prepare(`
      INSERT INTO players (name, handicap, created_by)
      VALUES (?, ?, 1)
      RETURNING id
    `);
    const result = stmt.get(name, handicap) as { id: number };
    return result.id;
  }

  // Helper to create tour enrollment
  function createEnrollment(tourId: number, playerId: number, email: string): void {
    db.prepare(`
      INSERT INTO tour_enrollments (tour_id, player_id, email, status)
      VALUES (?, ?, ?, 'active')
    `).run(tourId, playerId, email);
  }

  // Helper to create a team
  function createTeam(name: string): number {
    const stmt = db.prepare(`
      INSERT INTO teams (name) VALUES (?) RETURNING id
    `);
    const result = stmt.get(name) as { id: number };
    return result.id;
  }

  // Helper to create a competition
  async function createCompetition(
    name: string,
    courseId: number,
    tourId?: number,
    teeId?: number
  ): Promise<number> {
    const comp = await competitionService.create({
      name,
      date: "2025-01-01",
      course_id: courseId,
      tour_id: tourId,
      tee_id: teeId,
    });
    return comp.id;
  }

  // Helper to create tee time with participant
  function createTeeTimeWithParticipant(
    competitionId: number,
    teamId: number,
    playerId: number | null,
    playerName: string,
    scores: number[],
    isLocked: boolean = true
  ): number {
    // Create tee time
    const teeTimeStmt = db.prepare(`
      INSERT INTO tee_times (teetime, competition_id, start_hole)
      VALUES ('10:00', ?, 1)
      RETURNING id
    `);
    const teeTime = teeTimeStmt.get(competitionId) as { id: number };

    // Create participant (player_id can be NULL)
    const participantStmt = db.prepare(`
      INSERT INTO participants (tee_order, team_id, tee_time_id, position_name, player_names, player_id, score, is_locked)
      VALUES (1, ?, ?, 'Player', ?, ?, ?, ?)
      RETURNING id
    `);
    const participant = participantStmt.get(
      teamId,
      teeTime.id,
      playerName,
      playerId === 0 ? null : playerId,
      JSON.stringify(scores),
      isLocked ? 1 : 0
    ) as { id: number };

    return participant.id;
  }

  describe("getLeaderboardWithDetails", () => {
    it("should return basic leaderboard for non-tour competition", async () => {
      const courseId = await createCourse("Test Course 1");
      const competitionId = await createCompetition("Non-Tour Comp", courseId);
      const teamId = createTeam("Team A");

      // Create participant with scores
      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        0,
        "Player 1",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4] // even par
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      expect(response.competitionId).toBe(competitionId);
      expect(response.scoringMode).toBeUndefined(); // No tour = no scoring mode
      expect(response.tee).toBeUndefined(); // No tee assigned
      expect(response.entries.length).toBe(1);
      expect(response.entries[0].relativeToPar).toBe(0);
      expect(response.entries[0].netRelativeToPar).toBeUndefined(); // No net score for non-tour
    });

    it("should return scoring mode for tour competition with gross mode", async () => {
      const courseId = await createCourse("Test Course 2");
      const tourId = createTour("Gross Tour", "gross");
      const competitionId = await createCompetition("Tour Gross Comp", courseId, tourId);
      const teamId = createTeam("Team B");

      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        0,
        "Player 2",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      expect(response.scoringMode).toBe("gross");
      expect(response.entries[0].netRelativeToPar).toBeUndefined(); // Gross mode = no net scores
    });

    it("should calculate net scores for tour competition with net mode", async () => {
      const courseId = await createCourse("Test Course 3");
      const tourId = createTour("Net Tour", "net");
      const strokeIndex = [1, 3, 17, 7, 11, 15, 9, 5, 13, 2, 4, 18, 8, 12, 16, 10, 6, 14];
      const teeId = createTee(courseId, "White", 72.0, 113, strokeIndex);
      const competitionId = await createCompetition("Tour Net Comp", courseId, tourId, teeId);
      const teamId = createTeam("Team C");

      // Create player with handicap
      const playerId = createPlayer("Net Player", 18.0);
      createEnrollment(tourId, playerId, "netplayer@test.com");

      // Scores: all 5s = total 90, par 72 = +18 gross
      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        playerId,
        "Net Player",
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      expect(response.scoringMode).toBe("net");
      expect(response.tee).toBeDefined();
      expect(response.tee?.name).toBe("White");
      expect(response.tee?.courseRating).toBe(72.0);
      expect(response.tee?.slopeRating).toBe(113);

      const entry = response.entries[0];
      expect(entry.relativeToPar).toBe(18); // Gross: 90 - 72 = +18
      expect(entry.courseHandicap).toBe(18); // With SR=113, same as HI
      expect(entry.netTotalShots).toBe(72); // 90 - 18 = 72
      expect(entry.netRelativeToPar).toBe(0); // Net: 72 - 72 = 0 (even par net)
      expect(entry.handicapStrokesPerHole).toBeDefined();
      expect(entry.handicapStrokesPerHole?.length).toBe(18);
    });

    it("should include tee info when competition has tee assigned", async () => {
      const courseId = await createCourse("Test Course 4");
      const strokeIndex = [7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14];
      const teeId = createTee(courseId, "Yellow", 68.5, 120, strokeIndex);
      const competitionId = await createCompetition("Tee Comp", courseId, undefined, teeId);
      const teamId = createTeam("Team D");

      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        0,
        "Tee Player",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      expect(response.tee).toBeDefined();
      expect(response.tee?.id).toBe(teeId);
      expect(response.tee?.name).toBe("Yellow");
      expect(response.tee?.courseRating).toBe(68.5);
      expect(response.tee?.slopeRating).toBe(120);
      expect(response.tee?.strokeIndex).toEqual(strokeIndex);
    });

    it("should handle both scoring mode with net scores", async () => {
      const courseId = await createCourse("Test Course 5");
      const tourId = createTour("Both Tour", "both");
      const strokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const teeId = createTee(courseId, "Blue", 74.0, 130, strokeIndex);
      const competitionId = await createCompetition("Tour Both Comp", courseId, tourId, teeId);
      const teamId = createTeam("Team E");

      // Create player with handicap 10
      const playerId = createPlayer("Both Player", 10.0);
      createEnrollment(tourId, playerId, "bothplayer@test.com");

      // Scores: all 4s = total 72 (even par gross for this test)
      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        playerId,
        "Both Player",
        [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      expect(response.scoringMode).toBe("both");

      const entry = response.entries[0];
      expect(entry.relativeToPar).toBeDefined(); // Gross score
      expect(entry.netRelativeToPar).toBeDefined(); // Net score (both mode includes net)
      expect(entry.courseHandicap).toBeDefined();
    });

    it("should not calculate net for player without handicap", async () => {
      const courseId = await createCourse("Test Course 6");
      const tourId = createTour("Net Tour 2", "net");
      const strokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const teeId = createTee(courseId, "Red", 70.0, 115, strokeIndex);
      const competitionId = await createCompetition("Tour Net Comp 2", courseId, tourId, teeId);
      const teamId = createTeam("Team F");

      // Participant without player_id (no handicap)
      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        0, // No player ID
        "No Handicap Player",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      const entry = response.entries[0];
      expect(entry.relativeToPar).toBe(0); // Gross
      expect(entry.netRelativeToPar).toBeUndefined(); // No net (no handicap)
      expect(entry.courseHandicap).toBeUndefined();
    });

    it("should calculate running net score for in-progress rounds", async () => {
      const courseId = await createCourse("Test Course 7");
      const tourId = createTour("Net Tour 3", "net");
      const strokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const teeId = createTee(courseId, "Green", 71.0, 118, strokeIndex);
      const competitionId = await createCompetition("Tour Net Comp 3", courseId, tourId, teeId);
      const teamId = createTeam("Team G");

      const playerId = createPlayer("In Progress Player", 15.0);
      createEnrollment(tourId, playerId, "inprogress@test.com");

      // Only 9 holes played (not all 18)
      // Scores: [4, 4, 3, 5, 4, 3, 4, 5, 4] = 36 gross, par 36
      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        playerId,
        "In Progress Player",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        false // Not locked
      );

      const response = await competitionService.getLeaderboardWithDetails(competitionId);

      const entry = response.entries[0];
      expect(entry.holesPlayed).toBe(9);
      // Running net score should be calculated for in-progress rounds
      // Handicap 15 gives 1 stroke on holes with SI 1-15, all 9 played holes get 1 stroke
      // Net score: (4-1)+(4-1)+(3-1)+(5-1)+(4-1)+(3-1)+(4-1)+(5-1)+(4-1) = 27
      // Net relative to par: 27 - 36 = -9
      expect(entry.netRelativeToPar).toBe(-9);
      // Course handicap and strokes per hole should be provided
      expect(entry.courseHandicap).toBeDefined();
      expect(entry.handicapStrokesPerHole).toBeDefined();
      // netTotalShots should still be undefined for incomplete rounds
      expect(entry.netTotalShots).toBeUndefined();
    });
  });
});
