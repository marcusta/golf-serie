import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { CompetitionService } from "../src/services/competition-service";
import { CourseService } from "../src/services/course-service";
import { TourService } from "../src/services/tour.service";
import { CompetitionResultsService } from "../src/services/competition-results.service";
import { initializeDatabase } from "../src/database/db";
import type { TourScoringMode } from "../src/types";

describe("Competition Leaderboard with Net Scores", () => {
  let db: Database;
  let competitionService: CompetitionService;
  let courseService: CourseService;
  let tourService: TourService;
  let competitionResultsService: CompetitionResultsService;

  beforeAll(async () => {
    db = new Database(":memory:");
    await initializeDatabase(db);
    competitionService = new CompetitionService(db);
    courseService = new CourseService(db);
    tourService = new TourService(db);
    competitionResultsService = new CompetitionResultsService(db);

    // Create a user for foreign key references (owner_id, created_by)
    db.prepare(`
      INSERT INTO users (email, password_hash, role)
      VALUES ('admin@test.com', 'hash', 'ADMIN')
    `).run();
  });

  afterAll(() => {
    db.close();
  });

  // Default stroke index (1-18 in difficulty order)
  const DEFAULT_STROKE_INDEX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  // Helper to create a course with pars and stroke index
  async function createCourse(name: string, strokeIndex: number[] = DEFAULT_STROKE_INDEX): Promise<number> {
    const course = await courseService.create({ name });
    await courseService.updateHoles(
      course.id,
      [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4] // par 72
    );
    // Set stroke index on the course (required for leaderboard calculations)
    db.prepare(`UPDATE courses SET stroke_index = ? WHERE id = ?`).run(
      JSON.stringify(strokeIndex),
      course.id
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
      // Note: handicapStrokesPerHole is now calculated on frontend from courseHandicap and strokeIndex
    });

    it("should include tee info when competition has tee assigned", async () => {
      // Stroke index is now a course property, not tee-specific
      const strokeIndex = [7, 15, 3, 11, 1, 9, 5, 17, 13, 8, 16, 4, 12, 2, 10, 6, 18, 14];
      const courseId = await createCourse("Test Course 4", strokeIndex);
      const teeId = createTee(courseId, "Yellow", 68.5, 120, []); // stroke_index on tee is now ignored
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
      // Stroke index now comes from the course, not the tee
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
      // Course handicap should be provided (strokes per hole calculated on frontend)
      expect(entry.courseHandicap).toBeDefined();
      // netTotalShots should still be undefined for incomplete rounds
      expect(entry.netTotalShots).toBeUndefined();
    });
  });

  describe("Leaderboard points for finalized competitions", () => {
    // Helper to set handicap_index on participant (simulates what happens when participant is created with handicap)
    function setParticipantHandicap(participantId: number, handicapIndex: number): void {
      db.prepare(`UPDATE participants SET handicap_index = ? WHERE id = ?`).run(handicapIndex, participantId);
    }

    it("should return both gross and net points for finalized tour competition with 'both' scoring mode", async () => {
      const courseId = await createCourse("Points Test Course 1");
      const tourId = createTour("Points Both Tour", "both");
      const strokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const teeId = createTee(courseId, "White", 72.0, 113, strokeIndex);
      const competitionId = await createCompetition("Points Comp Both", courseId, tourId, teeId);
      const teamId = createTeam("Points Team 1");

      // Create two players with different handicaps
      // Player 1: Scratch golfer (handicap 0), shoots 72 (even par)
      const player1Id = createPlayer("Scratch Golfer", 0);
      createEnrollment(tourId, player1Id, "scratch@test.com");
      const participant1Id = createTeeTimeWithParticipant(
        competitionId,
        teamId,
        player1Id,
        "Scratch Golfer",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4] // 72 gross (even par)
      );
      setParticipantHandicap(participant1Id, 0);

      // Player 2: High handicapper (handicap 20), shoots 82 (+10)
      // Net score: 82 - 20 = 62 (-10 net)
      const player2Id = createPlayer("High Handicapper", 20);
      createEnrollment(tourId, player2Id, "highhcp@test.com");
      const participant2Id = createTeeTimeWithParticipant(
        competitionId,
        teamId,
        player2Id,
        "High Handicapper",
        [5, 5, 4, 6, 5, 4, 5, 6, 5, 5, 5, 4, 6, 5, 4, 5, 6, 5] // 90 gross (+18)
      );
      setParticipantHandicap(participant2Id, 20);

      // Finalize the competition to store results
      competitionResultsService.finalizeCompetitionResults(competitionId);

      // Get leaderboard (returns entries array directly)
      const entries = await competitionService.getLeaderboard(competitionId);

      // Verify we have both players
      expect(entries.length).toBe(2);

      // Find entries by player
      const scratchEntry = entries.find(e => e.participant.player_id === player1Id);
      const highHcpEntry = entries.find(e => e.participant.player_id === player2Id);

      expect(scratchEntry).toBeDefined();
      expect(highHcpEntry).toBeDefined();

      // Gross ranking: Scratch wins (72 < 90)
      // Net ranking: High Handicapper wins (70 < 72)

      // Scratch golfer should have:
      // - position 1 (gross winner)
      // - points for 1st place gross
      // - netPosition 2 (net loser)
      // - netPoints for 2nd place net
      expect(scratchEntry!.position).toBe(1);
      expect(scratchEntry!.points).toBeGreaterThan(0);
      expect(scratchEntry!.netPosition).toBe(2);
      expect(scratchEntry!.netPoints).toBeGreaterThan(0);
      expect(scratchEntry!.points).toBeGreaterThan(scratchEntry!.netPoints!); // 1st gross pts > 2nd net pts

      // High handicapper should have:
      // - position 2 (gross loser)
      // - points for 2nd place gross
      // - netPosition 1 (net winner)
      // - netPoints for 1st place net
      expect(highHcpEntry!.position).toBe(2);
      expect(highHcpEntry!.points).toBeGreaterThan(0);
      expect(highHcpEntry!.netPosition).toBe(1);
      expect(highHcpEntry!.netPoints).toBeGreaterThan(0);
      expect(highHcpEntry!.netPoints).toBeGreaterThan(highHcpEntry!.points!); // 1st net pts > 2nd gross pts
    });

    it("should return only gross points for finalized tour competition with 'gross' scoring mode", async () => {
      const courseId = await createCourse("Points Test Course 2");
      const tourId = createTour("Points Gross Tour", "gross");
      const competitionId = await createCompetition("Points Comp Gross", courseId, tourId);
      const teamId = createTeam("Points Team 2");

      const playerId = createPlayer("Gross Only Player", 10);
      createEnrollment(tourId, playerId, "grossonly@test.com");
      const participantId = createTeeTimeWithParticipant(
        competitionId,
        teamId,
        playerId,
        "Gross Only Player",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]
      );
      setParticipantHandicap(participantId, 10);

      competitionResultsService.finalizeCompetitionResults(competitionId);

      const entries = await competitionService.getLeaderboard(competitionId);
      const entry = entries[0];

      // Should have gross points
      expect(entry.position).toBe(1);
      expect(entry.points).toBeGreaterThan(0);

      // Should NOT have net points (gross-only tour)
      expect(entry.netPosition).toBeUndefined();
      expect(entry.netPoints).toBeUndefined();
    });

    it("should return net points for finalized tour competition with 'net' scoring mode", async () => {
      const courseId = await createCourse("Points Test Course 3");
      const tourId = createTour("Points Net Tour", "net");
      const strokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const teeId = createTee(courseId, "Yellow", 70.0, 120, strokeIndex);
      const competitionId = await createCompetition("Points Comp Net", courseId, tourId, teeId);
      const teamId = createTeam("Points Team 3");

      const playerId = createPlayer("Net Only Player", 15);
      createEnrollment(tourId, playerId, "netonly@test.com");
      const participantId = createTeeTimeWithParticipant(
        competitionId,
        teamId,
        playerId,
        "Net Only Player",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]
      );
      setParticipantHandicap(participantId, 15);

      competitionResultsService.finalizeCompetitionResults(competitionId);

      const entries = await competitionService.getLeaderboard(competitionId);
      const entry = entries[0];

      // Should have gross points (always stored)
      expect(entry.position).toBe(1);
      expect(entry.points).toBeGreaterThan(0);

      // Should also have net points (net mode)
      expect(entry.netPosition).toBe(1);
      expect(entry.netPoints).toBeGreaterThan(0);
    });

    it("should handle players without handicap in net points calculation", async () => {
      const courseId = await createCourse("Points Test Course 4");
      const tourId = createTour("Points Both Tour 2", "both");
      const strokeIndex = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      const teeId = createTee(courseId, "Blue", 73.0, 125, strokeIndex);
      const competitionId = await createCompetition("Points Comp Both 2", courseId, tourId, teeId);
      const teamId = createTeam("Points Team 4");

      // Player with handicap
      const player1Id = createPlayer("With HCP", 10);
      createEnrollment(tourId, player1Id, "withhcp@test.com");
      const participant1Id = createTeeTimeWithParticipant(
        competitionId,
        teamId,
        player1Id,
        "With HCP",
        [4, 4, 3, 5, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 3, 4, 5, 4]
      );
      setParticipantHandicap(participant1Id, 10);

      // Player without handicap (no handicap_index set)
      const player2Id = createPlayer("No HCP", 0);
      createEnrollment(tourId, player2Id, "nohcp@test.com");
      createTeeTimeWithParticipant(
        competitionId,
        teamId,
        player2Id,
        "No HCP",
        [5, 5, 4, 6, 5, 4, 5, 6, 5, 5, 5, 4, 6, 5, 4, 5, 6, 5]
      );
      // Note: NOT setting handicap_index for player 2

      competitionResultsService.finalizeCompetitionResults(competitionId);

      const entries = await competitionService.getLeaderboard(competitionId);

      // Both should have gross points
      expect(entries.length).toBe(2);
      expect(entries.every(e => e.points !== undefined && e.points > 0)).toBe(true);

      // Only player with handicap should have net points
      const withHcpEntry = entries.find(e => e.participant.player_id === player1Id);
      const noHcpEntry = entries.find(e => e.participant.player_id === player2Id);

      expect(withHcpEntry!.netPoints).toBeGreaterThan(0);
      expect(noHcpEntry!.netPoints).toBeUndefined();
    });
  });
});
