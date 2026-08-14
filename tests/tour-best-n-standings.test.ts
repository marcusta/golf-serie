import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { TourService } from "../src/services/tour.service";

describe("TourService best-N counting (counting_competitions)", () => {
  let db: Database;
  let tourService: TourService;
  let teamCounter = 0;

  const nextTeam = () => {
    teamCounter += 1;
    return db
      .prepare("INSERT INTO teams (name) VALUES (?) RETURNING id")
      .get(`Team ${teamCounter}`) as { id: number };
  };

  const createTestUser = (email: string, role: string = "PLAYER") => {
    return db
      .prepare(`
        INSERT INTO users (email, password_hash, role)
        VALUES (?, 'hash123', ?)
        RETURNING *
      `)
      .get(email, role) as { id: number };
  };

  const createTestTour = (
    ownerId: number,
    countingCompetitions: number | null = null
  ) => {
    return db
      .prepare(`
        INSERT INTO tours (
          name, owner_id, enrollment_mode, visibility, scoring_format, scoring_mode, counting_competitions
        )
        VALUES (?, ?, 'closed', 'public', 'stroke_play', 'gross', ?)
        RETURNING *
      `)
      .get("Best-N Tour", ownerId, countingCompetitions) as { id: number };
  };

  const createTestPlayer = (name: string) => {
    return db
      .prepare(`
        INSERT INTO players (name)
        VALUES (?)
        RETURNING *
      `)
      .get(name) as { id: number; name: string };
  };

  const createTestCourse = () => {
    return db
      .prepare(`
        INSERT INTO courses (name, pars)
        VALUES ('Course', ?)
        RETURNING *
      `)
      .get(JSON.stringify(Array(18).fill(4))) as { id: number };
  };

  const createTestCompetition = (date: string, courseId: number, tourId: number, name: string) => {
    return db
      .prepare(`
        INSERT INTO competitions (name, date, course_id, tour_id, points_multiplier)
        VALUES (?, ?, ?, ?, 1)
        RETURNING *
      `)
      .get(name, date, courseId, tourId) as { id: number; name: string; date: string };
  };

  const createEnrollment = (tourId: number, playerId: number, email: string) => {
    db.prepare(`
      INSERT INTO tour_enrollments (tour_id, player_id, email, status)
      VALUES (?, ?, ?, 'active')
    `).run(tourId, playerId, email);
  };

  const insertStoredResult = (
    competitionId: number,
    playerId: number,
    points: number,
    position: number,
    participantId: number
  ) => {
    db.prepare(`
      INSERT INTO competition_results
        (competition_id, participant_id, player_id, scoring_type, position, points, gross_score, relative_to_par)
      VALUES (?, ?, ?, 'gross', ?, ?, 72, 0)
    `).run(competitionId, participantId, playerId, position, points);
  };

  const finalizeCompetitionWithStoredResults = (
    competitionId: number,
    playerId: number,
    points: number,
    position: number
  ) => {
    const team = nextTeam();
    const teeTime = db
      .prepare(`
        INSERT INTO tee_times (competition_id, teetime, start_hole)
        VALUES (?, '09:00', 1)
        RETURNING id
      `)
      .get(competitionId) as { id: number };
    const participant = db
      .prepare(`
        INSERT INTO participants (tee_time_id, team_id, player_id, tee_order, position_name, score, is_locked)
        VALUES (?, ?, ?, 1, 'Player', ?, 1)
        RETURNING id
      `)
      .get(teeTime.id, team.id, playerId, JSON.stringify(Array(18).fill(4))) as { id: number };

    db.prepare("UPDATE competitions SET is_results_final = 1 WHERE id = ?").run(competitionId);
    insertStoredResult(competitionId, playerId, points, position, participant.id);
    return participant.id;
  };

  const createLiveCompetitionEntry = (
    competitionId: number,
    playerId: number,
    score: number[]
  ) => {
    const team = nextTeam();
    const teeTime = db
      .prepare(`
        INSERT INTO tee_times (competition_id, teetime, start_hole)
        VALUES (?, '09:00', 1)
        RETURNING id
      `)
      .get(competitionId) as { id: number };
    db.prepare(`
      INSERT INTO participants (tee_time_id, team_id, player_id, tee_order, position_name, score, is_locked)
      VALUES (?, ?, ?, 1, 'Player', ?, 0)
    `).run(teeTime.id, team.id, playerId, JSON.stringify(score));
  };

  beforeEach(async () => {
    db = await createTestDatabase();
    tourService = new TourService(db);
    teamCounter = 0;
  });

  afterEach(() => {
    db.close();
  });

  describe("when counting_competitions is null", () => {
    test("should match legacy totals and flag all finalized/projected entries", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour(user.id, null);
      const course = createTestCourse();
      const player = createTestPlayer("Alice");
      createEnrollment(tour.id, player.id, "alice@test.com");

      const comp1 = createTestCompetition("2024-01-01", course.id, tour.id, "Comp 1");
      const comp2 = createTestCompetition("2024-01-08", course.id, tour.id, "Comp 2");
      const comp3 = createTestCompetition("2024-01-15", course.id, tour.id, "Comp 3");

      finalizeCompetitionWithStoredResults(comp1.id, player.id, 5, 1);
      finalizeCompetitionWithStoredResults(comp2.id, player.id, 3, 1);
      finalizeCompetitionWithStoredResults(comp3.id, player.id, 1, 1);

      const standings = tourService.getFullStandings(tour.id);
      const alice = standings.player_standings[0];

      expect(alice.actual_points).toBe(9);
      expect(alice.projected_points).toBe(9);
      expect(alice.total_points).toBe(9);
      expect(alice.competitions_played).toBe(3);
      expect(alice.competitions.every((c) => c.counts_toward_projected)).toBe(true);
      expect(alice.competitions.every((c) => c.counts_toward_actual)).toBe(true);
    });
  });

  describe("when N is smaller than result count", () => {
    test("should sum only the N highest point values and set flags", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour(user.id, 2);
      const course = createTestCourse();
      const player = createTestPlayer("Alice");
      createEnrollment(tour.id, player.id, "alice@test.com");

      const comp1 = createTestCompetition("2024-01-01", course.id, tour.id, "Low");
      const comp2 = createTestCompetition("2024-01-08", course.id, tour.id, "Mid");
      const comp3 = createTestCompetition("2024-01-15", course.id, tour.id, "High");

      finalizeCompetitionWithStoredResults(comp1.id, player.id, 1, 3);
      finalizeCompetitionWithStoredResults(comp2.id, player.id, 3, 2);
      finalizeCompetitionWithStoredResults(comp3.id, player.id, 5, 1);

      const standings = tourService.getFullStandings(tour.id);
      const alice = standings.player_standings[0];

      expect(alice.actual_points).toBe(8);
      expect(alice.projected_points).toBe(8);
      expect(alice.competitions_played).toBe(3);

      const byName = Object.fromEntries(
        alice.competitions.map((c) => [c.competition_name, c])
      );
      expect(byName.High.counts_toward_projected).toBe(true);
      expect(byName.Mid.counts_toward_projected).toBe(true);
      expect(byName.Low.counts_toward_projected).toBe(false);
      expect(byName.High.counts_toward_actual).toBe(true);
      expect(byName.Mid.counts_toward_actual).toBe(true);
      expect(byName.Low.counts_toward_actual).toBe(false);
    });
  });

  describe("when N is larger than result count", () => {
    test("should count every result", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour(user.id, 10);
      const course = createTestCourse();
      const player = createTestPlayer("Alice");
      createEnrollment(tour.id, player.id, "alice@test.com");

      const comp1 = createTestCompetition("2024-01-01", course.id, tour.id, "Comp 1");
      const comp2 = createTestCompetition("2024-01-08", course.id, tour.id, "Comp 2");

      finalizeCompetitionWithStoredResults(comp1.id, player.id, 4, 1);
      finalizeCompetitionWithStoredResults(comp2.id, player.id, 2, 1);

      const standings = tourService.getFullStandings(tour.id);
      const alice = standings.player_standings[0];

      expect(alice.actual_points).toBe(6);
      expect(alice.projected_points).toBe(6);
      expect(alice.competitions.every((c) => c.counts_toward_projected)).toBe(true);
      expect(alice.competitions.every((c) => c.counts_toward_actual)).toBe(true);
    });
  });

  describe("mixed finalized and projected results", () => {
    test("should pick different subsets for actual vs projected totals", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour(user.id, 1);
      const course = createTestCourse();
      const player = createTestPlayer("Alice");
      createEnrollment(tour.id, player.id, "alice@test.com");

      const finalized = createTestCompetition("2024-01-01", course.id, tour.id, "Finalized");
      finalizeCompetitionWithStoredResults(finalized.id, player.id, 2, 1);

      const live = createTestCompetition("2099-01-01", course.id, tour.id, "Live");
      createLiveCompetitionEntry(live.id, player.id, [3, ...Array(17).fill(4)]);

      const standings = tourService.getFullStandings(tour.id);
      const alice = standings.player_standings[0];

      const finalizedEntry = alice.competitions.find((c) => c.competition_name === "Finalized");
      const liveEntry = alice.competitions.find((c) => c.competition_name === "Live");

      expect(finalizedEntry?.points).toBe(2);
      expect(liveEntry?.points).toBeGreaterThan(finalizedEntry!.points);
      expect(alice.actual_points).toBe(2);
      expect(alice.projected_points).toBe(liveEntry!.points);
      expect(alice.competitions_played).toBe(2);

      expect(finalizedEntry?.counts_toward_actual).toBe(true);
      expect(finalizedEntry?.counts_toward_projected).toBe(false);
      expect(liveEntry?.counts_toward_actual).toBe(false);
      expect(liveEntry?.counts_toward_projected).toBe(true);
    });
  });

  describe("boundary tie at the Nth slot", () => {
    test("should pick the earlier competition_date when points are tied", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour(user.id, 2);
      const course = createTestCourse();
      const player = createTestPlayer("Alice");
      createEnrollment(tour.id, player.id, "alice@test.com");

      const comp1 = createTestCompetition("2024-01-01", course.id, tour.id, "Best");
      const comp2 = createTestCompetition("2024-01-08", course.id, tour.id, "Tie Early");
      const comp3 = createTestCompetition("2024-01-15", course.id, tour.id, "Tie Late");

      finalizeCompetitionWithStoredResults(comp1.id, player.id, 5, 1);
      finalizeCompetitionWithStoredResults(comp2.id, player.id, 3, 1);
      finalizeCompetitionWithStoredResults(comp3.id, player.id, 3, 1);

      const standings = tourService.getFullStandings(tour.id);
      const alice = standings.player_standings[0];
      const byName = Object.fromEntries(
        alice.competitions.map((c) => [c.competition_name, c])
      );

      expect(alice.actual_points).toBe(8);
      expect(byName.Best.counts_toward_projected).toBe(true);
      expect(byName["Tie Early"].counts_toward_projected).toBe(true);
      expect(byName["Tie Late"].counts_toward_projected).toBe(false);
    });
  });

  describe("with category filter", () => {
    test("should apply best-N only within the filtered category", () => {
      const user = createTestUser("owner@test.com", "ADMIN");
      const tour = createTestTour(user.id, 1);
      const course = createTestCourse();

      const menCategory = db
        .prepare(`
          INSERT INTO tour_categories (tour_id, name, sort_order)
          VALUES (?, 'Men', 0)
          RETURNING id
        `)
        .get(tour.id) as { id: number };
      const womenCategory = db
        .prepare(`
          INSERT INTO tour_categories (tour_id, name, sort_order)
          VALUES (?, 'Women', 1)
          RETURNING id
        `)
        .get(tour.id) as { id: number };

      const man = createTestPlayer("Man");
      const woman = createTestPlayer("Woman");

      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status, category_id)
        VALUES (?, ?, 'man@test.com', 'active', ?)
      `).run(tour.id, man.id, menCategory.id);
      db.prepare(`
        INSERT INTO tour_enrollments (tour_id, player_id, email, status, category_id)
        VALUES (?, ?, 'woman@test.com', 'active', ?)
      `).run(tour.id, woman.id, womenCategory.id);

      const comp1 = createTestCompetition("2024-01-01", course.id, tour.id, "Comp 1");
      const comp2 = createTestCompetition("2024-01-08", course.id, tour.id, "Comp 2");

      finalizeCompetitionWithStoredResults(comp1.id, man.id, 5, 1);
      finalizeCompetitionWithStoredResults(comp2.id, man.id, 1, 1);
      finalizeCompetitionWithStoredResults(comp1.id, woman.id, 4, 1);
      finalizeCompetitionWithStoredResults(comp2.id, woman.id, 2, 1);

      const standings = tourService.getFullStandings(tour.id, menCategory.id);
      expect(standings.player_standings).toHaveLength(1);

      const manStanding = standings.player_standings[0];
      expect(manStanding.player_name).toBe("Man");
      expect(manStanding.actual_points).toBe(5);
      expect(manStanding.competitions_played).toBe(2);
      expect(
        manStanding.competitions.filter((c) => c.counts_toward_projected)
      ).toHaveLength(1);
    });
  });
});
