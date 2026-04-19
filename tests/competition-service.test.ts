import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDatabase } from "../src/database/db";
import { CompetitionService } from "../src/services/competition-service";
import { createCompetitionResultsService, CompetitionResultsService } from "../src/services/competition-results.service";

describe("CompetitionService scoring format updates", () => {
  let db: Database;
  let competitionService: CompetitionService;
  let competitionResultsService: CompetitionResultsService;

  const standardPars = [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

  const createTestCourse = (name: string, pars: number[]) => {
    return db
      .prepare(`INSERT INTO courses (name, pars) VALUES (?, ?) RETURNING *`)
      .get(name, JSON.stringify(pars)) as { id: number; name: string };
  };

  const createTestCompetition = (name: string, date: string, courseId: number) => {
    return db
      .prepare(`
        INSERT INTO competitions (name, date, course_id, start_mode, points_multiplier)
        VALUES (?, ?, ?, 'scheduled', 1)
        RETURNING *
      `)
      .get(name, date, courseId) as { id: number; name: string };
  };

  const createTestPlayer = (name: string) => {
    return db
      .prepare(`INSERT INTO players (name) VALUES (?) RETURNING *`)
      .get(name) as { id: number; name: string };
  };

  const createTestTeam = (name: string) => {
    return db
      .prepare(`INSERT INTO teams (name) VALUES (?) RETURNING *`)
      .get(name) as { id: number; name: string };
  };

  const createTestTeeTime = (competitionId: number, teetime: string) => {
    return db
      .prepare(`
        INSERT INTO tee_times (competition_id, teetime, start_hole)
        VALUES (?, ?, 1)
        RETURNING *
      `)
      .get(competitionId, teetime) as { id: number };
  };

  const createTestParticipant = (
    teeTimeId: number,
    teamId: number,
    playerId: number,
    score: number[]
  ) => {
    return db
      .prepare(`
        INSERT INTO participants (tee_time_id, team_id, player_id, tee_order, position_name, score, is_locked, is_dq)
        VALUES (?, ?, ?, 1, 'Player', ?, 1, 0)
        RETURNING *
      `)
      .get(teeTimeId, teamId, playerId, JSON.stringify(score)) as { id: number };
  };

  const createEvenParScore = () => [...standardPars];

  beforeEach(async () => {
    db = await createTestDatabase();
    competitionService = new CompetitionService(db);
    competitionResultsService = createCompetitionResultsService(db);
  });

  afterEach(() => {
    db.close();
  });

  test("should recalculate finalized results when scoring_format changes on an existing competition", async () => {
    const course = createTestCourse("Existing Competition Course", standardPars);
    const competition = createTestCompetition("Existing Competition", "2024-01-15", course.id);
    const teeTime = createTestTeeTime(competition.id, "08:00");
    const team = createTestTeam("Existing Team");
    const steadyPlayer = createTestPlayer("Steady");
    const pickupPlayer = createTestPlayer("Pickup");

    createTestParticipant(teeTime.id, team.id, steadyPlayer.id, createEvenParScore());
    const pickupScore = createEvenParScore();
    pickupScore[0] = -1;
    createTestParticipant(teeTime.id, team.id, pickupPlayer.id, pickupScore);

    competitionResultsService.finalizeCompetitionResults(competition.id);

    let results = competitionResultsService.getCompetitionResults(competition.id);
    expect(results).toHaveLength(1);

    const updatedCompetition = await competitionService.update(competition.id, {
      scoring_format: "stableford",
    });

    results = competitionResultsService.getCompetitionResults(competition.id);
    expect(updatedCompetition.scoring_format).toBe("stableford");
    expect(results).toHaveLength(2);
    expect(results[0].stableford_points).toBe(36);
    expect(results[1].stableford_points).toBe(34);
  });
});
